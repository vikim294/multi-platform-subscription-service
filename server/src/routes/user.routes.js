import Router from 'koa-router';
import {
  listTargetActivities,
  listUserTargets,
  subscribeTarget,
  unsubscribeTarget,
} from '../controllers/user/target.controller.js';
import { getTargetStats } from '../controllers/user/stats.controller.js';
import {
  listUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  streamNotifications,
} from '../controllers/user/notification.controller.js';
import { userAuth } from '../middleware/user-auth.js';

export const userRoutes = new Router({
  prefix: '/api',
});

userRoutes.use(userAuth);

userRoutes.get('/targets', listUserTargets);
userRoutes.post('/subscriptions/:id', subscribeTarget);
userRoutes.delete('/subscriptions/:id', unsubscribeTarget);
userRoutes.get('/targets/:id/activities', listTargetActivities);
userRoutes.get('/targets/:id/stats', getTargetStats);

userRoutes.get('/notifications/unread', listUnreadNotifications);
userRoutes.patch('/notifications/:id/read', markNotificationRead);
userRoutes.patch('/notifications/read-all', markAllNotificationsRead);
userRoutes.get('/notifications/stream', streamNotifications);
