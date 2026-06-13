import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UniqueConstraintError } from 'sequelize';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { adminRoutes } from './routes/admin.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { logger } from './utils/logger.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const skillFilePath = path.resolve(currentDir, '../../SKILL.md');
const extensionZipFilePath = path.resolve(currentDir, '../public/downloads/mpss-browser-extension.zip');

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

  app.use(async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path === '/downloads/mpss-browser-extension.zip') {
      try {
        await fs.access(extensionZipFilePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          ctx.status = 404;
          ctx.type = 'text/plain; charset=utf-8';
          ctx.body = 'Browser extension package not found. Run pnpm extension:zip first.';
          return;
        }
        throw error;
      }

      ctx.attachment('mpss-browser-extension.zip');
      ctx.type = 'application/zip';
      ctx.body = createReadStream(extensionZipFilePath);
      return;
    }

    if (ctx.method !== 'GET' || ctx.path !== '/SKILL.md') {
      await next();
      return;
    }

    ctx.type = 'text/markdown; charset=utf-8';
    ctx.set('Cache-Control', 'no-cache');
    ctx.body = await fs.readFile(skillFilePath, 'utf8');
  });

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
