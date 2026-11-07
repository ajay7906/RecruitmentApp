'use strict';

const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/email.service');
const { recordAudit } = require('../../services/audit.service');
const { resolveUserPermissions } = require('../admin/admin.permissions');
const {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  ESSENTIAL_CATEGORIES,
  ESSENTIAL_EVENT_TYPES,
  PREFERENCE_CATEGORY_METADATA,
  BUILTIN_TEMPLATES,
  interpolateText,
  interpolateHtml,
  htmlToPlainText,
  sanitizeActionUrl,
  wrapEmailLayout,
} = require('./notificationTemplates');

const SENSITIVE_VARIABLE_KEYS = /password|token|secret|verificationurl|reseturl|otp|code/i;

function scrubVariablesForStorage(variables = {}) {
  if (!variables || typeof variables !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(variables)) {
    if (SENSITIVE_VARIABLE_KEYS.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ============================================================================
// 1. Notification Preferences
// ============================================================================

async function isChannelEnabledForUser(userId, channel, category, eventType) {
  if (ESSENTIAL_CATEGORIES.has(category) || ESSENTIAL_EVENT_TYPES.has(eventType)) {
    return true;
  }
  if (!userId) return true;

  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_channel_category: {
        userId,
        channel,
        category,
      },
    },
    select: { enabled: true },
  });

  return pref ? Boolean(pref.enabled) : true;
}

async function getUserPreferences(currentUser) {
  const role = currentUser.role || 'candidate';
  const rows = await prisma.notificationPreference.findMany({
    where: { userId: currentUser.id },
  });

  const map = new Map();
  for (const row of rows) {
    map.set(`${row.channel}:${row.category}`, row.enabled);
  }

  const relevantCategories = PREFERENCE_CATEGORY_METADATA.filter((item) =>
    item.roles.includes(role)
  );

  const preferences = relevantCategories.map((item) => {
    const emailEnabled = item.isEssential
      ? true
      : map.has(`EMAIL:${item.category}`)
        ? map.get(`EMAIL:${item.category}`)
        : true;
    const inAppEnabled = item.isEssential
      ? true
      : map.has(`IN_APP:${item.category}`)
        ? map.get(`IN_APP:${item.category}`)
        : true;

    return {
      category: item.category,
      label: item.label,
      description: item.description,
      isEssential: item.isEssential,
      channels: {
        EMAIL: emailEnabled,
        IN_APP: inAppEnabled,
      },
    };
  });

  return {
    userId: currentUser.id,
    role,
    preferences,
  };
}

async function updateUserPreferences(currentUser, updates = []) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, 'At least one preference update is required', 'EMPTY_PREFERENCES');
  }

  for (const item of updates) {
    if (ESSENTIAL_CATEGORIES.has(item.category) && item.enabled === false) {
      throw new ApiError(
        400,
        'Essential security notifications cannot be disabled',
        'CANNOT_DISABLE_SECURITY_NOTIFICATIONS'
      );
    }
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_channel_category: {
            userId: currentUser.id,
            channel: item.channel,
            category: item.category,
          },
        },
        update: {
          enabled: ESSENTIAL_CATEGORIES.has(item.category) ? true : Boolean(item.enabled),
        },
        create: {
          userId: currentUser.id,
          channel: item.channel,
          category: item.category,
          enabled: ESSENTIAL_CATEGORIES.has(item.category) ? true : Boolean(item.enabled),
        },
      })
    )
  );

  return getUserPreferences(currentUser);
}

// ============================================================================
// 2. Template Resolution & Rendering
// ============================================================================

