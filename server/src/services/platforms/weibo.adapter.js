import axios from 'axios';
import { env } from '../../config/env.js';

const stripHtml = (value = '') =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const parsePublishedAt = (createdAt) => {
  if (!createdAt) return null;
  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildSourceUrl = (item, target) => {
  if (item.mblogid) {
    return `${env.weiboBaseUrl}/${target.platformTargetId}/${item.mblogid}`;
  }

  if (item.idstr) {
    return `${env.weiboBaseUrl}/${target.platformTargetId}/${item.idstr}`;
  }

  return null;
};

const getItems = (payload) => {
  if (Array.isArray(payload?.data?.list)) return payload.data.list;
  if (Array.isArray(payload?.data?.statuses)) return payload.data.statuses;
  if (Array.isArray(payload?.statuses)) return payload.statuses;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
};

export const fetchWeiboTargetPage = async ({ target, cookie, page = 1 }) => {
  const response = await axios.get(`${env.weiboBaseUrl}/ajax/statuses/mymblog`, {
    params: {
      uid: target.platformTargetId,
      page,
      feature: 0,
    },
    headers: {
      cookie,
      referer: `${env.weiboBaseUrl}/u/${target.platformTargetId}`,
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      accept: 'application/json, text/plain, */*',
    },
    timeout: 15000,
  });

  const items = getItems(response.data);

  return items
    .map((item) => ({
      platform: 'weibo',
      platformActivityId: String(item.idstr || item.id || item.mid || ''),
      authorPlatformId: String(item.user?.idstr || item.user?.id || target.platformTargetId),
      authorName: item.user?.screen_name || target.name,
      content: stripHtml(item.text_raw || item.text || ''),
      sourceUrl: buildSourceUrl(item, target),
      rawPayload: item,
      publishedAt: parsePublishedAt(item.created_at),
    }))
    .filter((activity) => activity.platformActivityId);
};

export const fetchWeiboFollowerCount = async ({ target, cookie }) => {
  const response = await axios.get(`${env.weiboBaseUrl}/ajax/profile/info`, {
    params: {
      uid: target.platformTargetId,
      scene: 'profile',
    },
    headers: {
      cookie,
      referer: `${env.weiboBaseUrl}/u/${target.platformTargetId}`,
      'client-version': '3.0.0',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      accept: 'application/json, text/plain, */*',
    },
    timeout: 15000,
  });

  const followersCount = Number(response.data?.data?.user?.followers_count);
  if (!Number.isFinite(followersCount)) {
    throw new Error(`微博粉丝数字段缺失。uid=${target.platformTargetId}`);
  }

  return {
    followersCount,
    rawPayload: response.data,
  };
};
