import Joi from 'joi';
import { PlatformToken } from '../../models/index.js';

export const platformTokenSchema = Joi.object({
  cookie: Joi.string().trim().min(1).required(),
  enabled: Joi.boolean().default(true),
});

const maskCookie = (cookie) => {
  if (!cookie) return '';
  if (cookie.length <= 16) return `${cookie.slice(0, 4)}...`;
  return `${cookie.slice(0, 12)}...${cookie.slice(-6)}`;
};

export const listPlatformTokens = async (ctx) => {
  const items = await PlatformToken.findAll({
    order: [['platform', 'ASC']],
  });

  ctx.body = {
    items: items.map((item) => ({
      id: item.id,
      platform: item.platform,
      cookieMasked: maskCookie(item.cookie),
      enabled: item.enabled,
      updatedAt: item.updated_at || item.updatedAt,
    })),
  };
};

export const upsertPlatformToken = async (ctx) => {
  const platform = ctx.params.platform;
  if (!['weibo', 'xiaohongshu'].includes(platform)) {
    ctx.status = 400;
    ctx.body = { error: 'Unsupported platform' };
    return;
  }

  const [record] = await PlatformToken.upsert({
    platform,
    cookie: ctx.request.body.cookie,
    enabled: ctx.request.body.enabled,
  });

  ctx.body = {
    id: record.id,
    platform: record.platform,
    enabled: record.enabled,
  };
};
