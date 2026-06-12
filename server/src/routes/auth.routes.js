import Router from 'koa-router';
import { authSchema, login, me, register } from '../controllers/auth.controller.js';
import { userAuth } from '../middleware/user-auth.js';
import { validate } from '../middleware/validate.js';

export const authRoutes = new Router({
  prefix: '/api/auth',
});

authRoutes.post('/register', validate(authSchema), register);
authRoutes.post('/login', validate(authSchema), login);
authRoutes.get('/me', userAuth, me);
