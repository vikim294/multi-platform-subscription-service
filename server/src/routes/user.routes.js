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
import {
  askComments,
  askSearch,
  getPostComments,
  getSearchHistories,
  getTargetPosts,
  limitAi,
  limitComments,
  limitSearch,
  removeAllSearchHistories,
  removeSearchHistory,
  searchContent,
} from '../controllers/user/insight.controller.js';
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
userRoutes.get('/targets/:id/posts', getTargetPosts);
userRoutes.get('/targets/:id/posts/:postId/comments', limitComments, getPostComments);

userRoutes.get('/search', limitSearch, searchContent);
userRoutes.post('/search/ask', limitAi, askSearch);
userRoutes.get('/search-histories', getSearchHistories);
userRoutes.delete('/search-histories', removeAllSearchHistories);
userRoutes.delete('/search-histories/:id', removeSearchHistory);
userRoutes.post('/comments/ask', limitAi, askComments);

userRoutes.get('/notifications/unread', listUnreadNotifications);
userRoutes.patch('/notifications/:id/read', markNotificationRead);
userRoutes.patch('/notifications/read-all', markAllNotificationsRead);
userRoutes.get('/notifications/stream', streamNotifications);
