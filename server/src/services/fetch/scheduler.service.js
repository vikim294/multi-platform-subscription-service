import cron from 'node-cron';
import { env } from '../../config/env.js';
import { Target } from '../../models/index.js';
import { logger } from '../../utils/logger.js';
import { randomInt, sleep } from '../../utils/sleep.js';
import { fetchTarget } from './fetch-target.service.js';

let isRunning = false;

export const fetchAllTargetsSequentially = async () => {
  if (isRunning) {
    return { accepted: false, reason: 'Fetch loop is already running' };
  }

  isRunning = true;

  try {
    const targets = await Target.findAll({
      order: [['id', 'ASC']],
    });

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];

      try {
        await fetchTarget(target);
      } catch (error) {
        logger.error(`Fetch target ${target.id} failed:`, error.message);
      }

      if (index < targets.length - 1) {
        const seconds = randomInt(env.fetchMinDelaySeconds, env.fetchMaxDelaySeconds);
        await sleep(seconds * 1000);
      }
    }

    return { accepted: true, targetCount: targets.length };
  } finally {
    isRunning = false;
  }
};

export const startScheduler = () => {
  cron.schedule(env.fetchCron, () => {
    fetchAllTargetsSequentially().catch((error) => {
      logger.error('Scheduled fetch loop failed:', error);
    });
  });

  logger.info(`Scheduler registered with cron: ${env.fetchCron}`);
};
