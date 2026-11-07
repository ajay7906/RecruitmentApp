'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./notifications.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

exports.listNotifications = asyncHandler(async (req, res) => {
  const result = await service.listUserNotifications(req.user, req.query);
  ok(res, result);
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const result = await service.getUnreadCount(req.user);
  ok(res, result);
});

exports.getNotificationDetails = asyncHandler(async (req, res) => {
  const notification = await service.getNotificationDetails(req.user, req.params.id);
  ok(res, { notification });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await service.markNotificationRead(req.user, req.params.id, true);
  ok(res, { notification, message: 'Notification marked as read' });
});

exports.markAsUnread = asyncHandler(async (req, res) => {
  const notification = await service.markNotificationRead(req.user, req.params.id, false);
  ok(res, { notification, message: 'Notification marked as unread' });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await service.markAllNotificationsRead(req.user, req.body?.category);
  ok(res, { ...result, message: 'Notifications marked as read' });
});

exports.dismissNotification = asyncHandler(async (req, res) => {
  const notification = await service.dismissNotification(req.user, req.params.id);
  ok(res, { notification, message: 'Notification dismissed' });
});

exports.getPreferences = asyncHandler(async (req, res) => {
  const result = await service.getUserPreferences(req.user);
  ok(res, result);
});

exports.updatePreferences = asyncHandler(async (req, res) => {
  const result = await service.updateUserPreferences(req.user, req.body.preferences);
  ok(res, { ...result, message: 'Notification preferences saved' });
});

exports.getHistory = asyncHandler(async (req, res) => {
  const result = await service.getUserNotificationHistory(req.user, req.query);
  ok(res, result);
});

// ── Admin Notification Monitoring ────────────────────────────────────────────

exports.listAdminDeliveries = asyncHandler(async (req, res) => {
  const result = await service.listAdminEmailDeliveries(req.query);
  ok(res, result);
});

exports.listFailedAdminDeliveries = asyncHandler(async (req, res) => {
  const result = await service.listAdminEmailDeliveries({
    ...req.query,
    status: 'FAILED',
  });
  ok(res, result);
});

exports.getAdminDeliveryDetails = asyncHandler(async (req, res) => {
  const delivery = await service.getAdminEmailDeliveryDetails(req.params.id);
  ok(res, { delivery });
});

exports.retryAdminDelivery = asyncHandler(async (req, res) => {
  const delivery = await service.retryAdminEmailDelivery(req.user, req.params.id, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  ok(res, { delivery, message: 'Email delivery retry executed' });
});