async function resolveTemplate(templateKey, channel) {
  const builtin = BUILTIN_TEMPLATES[templateKey] || null;
  if (!templateKey) return null;

  const dbTemplate = await prisma.notificationTemplate
    .findUnique({
      where: {
        templateKey_channel: {
          templateKey,
          channel,
        },
      },
    })
    .catch(() => null);

  if (dbTemplate && dbTemplate.isActive) {
    return {
      id: dbTemplate.id,
      templateKey,
      category: dbTemplate.category || builtin?.category || 'SYSTEM',
      subject: dbTemplate.subject || builtin?.subject || 'Notification from Recruitro',
      title: dbTemplate.titleTemplate || builtin?.title || 'Notification',
      content: dbTemplate.content,
      textFallback: dbTemplate.textFallback || null,
      actionLabel: builtin?.actionLabel || 'View Details',
    };
  }

  if (!builtin) return null;

  return {
    id: null,
    templateKey,
    category: builtin.category || 'SYSTEM',
    subject: builtin.subject || builtin.title || 'Recruitro Notification',
    title: builtin.title || 'Notification',
    content: channel === NOTIFICATION_CHANNELS.EMAIL ? builtin.emailBody : builtin.inAppMessage,
    textFallback: null,
    actionLabel: builtin.actionLabel || 'View in Recruitro',
  };
}

// ============================================================================
// 3. Email Delivery Tracking & Retry Queue
// ============================================================================

async function processEmailDelivery(deliveryId) {
  const record = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
  });
  if (!record || record.status === 'SENT') {
    return record;
  }

  const nextAttempt = record.attemptCount + 1;
  await prisma.emailDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'PROCESSING',
      attemptCount: nextAttempt,
      lastAttemptAt: new Date(),
    },
  });

  try {
    const providerResult = await emailService.dispatchRawEmail({
      to: record.recipientEmail,
      subject: record.subject,
      html: record.bodyHtml,
      text: record.bodyText || htmlToPlainText(record.bodyHtml),
    });

    return await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'SENT',
        provider: providerResult.provider || 'SMTP',
        providerMessageId: providerResult.messageId || null,
        providerResponse: providerResult.response || null,
        sentAt: new Date(),
        failureReason: null,
        nextRetryAt: null,
      },
    });
  } catch (err) {
    const canRetry = nextAttempt < record.maxAttempts && err?.code !== 'INVALID_RECIPIENT_EMAIL';
    const backoffMs = Math.min(300_000, Math.pow(2, nextAttempt) * 15_000);

    return await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        failureReason: String(err?.message || 'Email provider delivery error').slice(0, 1000),
        nextRetryAt: canRetry ? new Date(Date.now() + backoffMs) : null,
      },
    });
  }
}

async function sendDirectTemplateEmail({
  recipientId = null,
  recipientEmail,
  templateKey,
  eventType,
  category,
  subject: customSubject,
  bodyHtml: customBodyHtml,
  variables = {},
  relatedEntityType = null,
  relatedEntityId = null,
  actionUrl = null,
  idempotencyKey = null,
  awaitDelivery = false,
}) {
  if (!recipientEmail || typeof recipientEmail !== 'string') {
    return null;
  }

  const resolvedTemplate = templateKey
    ? await resolveTemplate(templateKey, NOTIFICATION_CHANNELS.EMAIL)
    : null;
  const resolvedCategory =
    category || resolvedTemplate?.category || NOTIFICATION_CATEGORIES.SYSTEM;
  const resolvedEventType = eventType || templateKey || 'CUSTOM_EMAIL';

  if (recipientId) {
    const enabled = await isChannelEnabledForUser(
      recipientId,
      NOTIFICATION_CHANNELS.EMAIL,
      resolvedCategory,
      resolvedEventType
    );
    if (!enabled) {
      return { skipped: true, reason: 'USER_PREFERENCE_DISABLED' };
    }
  }

  if (idempotencyKey) {
    const existing = await prisma.emailDelivery.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing;
    }
  }

  const renderedSubject = interpolateText(
    customSubject || resolvedTemplate?.subject || 'Recruitro Notification',
    variables
  );
  const renderedHeading = interpolateText(
    resolvedTemplate?.title || renderedSubject,
    variables
  );
  const innerHtml = interpolateHtml(
    customBodyHtml || resolvedTemplate?.content || '<p>{{message}}</p>',
    variables
  );
  const safeActionUrl = sanitizeActionUrl(actionUrl);
  const wrappedHtml = wrapEmailLayout({
    subject: renderedSubject,
    heading: renderedHeading,
    bodyHtml: innerHtml,
    actionUrl: safeActionUrl,
    actionLabel: resolvedTemplate?.actionLabel || 'Open Recruitro',
  });
  const plainText = resolvedTemplate?.textFallback
    ? interpolateText(resolvedTemplate.textFallback, variables)
    : htmlToPlainText(innerHtml);

  let deliveryRecord;
  try {
    deliveryRecord = await prisma.emailDelivery.create({
      data: {
        recipientId: recipientId || null,
        recipientEmail: recipientEmail.trim().toLowerCase(),
        templateId: resolvedTemplate?.id || null,
        templateKey: templateKey || null,
        category: resolvedCategory,
        eventType: resolvedEventType,
        subject: renderedSubject,
        bodyHtml: wrappedHtml,
        bodyText: plainText,
        variables: scrubVariablesForStorage(variables),
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
        idempotencyKey: idempotencyKey || null,
        status: 'PENDING',
        maxAttempts: 3,
      },
    });
  } catch (err) {
    if (idempotencyKey && err?.code === 'P2002') {
      return prisma.emailDelivery.findUnique({ where: { idempotencyKey } });
    }
    throw err;
  }

  if (awaitDelivery) {
    return processEmailDelivery(deliveryRecord.id);
  }

  Promise.resolve()
    .then(() => processEmailDelivery(deliveryRecord.id))
    .catch(() => {});

  return deliveryRecord;
}

