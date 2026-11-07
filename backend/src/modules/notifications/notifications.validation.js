'use strict';

const { z } = require('zod');
const {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  DELIVERY_STATUSES,
} = require('./notificationTemplates');

const CATEGORY_VALUES = Object.values(NOTIFICATION_CATEGORIES);
const CHANNEL_VALUES = Object.values(NOTIFICATION_CHANNELS);
const STATUS_VALUES = Object.values(DELIVERY_STATUSES);

const notificationIdParam = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

const listNotificationsQuery = z.object({
  query: z.object({
    category: z
      .enum(['ALL', ...CATEGORY_VALUES])
      .optional()
      .default('ALL'),
    isRead: z.enum(['true', 'false']).optional(),
    q: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const markAllReadBody = z.object({
  body: z
    .object({
      category: z.enum(['ALL', ...CATEGORY_VALUES]).optional(),
    })
    .optional()
    .default({}),
});

const updatePreferencesBody = z.object({
  body: z.object({
    preferences: z
      .array(
        z.object({
          channel: z.enum(CHANNEL_VALUES),
          category: z.enum(CATEGORY_VALUES),
          enabled: z.boolean(),
        })
      )
      .min(1, 'Provide at least one preference item')
      .max(50),
  }),
});

const historyQuery = z.object({
  query: z.object({
    channel: z.enum(['ALL', ...CHANNEL_VALUES]).optional().default('ALL'),
    category: z
      .enum(['ALL', ...CATEGORY_VALUES])
      .optional()
      .default('ALL'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const adminDeliveriesQuery = z.object({
  query: z.object({
    status: z
      .enum(['ALL', ...STATUS_VALUES])
      .optional()
      .default('ALL'),
    category: z
      .enum(['ALL', ...CATEGORY_VALUES])
      .optional()
      .default('ALL'),
    eventType: z.string().trim().max(100).optional(),
    q: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

module.exports = {
  notificationIdParam,
  listNotificationsQuery,
  markAllReadBody,
  updatePreferencesBody,
  historyQuery,
  adminDeliveriesQuery,
};
