import { Activity, Target, UserSubscription } from '../../models/index.js';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const serializeActivity = (activity) => {
  if (!activity) return null;

  return {
    id: activity.id,
    targetId: activity.targetId,
    platform: activity.platform,
    platformActivityId: activity.platformActivityId,
    authorName: activity.authorName,
    content: activity.content,
    sourceUrl: activity.sourceUrl,
    publishedAt: activity.publishedAt,
  };
};

export const listUserTargets = async (ctx) => {
  const userId = ctx.state.user.id;
  const [targets, subscriptions] = await Promise.all([
    Target.findAll({ order: [['id', 'DESC']] }),
    UserSubscription.findAll({ where: { userId } }),
  ]);
  const subscribedTargetIds = new Set(subscriptions.map((item) => Number(item.targetId)));

  const items = await Promise.all(
    targets.map(async (target) => {
      const latestActivity = await Activity.findOne({
        where: { targetId: target.id },
        order: [
          ['publishedAt', 'DESC'],
          ['id', 'DESC'],
        ],
      });

      return {
        id: target.id,
        platform: target.platform,
        platformTargetId: target.platformTargetId,
        name: target.name,
        subscribed: subscribedTargetIds.has(Number(target.id)),
        latestActivity: serializeActivity(latestActivity),
        createdAt: target.created_at || target.createdAt,
      };
    }),
  );

  items.sort((a, b) => Number(b.subscribed) - Number(a.subscribed) || b.id - a.id);

  ctx.body = { items };
};

export const subscribeTarget = async (ctx) => {
  const target = await Target.findByPk(ctx.params.id);
  if (!target) {
    ctx.status = 404;
    ctx.body = { error: 'Target not found' };
    return;
  }

  await UserSubscription.findOrCreate({
    where: {
      userId: ctx.state.user.id,
      targetId: target.id,
    },
    defaults: {
      userId: ctx.state.user.id,
      targetId: target.id,
    },
  });

  ctx.body = { ok: true };
};

export const unsubscribeTarget = async (ctx) => {
  await UserSubscription.destroy({
    where: {
      userId: ctx.state.user.id,
      targetId: ctx.params.id,
    },
  });

  ctx.body = { ok: true };
};

export const listTargetActivities = async (ctx) => {
  const page = toInt(ctx.query.page, 1);
  const pageSize = Math.min(toInt(ctx.query.pageSize, 20), 100);
  const target = await Target.findByPk(ctx.params.id);

  if (!target) {
    ctx.status = 404;
    ctx.body = { error: 'Target not found' };
    return;
  }

  const { rows, count } = await Activity.findAndCountAll({
    where: { targetId: target.id },
    order: [
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  ctx.body = {
    target: {
      id: target.id,
      platform: target.platform,
      platformTargetId: target.platformTargetId,
      name: target.name,
    },
    items: rows.map(serializeActivity),
    page,
    pageSize,
    total: count,
  };
};
