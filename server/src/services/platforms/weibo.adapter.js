import axios from 'axios';
import { env } from '../../config/env.js';
import { PlatformContractError, PlatformRequestError } from './platform-errors.js';
import { parseWeiboSearchHtml } from './weibo-search.parser.js';

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

export const fetchWeiboSearchResults = async ({ keyword, page = 1, cookie }) => {
  try {
    const response = await axios.get('https://s.weibo.com/weibo', {
      params: { q: keyword, page },
      headers: {
        cookie,
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9',
      },
      maxRedirects: 0,
      responseType: 'text',
      timeout: 15000,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    if (response.status === 302) {
      throw new PlatformRequestError('微博搜索被重定向，可能需要更新 Cookie 或通过浏览器验证', {
        tokenInvalid: true,
        code: 'platform_token_expired',
      });
    }
    return parseWeiboSearchHtml(response.data);
  } catch (error) {
    if (error instanceof PlatformContractError || error instanceof PlatformRequestError) throw error;
    const status = error.response?.status;
    if (status === 302 || status === 401) {
      throw new PlatformRequestError('微博 Cookie 已过期，请重新从浏览器复制', {
        tokenInvalid: true,
        code: 'platform_token_expired',
        cause: error,
      });
    }
    if (status) {
      throw new PlatformRequestError(`微博搜索请求失败，HTTP ${status}`, {
        contract: true,
        code: 'platform_contract_error',
        cause: error,
      });
    }
    throw new PlatformRequestError(error.message || '微博搜索网络请求失败', {
      network: true,
      code: 'platform_network_error',
      cause: error,
    });
  }
};

export const fetchWeiboPostComments = async ({ target, postId, maxId = 0, count = 20, cookie }) => {
  try {
    const params = {
      is_reload: 1,
      id: postId,
      is_show_bulletin: 2,
      is_mix: 0,
      count,
      type: 'feed',
      uid: target.platformTargetId,
      fetch_level: 0,
      locale: 'zh-CN',
    };
    if (maxId) params.max_id = maxId;

    const response = await axios.get(`${env.weiboBaseUrl}/ajax/statuses/buildComments`, {
      params,
      headers: {
        cookie,
        referer: `${env.weiboBaseUrl}/u/${target.platformTargetId}`,
        'client-version': '3.0.0',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        accept: 'application/json, text/plain, */*',
        'x-requested-with': 'XMLHttpRequest',
      },
      maxRedirects: 0,
      timeout: 15000,
    });

    if (!response.data || typeof response.data !== 'object') {
      throw new PlatformContractError('微博评论接口响应不是 JSON 对象');
    }
    if (!Array.isArray(response.data.data)) {
      throw new PlatformContractError('微博评论接口响应结构变化：缺少 data');
    }
    return response.data;
  } catch (error) {
    if (error instanceof PlatformContractError || error instanceof PlatformRequestError) throw error;
    const status = error.response?.status;
    if (status === 302 || status === 401) {
      throw new PlatformRequestError('微博 Cookie 已过期，请重新从浏览器复制', {
        tokenInvalid: true,
        code: 'platform_token_expired',
        cause: error,
      });
    }
    if (status) {
      throw new PlatformRequestError(`微博评论请求失败，HTTP ${status}`, {
        contract: true,
        code: 'platform_contract_error',
        cause: error,
      });
    }
    throw new PlatformRequestError(error.message || '微博评论网络请求失败', {
      network: true,
      code: 'platform_network_error',
      cause: error,
    });
  }
};
