import Router from 'koa-router';
import { sequelize } from '../models/index.js';

export const healthRoutes = new Router({ prefix: '/api' });

healthRoutes.get('/health', async (ctx) => {
  await sequelize.authenticate();
  ctx.body = {
    ok: true,
    database: 'ok',
  };
});
