import { createApp } from './app.js';
import { env } from './config/env.js';
import { sequelize } from './models/index.js';
import { startScheduler } from './services/fetch/scheduler.service.js';
import { logger } from './utils/logger.js';

const app = createApp();

await sequelize.authenticate();

app.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
});

startScheduler();
