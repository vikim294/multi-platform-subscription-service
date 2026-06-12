import { Op } from 'sequelize';
import { Activity, PlatformToken, Target, TargetFollowerStat } from '../../models/index.js';
import { fetchWeiboFollowerCount } from '../platforms/weibo.adapter.js';
import { fetchXiaohongshuFollowerCount } from '../platforms/xiaohongshu.adapter.js';

const followerFetchers = {
  weibo: fetchWeiboFollowerCount,
  xiaohongshu: fetchXiaohongshuFollowerCount,
};

const pad = (value) => String(value).padStart(2, '0');

export const formatDate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const shiftDate = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const enumerateDates = (startDate, endDate) => {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const startOfDate = (dateString) => new Date(`${dateString}T00:00:00`);
const endOfDate = (dateString) => new Date(`${dateString}T23:59:59.999`);

const normalizeDate = (value) => {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : value;
};

export const captureFollowerStat = async (target, { statDate = formatDate(new Date()) } = {}) => {
  const fetcher = followerFetchers[target.platform];
  if (!fetcher) {
    return { status: 'skipped', message: 'unsupported_platform' };
  }

  const token = await PlatformToken.findOne({
    where: {
      platform: target.platform,
      enabled: true,
    },
  });

  if (!token) {
    return { status: 'skipped', message: 'missing_platform_token' };
  }

  const result = await fetcher({ target, cookie: token.cookie });
  const previousStat = await TargetFollowerStat.findOne({
    where: {
      targetId: target.id,
      statDate: { [Op.lt]: statDate },
    },
    order: [['statDate', 'DESC']],
  });
  const deltaCount = previousStat ? result.followersCount - previousStat.followersCount : null;
  const [record, created] = await TargetFollowerStat.findOrCreate({
    where: {
      targetId: target.id,
      statDate,
    },
    defaults: {
      targetId: target.id,
      statDate,
      followersCount: result.followersCount,
      deltaCount,
      capturedAt: new Date(),
      rawPayload: result.rawPayload,
    },
  });

  if (!created) {
    await record.update({
      followersCount: result.followersCount,
      deltaCount,
      capturedAt: new Date(),
      rawPayload: result.rawPayload,
    });
  }

  return {
    status: 'success',
    followersCount: result.followersCount,
    deltaCount,
    statDate,
  };
};

export const listTargetStats = async (targetId, { startDate, endDate } = {}) => {
  const target = await Target.findByPk(targetId);
  if (!target) {
    throw Object.assign(new Error('Target not found'), { status: 404 });
  }

  const today = formatDate(new Date());
  const normalizedEndDate = normalizeDate(endDate) || today;
  const normalizedStartDate = normalizeDate(startDate) || shiftDate(normalizedEndDate, -6);

  if (normalizedStartDate > normalizedEndDate) {
    throw Object.assign(new Error('Invalid date range'), { status: 400 });
  }

  const [stats, activities] = await Promise.all([
    TargetFollowerStat.findAll({
      where: {
        targetId: target.id,
        statDate: {
          [Op.between]: [normalizedStartDate, normalizedEndDate],
        },
      },
      order: [['statDate', 'ASC']],
    }),
    Activity.findAll({
      where: {
        targetId: target.id,
        publishedAt: {
          [Op.between]: [startOfDate(normalizedStartDate), endOfDate(normalizedEndDate)],
        },
      },
      attributes: ['publishedAt'],
      order: [['publishedAt', 'ASC']],
    }),
  ]);

  const statsByDate = new Map(stats.map((record) => [record.statDate, record]));
  const activityCountsByDate = new Map();

  for (const activity of activities) {
    if (!activity.publishedAt) continue;
    const date = formatDate(new Date(activity.publishedAt));
    activityCountsByDate.set(date, (activityCountsByDate.get(date) || 0) + 1);
  }

  return {
    target: {
      id: target.id,
      platform: target.platform,
      platformTargetId: target.platformTargetId,
      name: target.name,
    },
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    rows: enumerateDates(normalizedStartDate, normalizedEndDate).map((date) => {
      const stat = statsByDate.get(date);
      return {
        statDate: date,
        followersCount: stat?.followersCount ?? null,
        deltaCount: stat?.deltaCount ?? null,
        activityCount: activityCountsByDate.get(date) || 0,
        capturedAt: stat?.capturedAt ?? null,
      };
    }),
  };
};
