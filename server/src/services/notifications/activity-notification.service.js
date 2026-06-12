import { ActivityNotification, UserSubscription } from '../../models/index.js';
import { pushToUser } from './sse-hub.service.js';

export const notifyNewActivity = async ({ target, activity }) => {
  const subscriptions = await UserSubscription.findAll({
    where: { targetId: target.id },
  });

  if (subscriptions.length === 0) return;

  for (const subscription of subscriptions) {
    const [notification, created] = await ActivityNotification.findOrCreate({
      where: {
        userId: subscription.userId,
        activityId: activity.id,
      },
      defaults: {
        userId: subscription.userId,
        targetId: target.id,
        activityId: activity.id,
      },
    });

    if (!created) continue;

    pushToUser(subscription.userId, 'new-activity', {
      notificationId: notification.id,
      targetId: target.id,
      targetName: target.name,
      activityId: activity.id,
      content: activity.content,
      sourceUrl: activity.sourceUrl,
      publishedAt: activity.publishedAt,
      publishedAtSource: activity.publishedAtSource,
    });
  }
};
