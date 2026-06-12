import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import { UniqueConstraintError } from 'sequelize';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { adminRoutes } from './routes/admin.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { logger } from './utils/logger.js';

export const createApp = () => {
  const app = new Koa();

  app.use(errorHandler);
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(helmet());
  app.use(bodyParser({ jsonLimit: '2mb' }));

  app.use(healthRoutes.routes());
  app.use(healthRoutes.allowedMethods());
  app.use(authRoutes.routes());
  app.use(authRoutes.allowedMethods());
  app.use(adminRoutes.routes());
  app.use(adminRoutes.allowedMethods());
  app.use(userRoutes.routes());
  app.use(userRoutes.allowedMethods());

  app.use((ctx) => {
    ctx.status = 404;
    ctx.body = { error: 'Not found' };
  });

  app.on('error', (error) => {
    if (error instanceof UniqueConstraintError) {
      logger.warn('Unique constraint error:', error.message);
      return;
    }

    logger.error(error);
  });

  return app;
};
