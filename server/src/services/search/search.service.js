import { PlatformToken } from '../../models/index.js';
import { fetchWeiboSearchResults } from '../platforms/weibo.adapter.js';
import { recordSearchHistory } from './search-history.service.js';

const searchFetchers = {
  weibo: fetchWeiboSearchResults,
};

export const searchPlatformContent = async ({ userId, platform = 'weibo', keyword, page = 1 }) => {
  const normalizedPlatform = String(platform || 'weibo').trim();
  const normalizedKeyword = String(keyword || '').trim();
  const normalizedPage = normalizePage(page);
  if (!normalizedKeyword) throwHttpError('missing_keyword', 400);

  const fetcher = searchFetchers[normalizedPlatform];
  if (!fetcher) throwHttpError('unsupported_platform', 400);

  const token = await PlatformToken.findOne({ where: { platform: normalizedPlatform, enabled: true } });
  if (!token?.cookie) throwHttpError('missing_platform_token', 400);

  try {
    const results = await fetcher({
      keyword: normalizedKeyword,
      page: normalizedPage,
      cookie: token.cookie,
    });
    await recordSearchHistory({
      userId,
      platform: normalizedPlatform,
      keyword: normalizedKeyword,
    });
    return {
      platform: normalizedPlatform,
      keyword: normalizedKeyword,
      page: normalizedPage,
      results,
    };
  } catch (error) {
    throwHttpError(getPlatformErrorCode(error, 'platform_search_error'), error.tokenInvalid ? 400 : 500);
  }
};

const normalizePage = (value) => {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, 50);
};

export const getPlatformErrorCode = (error, fallback) => {
  if (error?.tokenInvalid && !error?.network) return 'platform_token_expired';
  if (error?.contract) return 'platform_contract_error';
  if (error?.network) return 'platform_network_error';
  return error?.code || fallback;
};

export const throwHttpError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  throw error;
};
