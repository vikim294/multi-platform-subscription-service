import Router from 'koa-router';
import { adminAuth } from '../middleware/admin-auth.js';
import { validate } from '../middleware/validate.js';
import {
  listPlatformTokens,
  platformTokenSchema,
  upsertPlatformToken,
} from '../controllers/admin/platform-token.controller.js';
import {
  createTarget,
  createTargetSchema,
  deleteTarget,
  listActivities,
  listTargets,
} from '../controllers/admin/target.controller.js';
import {
  fetchAllTargets,
  fetchOneTarget,
  listFetchLogs,
} from '../controllers/admin/fetch.controller.js';
import { broadcastTestNewActivity } from '../controllers/admin/broadcast.controller.js';
import { getTodaySchedule } from '../controllers/admin/scheduler.controller.js';

export const adminRoutes = new Router({
  prefix: '/api/admin',
});

adminRoutes.use(adminAuth);

adminRoutes.get('/platform-tokens', listPlatformTokens);
adminRoutes.put('/platform-tokens/:platform', validate(platformTokenSchema), upsertPlatformToken);

adminRoutes.get('/targets', listTargets);
adminRoutes.post('/targets', validate(createTargetSchema), createTarget);
adminRoutes.delete('/targets/:id', deleteTarget);

adminRoutes.post('/fetch/targets/:id', fetchOneTarget);
adminRoutes.post('/fetch/all', fetchAllTargets);
adminRoutes.get('/fetch-logs', listFetchLogs);

adminRoutes.get('/scheduler/today', getTodaySchedule);

adminRoutes.post('/broadcast/test-new-activity', broadcastTestNewActivity);

adminRoutes.get('/activities', listActivities);
