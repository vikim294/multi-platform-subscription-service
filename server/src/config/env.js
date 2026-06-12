import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(currentDir, '../..');
const repoRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(serverRoot, '.env') });

const required = ['ADMIN_TOKEN', 'JWT_SECRET', 'DB_NAME', 'DB_USER'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  adminToken: process.env.ADMIN_TOKEN,
  jwtSecret: process.env.JWT_SECRET,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  },
  weiboBaseUrl: process.env.WEIBO_BASE_URL || 'https://weibo.com',
  xiaohongshuBaseUrl: process.env.XIAOHONGSHU_BASE_URL || 'https://www.xiaohongshu.com',
  fetchCron: process.env.FETCH_CRON || '0 0 * * *',
  fetchMinDelaySeconds: toInt(process.env.FETCH_MIN_DELAY_SECONDS, 5),
  fetchMaxDelaySeconds: toInt(process.env.FETCH_MAX_DELAY_SECONDS, 60),
  schedulerRoundsPerDay: toInt(process.env.SCHEDULER_ROUNDS_PER_DAY, 6),
  schedulerMinTaskGapMs: toInt(process.env.SCHEDULER_MIN_TASK_GAP_MS, 10000),
  schedulerMinRoundGapMs: toInt(process.env.SCHEDULER_MIN_ROUND_GAP_MS, 3600000),
  schedulerRoundWindowMs: toInt(process.env.SCHEDULER_ROUND_WINDOW_MS, 3600000),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'deepseek-chat',
    timeoutMs: toInt(process.env.AI_TIMEOUT_MS, 30000),
  },
  rateLimits: {
    search: {
      windowMs: toInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS, 10 * 60 * 1000),
      max: toInt(process.env.RATE_LIMIT_SEARCH_MAX, 10),
    },
    comments: {
      windowMs: toInt(process.env.RATE_LIMIT_COMMENTS_WINDOW_MS, 10 * 60 * 1000),
      max: toInt(process.env.RATE_LIMIT_COMMENTS_MAX, 20),
    },
    ai: {
      windowMs: toInt(process.env.RATE_LIMIT_AI_WINDOW_MS, 60 * 60 * 1000),
      max: toInt(process.env.RATE_LIMIT_AI_MAX, 20),
    },
  },
};
