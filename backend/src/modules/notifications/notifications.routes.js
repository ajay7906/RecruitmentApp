'use strict';

const router = require('express').Router();
const c = require('./notifications.controller');
const v = require('./notifications.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');

router.use(authenticate);

// Preferences & History (static paths before :id)
router.get('/preferences', c.getPreferences);
router.patch('/preferences', validate(v.updatePreferencesBody), c.updatePreferences);
router.get('/history', validate(v.historyQuery), c.getHistory);
router.get('/unread-count', c.getUnreadCount);
router.patch('/read-all', validate(v.markAllReadBody), c.markAllAsRead);

// In-App Notifications CRUD
router.get('/', validate(v.listNotificationsQuery), c.listNotifications);
router.get('/:id', validate(v.notificationIdParam), c.getNotificationDetails);
router.patch('/:id/read', validate(v.notificationIdParam), c.markAsRead);
router.patch('/:id/unread', validate(v.notificationIdParam), c.markAsUnread);
router.delete('/:id', validate(v.notificationIdParam), c.dismissNotification);

module.exports = router;
