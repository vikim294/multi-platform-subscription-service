import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(currentDir, '../..');
const repoRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(serverRoot, '.env') });

const required = ['ADMIN_TOKEN', 'DB_NAME', 'DB_USER'];

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
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  },
  weiboBaseUrl: process.env.WEIBO_BASE_URL || 'https://weibo.com',
  fetchCron: process.env.FETCH_CRON || '0 0 * * *',
  fetchMinDelaySeconds: toInt(process.env.FETCH_MIN_DELAY_SECONDS, 5),
  fetchMaxDelaySeconds: toInt(process.env.FETCH_MAX_DELAY_SECONDS, 60),
};