// ============================================================================
// 4. In-App Notification Creation & Management
// ============================================================================

async function createInAppNotification({
  recipientId,
  recipientRole = null,
  templateKey = null,
  title: customTitle = null,
  message: customMessage = null,
  category = null,
  eventType = null,
  variables = {},
  relatedEntityType = null,
  relatedEntityId = null,
  actionUrl = null,
  metadata = null,
  idempotencyKey = null,
  expiresAt = null,
}) {
  if (!recipientId) return null;

  const resolvedTemplate = templateKey
    ? await resolveTemplate(templateKey, NOTIFICATION_CHANNELS.IN_APP)
    : null;
  const resolvedCategory =
    category || resolvedTemplate?.category || NOTIFICATION_CATEGORIES.SYSTEM;
  const resolvedEventType = eventType || templateKey || 'SYSTEM_NOTIFICATION';

  const enabled = await isChannelEnabledForUser(
    recipientId,
    NOTIFICATION_CHANNELS.IN_APP,
    resolvedCategory,
    resolvedEventType
  );
  if (!enabled) {
    return null;
  }

  if (idempotencyKey) {
    const existing = await prisma.notification.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;
  }

  const finalTitle = interpolateText(
    customTitle || resolvedTemplate?.title || 'Notification',
    variables
  );
  const finalMessage = interpolateText(
    customMessage || resolvedTemplate?.content || '',
    variables
  );

  try {
    return await prisma.notification.create({
      data: {
        recipientId,
        recipientRole: recipientRole || null,
        title: finalTitle,
        message: finalMessage,
        category: resolvedCategory,
        eventType: resolvedEventType,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
        actionUrl: sanitizeActionUrl(actionUrl),
        metadata: metadata ? scrubVariablesForStorage(metadata) : null,
        idempotencyKey: idempotencyKey || null,
        expiresAt: expiresAt || null,
      },
    });
  } catch (err) {
    if (idempotencyKey && err?.code === 'P2002') {
      return prisma.notification.findUnique({ where: { idempotencyKey } });
    }
    throw err;
  }
}

/**
 * Unified multi-channel notification trigger (IN_APP + EMAIL).
 */
