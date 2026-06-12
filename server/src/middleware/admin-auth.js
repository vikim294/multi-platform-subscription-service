import { env } from '../config/env.js';

export const adminAuth = async (ctx, next) => {
  const authorization = ctx.get('authorization');
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];

  if (!token || token !== env.adminToken) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  await next();
};
