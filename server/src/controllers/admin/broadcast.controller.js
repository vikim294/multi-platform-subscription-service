import { broadcastToOnlineUsers } from '../../services/notifications/sse-hub.service.js';

export const broadcastTestNewActivity = async (ctx) => {
  const result = broadcastToOnlineUsers('new-activity', {
    notificationId: `test-${Date.now()}`,
    targetId: null,
    targetName: '测试广播',
    activityId: null,
    content: '这是一条仅用于测试 SSE 在线提醒的假动态，不会写入未读列表。',
    sourceUrl: null,
    publishedAt: new Date().toISOString(),
    publishedAtSource: 'fetched_at',
    test: true,
  });

  ctx.body = {
    ok: true,
    ...result,
  };
};
