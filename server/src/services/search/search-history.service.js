import { UserSearchHistory } from '../../models/index.js';

export const recordSearchHistory = async ({ userId, platform, keyword }) => {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) return null;
  const now = new Date();

  const [record, created] = await UserSearchHistory.findOrCreate({
    where: {
      userId,
      platform,
      keyword: normalizedKeyword,
    },
    defaults: {
      userId,
      platform,
      keyword: normalizedKeyword,
      searchCount: 1,
      lastSearchedAt: now,
    },
  });

  if (!created) {
    record.searchCount += 1;
    record.lastSearchedAt = now;
    await record.save();
  }

  return serializeHistory(record);
};

export const listSearchHistories = async ({ userId, limit = 10 }) => {
  const rows = await UserSearchHistory.findAll({
    where: { userId },
    order: [
      ['lastSearchedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: normalizeLimit(limit),
  });
  return rows.map(serializeHistory);
};

export const deleteSearchHistory = async ({ userId, id }) => {
  const deletedCount = await UserSearchHistory.destroy({ where: { userId, id } });
  if (!deletedCount) {
    const error = new Error('history_not_found');
    error.status = 404;
    throw error;
  }
  return { ok: true };
};

export const clearSearchHistories = async ({ userId }) => {
  const deletedCount = await UserSearchHistory.destroy({ where: { userId } });
  return { deletedCount };
};

const normalizeKeyword = (value) => String(value || '').trim().slice(0, 128);

const normalizeLimit = (value) => {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, 30);
};

const serializeHistory = (record) => ({
  id: record.id,
  platform: record.platform,
  keyword: record.keyword,
  searchCount: record.searchCount,
  lastSearchedAt: record.lastSearchedAt,
  createdAt: record.createdAt,
});
