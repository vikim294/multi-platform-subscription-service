import { Op } from 'sequelize';
import { Activity, ActivityNotification, Target } from '../../models/index.js';
import { addSseConnection } from '../../services/notifications/sse-hub.service.js';

const serializeNotification = (notification) => ({
  id: notification.id,
  readAt: notification.readAt,
  createdAt: notification.created_at || notification.createdAt,
  target: notification.target
    ? {
        id: notification.target.id,
        name: notification.target.name,
        platform: notification.target.platform,
        platformTargetId: notification.target.platformTargetId,
      }
    : null,
  activity: notification.activity
    ? {
        id: notification.activity.id,
        content: notification.activity.content,
        sourceUrl: notification.activity.sourceUrl,
        publishedAt: notification.activity.publishedAt,
        publishedAtSource: notification.activity.publishedAtSource,
      }
    : null,
});

export const listUnreadNotifications = async (ctx) => {
  const where = {
    userId: ctx.state.user.id,
    readAt: { [Op.is]: null },
  };

  const [items, unreadCount] = await Promise.all([
    ActivityNotification.findAll({
      where,
      order: [['id', 'DESC']],
      include: [
        { model: Target, as: 'target', attributes: ['id', 'name', 'platform', 'platformTargetId'] },
        { model: Activity, as: 'activity', attributes: ['id', 'content', 'sourceUrl', 'publishedAt', 'publishedAtSource'] },
      ],
    }),
    ActivityNotification.count({ where }),
  ]);

  ctx.body = {
    unreadCount,
    items: items.map(serializeNotification),
  };
};

export const markNotificationRead = async (ctx) => {
  await ActivityNotification.update(
    { readAt: new Date() },
    {
      where: {
        id: ctx.params.id,
        userId: ctx.state.user.id,
        readAt: { [Op.is]: null },
      },
    },
  );

  ctx.body = { ok: true };
};

export const markAllNotificationsRead = async (ctx) => {
  await ActivityNotification.update(
    { readAt: new Date() },
    {
      where: {
        userId: ctx.state.user.id,
        readAt: { [Op.is]: null },
      },
    },
  );

  ctx.body = { ok: true };
};

export const streamNotifications = async (ctx) => {
  ctx.req.setTimeout(0);
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  ctx.status = 200;
  ctx.respond = false;

  const cleanup = addSseConnection(ctx.state.user.id, ctx.res);
  ctx.req.on('close', cleanup);
};
