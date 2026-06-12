import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

export const userAuth = async (ctx, next) => {
  const authorization = ctx.get('authorization');
  const [, headerToken] = authorization.match(/^Bearer\s+(.+)$/i) || [];
  const token = headerToken || ctx.query.token;

  if (!token) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'account'],
    });

    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }

    ctx.state.user = user;
    await next();
  } catch {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
  }
};
