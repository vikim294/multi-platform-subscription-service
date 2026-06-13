import Router from 'koa-router';
import Joi from 'joi';
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
  askExtension,
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
  syncExtensionMarkdown,
} from '../controllers/user/insight.controller.js';
import { userAuth } from '../middleware/user-auth.js';
import { validate } from '../middleware/validate.js';

export const userRoutes = new Router({
  prefix: '/api',
});

const extensionMarkdownSyncSchema = Joi.object({
  markdown: Joi.string().trim().min(1).max(512000).required(),
  title: Joi.string().trim().max(120).allow('', null),
  source: Joi.string().trim().max(64).allow('', null),
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
userRoutes.post('/extension/analysis', limitAi, askExtension);
userRoutes.post('/extension/knowledge-base/sync-markdown', limitAi, validate(extensionMarkdownSyncSchema), syncExtensionMarkdown);

userRoutes.get('/notifications/unread', listUnreadNotifications);
userRoutes.patch('/notifications/:id/read', markNotificationRead);
userRoutes.patch('/notifications/read-all', markAllNotificationsRead);
userRoutes.get('/notifications/stream', streamNotifications);