async function notifyUser({
  recipientId,
  recipientEmail = null,
  recipientRole = null,
  templateKey,
  eventType = null,
  category = null,
  title = null,
  message = null,
  variables = {},
  relatedEntityType = null,
  relatedEntityId = null,
  actionUrl = null,
  metadata = null,
  idempotencyKey = null,
  channels = ['IN_APP', 'EMAIL'],
  awaitEmail = false,
}) {
  let user = null;
  if (recipientId && (!recipientEmail || !recipientRole)) {
    user = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
  } else if (!recipientId && recipientEmail) {
    user = await prisma.user.findUnique({
      where: { email: recipientEmail.trim().toLowerCase() },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
  }

  const resolvedUserId = recipientId || user?.id || null;
  const resolvedEmail = recipientEmail || user?.email || null;
  const resolvedRole = recipientRole || user?.role || null;
  const mergedVars = {
    userName: user?.fullName || variables.userName || variables.candidateName || variables.recruiterName || 'User',
    ...variables,
  };

  const results = { inApp: null, email: null };

  if (channels.includes('IN_APP') && resolvedUserId) {
    results.inApp = await createInAppNotification({
      recipientId: resolvedUserId,
      recipientRole: resolvedRole,
      templateKey,
      title,
      message,
      category,
      eventType: eventType || templateKey,
      variables: mergedVars,
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      metadata,
      idempotencyKey: idempotencyKey ? `inapp:${idempotencyKey}` : null,
    }).catch(() => null);
  }

  if (channels.includes('EMAIL') && resolvedEmail) {
    results.email = await sendDirectTemplateEmail({
      recipientId: resolvedUserId,
      recipientEmail: resolvedEmail,
      templateKey,
      eventType: eventType || templateKey,
      category,
      variables: mergedVars,
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      idempotencyKey: idempotencyKey ? `email:${idempotencyKey}` : null,
      awaitDelivery: awaitEmail,
    }).catch(() => null);
  }

  return results;
}

/**
 * Notifies only active administrators who hold the required permission.
 */
async function notifyAdminsByPermission({
  permission,
  templateKey,
  eventType,
  category = 'ADMIN',
  variables = {},
  relatedEntityType = null,
  relatedEntityId = null,
  actionUrl = '/admin/dashboard',
  idempotencyKeyPrefix = null,
  channels = ['IN_APP', 'EMAIL'],
}) {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', status: 'active' },
    select: { id: true, email: true, fullName: true, role: true, adminRole: true },
  });

  const results = [];
  for (const admin of admins) {
    const perms = await resolveUserPermissions(admin.id, admin.adminRole || 'ADMIN');
    if (permission && !perms.includes(permission)) {
      continue;
    }
    const res = await notifyUser({
      recipientId: admin.id,
      recipientEmail: admin.email,
      recipientRole: 'admin',
      templateKey,
      eventType: eventType || templateKey,
      category,
      variables: {
        userName: admin.fullName,
        ...variables,
      },
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      idempotencyKey: idempotencyKeyPrefix ? `${idempotencyKeyPrefix}:${admin.id}` : null,
      channels,
    });
    results.push(res);
  }
  return results;
}

// ============================================================================
// 5. User Notification Queries & Mutations
// ============================================================================

