import axios from 'axios';
import { env } from '../../config/env.js';

const client = axios.create({
  baseURL: env.xiaohongshuBaseUrl,
  timeout: 15000,
  responseType: 'text',
  headers: {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9',
    referer: `${env.xiaohongshuBaseUrl}/`,
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'upgrade-insecure-requests': '1',
  },
});

const parseInitialState = (html) => {
  if (!html || typeof html !== 'string') {
    throw new Error('小红书主页响应不是 HTML');
  }

  const match = html.match(/<script>window\.__INITIAL_STATE__=(.*?)<\/script>/s);
  if (!match?.[1]) {
    throw new Error('小红书 SSR 响应结构变化：缺少 __INITIAL_STATE__');
  }

  return JSON.parse(match[1].replace(/\bundefined\b/g, 'null'));
};

const parseUser = (userStore) => {
  const basicInfo = userStore?.userPageData?.basicInfo ?? {};
  const interactions = userStore?.userPageData?.interactions ?? [];
  const firstNoteUser = userStore?.notes?.[0]?.find((item) => item?.noteCard?.user)?.noteCard?.user ?? {};

  return {
    nickname: basicInfo.nickname ?? firstNoteUser.nickname ?? firstNoteUser.nickName ?? null,
    userId: firstNoteUser.userId ?? basicInfo.redId ?? null,
    followersCount: parseCount(interactions[1]?.count),
  };
};

const parseCount = (value) => {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  const normalized = value.trim();
  if (normalized.endsWith('万')) {
    return Math.round(Number(normalized.slice(0, -1)) * 10000) || 0;
  }
  return Number(normalized.replace(/[^\d]/g, '')) || 0;
};

const parseNotes = (state) => {
  const userStore = state.user;
  const firstPageNotes = userStore?.notes?.[0];

  if (!Array.isArray(firstPageNotes)) {
    throw new Error('小红书 SSR 响应结构变化：缺少 user.notes[0]');
  }

  return {
    user: parseUser(userStore),
    notes: firstPageNotes
      .map((item) => {
        const card = item?.noteCard;
        if (!card) return null;

        const noteId = card.noteId || item.id;
        if (!noteId) return null;

        return {
          noteId,
          title: card.displayTitle ?? '',
          userId: card.user?.userId ?? null,
          nickname: card.user?.nickname ?? card.user?.nickName ?? null,
          xsecToken: card.xsecToken ?? item.xsecToken ?? null,
          raw: {
            id: item.id,
            index: item.index,
            noteCard: card,
          },
        };
      })
      .filter(Boolean),
  };
};

const buildSourceUrl = (note) => {
  const url = new URL(`/explore/${encodeURIComponent(note.noteId)}`, env.xiaohongshuBaseUrl);
  if (note.xsecToken) {
    url.searchParams.set('xsec_token', note.xsecToken);
  }
  return url.toString();
};

export const fetchXiaohongshuTargetPage = async ({ target, cookie, fetchedAt = new Date() }) => {
  const response = await client.get(`/user/profile/${encodeURIComponent(target.platformTargetId)}`, {
    headers: {
      cookie,
    },
  });

  const state = parseInitialState(response.data);
  const { user, notes } = parseNotes(state);

  if (notes.length === 0) {
    throw new Error('小红书 SSR 首屏没有可解析笔记');
  }

  return notes.map((note) => ({
    platform: 'xiaohongshu',
    platformActivityId: note.noteId,
    authorPlatformId: note.userId || user.userId || target.platformTargetId,
    authorName: note.nickname || user.nickname || target.name,
    content: note.title,
    sourceUrl: buildSourceUrl(note),
    rawPayload: note.raw,
    publishedAt: fetchedAt,
    publishedAtSource: 'fetched_at',
  }));
};

export const fetchXiaohongshuFollowerCount = async ({ target, cookie }) => {
  const response = await client.get(`/user/profile/${encodeURIComponent(target.platformTargetId)}`, {
    headers: {
      cookie,
    },
  });

  const state = parseInitialState(response.data);
  const { user } = parseNotes(state);
  const followersCount = Number(user.followersCount);

  if (!Number.isFinite(followersCount)) {
    throw new Error(`小红书粉丝数字段缺失。user_id=${target.platformTargetId}`);
  }

  return {
    followersCount,
    rawPayload: {
      user,
    },
  };
};
