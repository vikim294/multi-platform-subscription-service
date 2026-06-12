import Router from 'koa-router';
import {
  listTargetActivities,
  listUserTargets,
  subscribeTarget,
  unsubscribeTarget,
} from '../controllers/user/target.controller.js';
import { userAuth } from '../middleware/user-auth.js';

export const userRoutes = new Router({
  prefix: '/api',
});

userRoutes.use(userAuth);

userRoutes.get('/targets', listUserTargets);
userRoutes.post('/subscriptions/:id', subscribeTarget);
userRoutes.delete('/subscriptions/:id', unsubscribeTarget);
userRoutes.get('/targets/:id/activities', listTargetActivities);