async function listUserNotifications(currentUser, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {
    recipientId: currentUser.id,
    isDismissed: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  if (query.category && query.category !== 'ALL') {
    where.category = query.category;
  }
  if (query.isRead === 'true' || query.isRead === true) {
    where.isRead = true;
  } else if (query.isRead === 'false' || query.isRead === false) {
    where.isRead = false;
  }
  if (query.q && String(query.q).trim()) {
    const q = String(query.q).trim();
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { message: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        recipientId: currentUser.id,
        isDismissed: false,
        isRead: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getUnreadCount(currentUser) {
  const baseWhere = {
    recipientId: currentUser.id,
    isDismissed: false,
    isRead: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  const [unreadCount, grouped] = await Promise.all([
    prisma.notification.count({ where: baseWhere }),
    prisma.notification.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);

  const byCategory = {};
  for (const row of grouped) {
    byCategory[row.category] = row._count._all;
  }

  return { unreadCount, byCategory };
}

async function getNotificationDetails(currentUser, notificationId) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.recipientId !== currentUser.id) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }
  return notification;
}

async function markNotificationRead(currentUser, notificationId, isRead = true) {
  const notification = await getNotificationDetails(currentUser, notificationId);
  return prisma.notification.update({
    where: { id: notification.id },
    data: {
      isRead: Boolean(isRead),
      readAt: isRead ? new Date() : null,
    },
  });
}

async function markAllNotificationsRead(currentUser, category = null) {
  const where = {
    recipientId: currentUser.id,
    isDismissed: false,
    isRead: false,
  };
  if (category && category !== 'ALL') {
    where.category = category;
  }

  const result = await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: result.count };
}

async function dismissNotification(currentUser, notificationId) {
  const notification = await getNotificationDetails(currentUser, notificationId);
  return prisma.notification.update({
    where: { id: notification.id },
    data: {
      isDismissed: true,
      dismissedAt: new Date(),
    },
  });
}

async function getUserNotificationHistory(currentUser, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const channel = query.channel || 'ALL';

  const inAppWhere = { recipientId: currentUser.id };
  const emailWhere = { recipientId: currentUser.id };

  if (query.category && query.category !== 'ALL') {
    inAppWhere.category = query.category;
    emailWhere.category = query.category;
  }

  if (channel === 'IN_APP') {
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: inAppWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: inAppWhere }),
    ]);
    return {
      items: items.map((n) => ({
        id: n.id,
        channel: 'IN_APP',
        title: n.title,
        message: n.message,
        category: n.category,
        eventType: n.eventType,
        relatedEntityType: n.relatedEntityType,
        relatedEntityId: n.relatedEntityId,
        actionUrl: n.actionUrl,
        status: n.isRead ? 'READ' : 'UNREAD',
        isRead: n.isRead,
        readAt: n.readAt,
        isDismissed: n.isDismissed,
        createdAt: n.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  if (channel === 'EMAIL') {
    const [items, total] = await Promise.all([
      prisma.emailDelivery.findMany({
        where: emailWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          category: true,
          eventType: true,
          relatedEntityType: true,
          relatedEntityId: true,
          status: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      prisma.emailDelivery.count({ where: emailWhere }),
    ]);
    return {
      items: items.map((e) => ({
        id: e.id,
        channel: 'EMAIL',
        title: e.subject,
        message: `Email delivery (${e.status})`,
        category: e.category,
        eventType: e.eventType,
        relatedEntityType: e.relatedEntityType,
        relatedEntityId: e.relatedEntityId,
        actionUrl: null,
        status: e.status,
        isRead: e.status === 'SENT',
        readAt: e.sentAt,
        isDismissed: false,
        createdAt: e.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // Combined history across IN_APP + EMAIL
  const [inAppItems, emailItems, inAppTotal, emailTotal] = await Promise.all([
    prisma.notification.findMany({
      where: inAppWhere,
      orderBy: { createdAt: 'desc' },
      take: skip + limit,
    }),
    prisma.emailDelivery.findMany({
      where: emailWhere,
      orderBy: { createdAt: 'desc' },
      take: skip + limit,
      select: {
        id: true,
        subject: true,
        category: true,
        eventType: true,
        relatedEntityType: true,
        relatedEntityId: true,
        status: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: inAppWhere }),
    prisma.emailDelivery.count({ where: emailWhere }),
  ]);

  const combined = [
    ...inAppItems.map((n) => ({
      id: n.id,
      channel: 'IN_APP',
      title: n.title,
      message: n.message,
      category: n.category,
      eventType: n.eventType,
      relatedEntityType: n.relatedEntityType,
      relatedEntityId: n.relatedEntityId,
      actionUrl: n.actionUrl,
      status: n.isRead ? 'READ' : 'UNREAD',
      isRead: n.isRead,
      readAt: n.readAt,
      isDismissed: n.isDismissed,
      createdAt: n.createdAt,
    })),
    ...emailItems.map((e) => ({
      id: e.id,
      channel: 'EMAIL',
      title: e.subject,
      message: `Email delivery (${e.status})`,
      category: e.category,
      eventType: e.eventType,
      relatedEntityType: e.relatedEntityType,
      relatedEntityId: e.relatedEntityId,
      actionUrl: null,
      status: e.status,
      isRead: e.status === 'SENT',
      readAt: e.sentAt,
      isDismissed: false,
      createdAt: e.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(skip, skip + limit);

  const total = inAppTotal + emailTotal;
  return {
    items: combined,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// ============================================================================
// 6. Administrative Notification Monitoring & Retry
// ============================================================================

async function listAdminEmailDeliveries(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }
  if (query.category && query.category !== 'ALL') {
    where.category = query.category;
  }
  if (query.eventType) {
    where.eventType = query.eventType;
  }
  if (query.q && String(query.q).trim()) {
    const q = String(query.q).trim();
    where.OR = [
      { recipientEmail: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { eventType: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [deliveries, total, groupedCounts] = await Promise.all([
    prisma.emailDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        recipientId: true,
        recipientEmail: true,
        templateKey: true,
        category: true,
        eventType: true,
        subject: true,
        relatedEntityType: true,
        relatedEntityId: true,
        status: true,
        provider: true,
        providerMessageId: true,
        attemptCount: true,
        maxAttempts: true,
        lastAttemptAt: true,
        nextRetryAt: true,
        sentAt: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
        recipient: {
          select: { id: true, fullName: true, role: true },
        },
      },
    }),
    prisma.emailDelivery.count({ where }),
    prisma.emailDelivery.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const summary = {
    total: 0,
    PENDING: 0,
    PROCESSING: 0,
    SENT: 0,
    FAILED: 0,
  };
  for (const row of groupedCounts) {
    summary[row.status] = row._count._all;
    summary.total += row._count._all;
  }

  return {
    deliveries,
    summary,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getAdminEmailDeliveryDetails(deliveryId) {
  const delivery = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      recipientId: true,
      recipientEmail: true,
      templateKey: true,
      category: true,
      eventType: true,
      subject: true,
      variables: true,
      relatedEntityType: true,
      relatedEntityId: true,
      status: true,
      provider: true,
      providerMessageId: true,
      providerResponse: true,
      attemptCount: true,
      maxAttempts: true,
      lastAttemptAt: true,
      nextRetryAt: true,
      sentAt: true,
      failureReason: true,
      createdAt: true,
      updatedAt: true,
      recipient: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  if (!delivery) {
    throw new ApiError(404, 'Email delivery record not found', 'DELIVERY_NOT_FOUND');
  }
  return delivery;
}

async function retryAdminEmailDelivery(adminUser, deliveryId, reqMeta = {}) {
  const existing = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
  });
  if (!existing) {
    throw new ApiError(404, 'Email delivery record not found', 'DELIVERY_NOT_FOUND');
  }
  if (existing.status === 'SENT') {
    throw new ApiError(400, 'Email has already been delivered', 'ALREADY_SENT');
  }
  if (existing.attemptCount >= 6) {
    throw new ApiError(
      400,
      'Maximum manual retry attempts (6) reached for this notification',
      'MAX_RETRIES_EXCEEDED'
    );
  }

  // Bump maxAttempts by 1 if needed so processEmailDelivery can run
  if (existing.attemptCount >= existing.maxAttempts) {
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: { maxAttempts: existing.attemptCount + 1 },
    });
  }

  const updated = await processEmailDelivery(deliveryId);

  await recordAudit({
    actor: adminUser,
    action: 'EMAIL_DELIVERY_RETRIED',
    entityType: 'EMAIL_DELIVERY',
    entityId: deliveryId,
    previousValue: { status: existing.status, attemptCount: existing.attemptCount },
    newValue: { status: updated.status, attemptCount: updated.attemptCount },
    reason: 'Manual retry triggered by administrator',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return getAdminEmailDeliveryDetails(deliveryId);
}

module.exports = {
  isChannelEnabledForUser,
  getUserPreferences,
  updateUserPreferences,
  resolveTemplate,
  processEmailDelivery,
  sendDirectTemplateEmail,
  createInAppNotification,
  notifyUser,
  notifyAdminsByPermission,
  listUserNotifications,
  getUnreadCount,
  getNotificationDetails,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  getUserNotificationHistory,
  listAdminEmailDeliveries,
  getAdminEmailDeliveryDetails,
  retryAdminEmailDelivery,
};
