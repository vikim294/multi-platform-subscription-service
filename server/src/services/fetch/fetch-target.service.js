import { Activity, FetchLog, PlatformToken } from '../../models/index.js';
import { fetchWeiboTargetPage } from '../platforms/weibo.adapter.js';

const getAdapter = (platform) => {
  if (platform === 'weibo') return fetchWeiboTargetPage;
  throw Object.assign(new Error(`Unsupported platform: ${platform}`), { status: 400 });
};

export const fetchTarget = async (target) => {
  const startedAt = new Date();
  const adapter = getAdapter(target.platform);
  const token = await PlatformToken.findOne({
    where: {
      platform: target.platform,
      enabled: true,
    },
  });

  if (!token) {
    await FetchLog.create({
      targetId: target.id,
      platform: target.platform,
      status: 'skipped',
      message: `Missing enabled ${target.platform} cookie`,
      startedAt,
      finishedAt: new Date(),
    });

    return {
      targetId: target.id,
      platform: target.platform,
      status: 'skipped',
      fetchedCount: 0,
      insertedCount: 0,
    };
  }

  try {
    const activities = await adapter({ target, cookie: token.cookie, page: 1 });
    let insertedCount = 0;

    for (const activity of activities) {
      const [record, created] = await Activity.findOrCreate({
        where: {
          platform: activity.platform,
          platformActivityId: activity.platformActivityId,
        },
        defaults: {
          ...activity,
          targetId: target.id,
        },
      });

      if (!created && record.targetId !== target.id) {
        await record.update({ targetId: target.id });
      }

      if (created) insertedCount += 1;
    }

    await FetchLog.create({
      targetId: target.id,
      platform: target.platform,
      status: 'success',
      pageCount: 1,
      fetchedCount: activities.length,
      insertedCount,
      startedAt,
      finishedAt: new Date(),
    });

    return {
      targetId: target.id,
      platform: target.platform,
      status: 'success',
      fetchedCount: activities.length,
      insertedCount,
    };
  } catch (error) {
    await FetchLog.create({
      targetId: target.id,
      platform: target.platform,
      status: 'failed',
      pageCount: 1,
      message: error.message.slice(0, 1024),
      startedAt,
      finishedAt: new Date(),
    });

    throw error;
  }
};
