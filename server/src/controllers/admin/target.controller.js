import Joi from 'joi';
import { Op } from 'sequelize';
import { Activity, Target } from '../../models/index.js';
import { replanPendingFutureRounds } from '../../services/fetch/scheduler.service.js';

export const createTargetSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  platformTargetId: Joi.string().trim().min(1).max(128).required(),
  platform: Joi.string().valid('weibo', 'xiaohongshu').default('weibo'),
});

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const listTargets = async (ctx) => {
  const page = toInt(ctx.query.page, 1);
  const pageSize = Math.min(toInt(ctx.query.pageSize, 20), 100);
  const where = {};

  if (ctx.query.platform) {
    where.platform = ctx.query.platform;
  }

  if (ctx.query.keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${ctx.query.keyword}%` } },
      { platformTargetId: { [Op.like]: `%${ctx.query.keyword}%` } },
    ];
  }

  const { rows, count } = await Target.findAndCountAll({
    where,
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  ctx.body = {
    items: rows.map((target) => ({
      id: target.id,
      platform: target.platform,
      platformTargetId: target.platformTargetId,
      name: target.name,
      createdAt: target.created_at || target.createdAt,
    })),
    page,
    pageSize,
    total: count,
  };
};

export const createTarget = async (ctx) => {
  const target = await Target.create(ctx.request.body);
  await replanPendingFutureRounds();

  ctx.status = 201;
  ctx.body = {
    id: target.id,
    platform: target.platform,
    platformTargetId: target.platformTargetId,
    name: target.name,
    createdAt: target.created_at || target.createdAt,
  };
};

export const deleteTarget = async (ctx) => {
  const target = await Target.findByPk(ctx.params.id);

  if (!target) {
    ctx.status = 404;
    ctx.body = { error: 'Target not found' };
    return;
  }

  await target.destroy();
  await replanPendingFutureRounds();
  ctx.body = { ok: true };
};

export const listActivities = async (ctx) => {
  const page = toInt(ctx.query.page, 1);
  const pageSize = Math.min(toInt(ctx.query.pageSize, 20), 100);
  const where = {};

  if (ctx.query.platform) where.platform = ctx.query.platform;
  if (ctx.query.targetId) where.targetId = ctx.query.targetId;

  const { rows, count } = await Activity.findAndCountAll({
    where,
    order: [
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    include: [{ model: Target, as: 'target', attributes: ['id', 'name'] }],
  });

  ctx.body = {
    items: rows.map((activity) => ({
      id: activity.id,
      targetId: activity.targetId,
      targetName: activity.target?.name,
      platform: activity.platform,
      platformActivityId: activity.platformActivityId,
      authorName: activity.authorName,
      content: activity.content,
      sourceUrl: activity.sourceUrl,
      publishedAt: activity.publishedAt,
      publishedAtSource: activity.publishedAtSource,
    })),
    page,
    pageSize,
    total: count,
  };
};
