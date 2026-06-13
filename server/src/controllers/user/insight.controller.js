import { env } from '../../config/env.js';
import { userRateLimit } from '../../middleware/user-rate-limit.js';
import { syncMarkdownToBaizhiKnowledgeBase } from '../../services/baizhi/knowledge-base.service.js';
import { askExtensionContent, askPostComments, askSearchResults } from '../../services/ai/ai-analysis.service.js';
import { listTargetPosts, listWeiboPostComments } from '../../services/comments/post-comment.service.js';
import {
  clearSearchHistories,
  deleteSearchHistory,
  listSearchHistories,
} from '../../services/search/search-history.service.js';
import { searchPlatformContent } from '../../services/search/search.service.js';

export const limitSearch = userRateLimit('search', env.rateLimits.search);
export const limitComments = userRateLimit('comments', env.rateLimits.comments);
export const limitAi = userRateLimit('ai', env.rateLimits.ai);

export const searchContent = async (ctx) => {
  ctx.body = await searchPlatformContent({
    userId: ctx.state.user.id,
    platform: ctx.query.platform,
    keyword: ctx.query.keyword,
    page: ctx.query.page,
  });
};

export const askSearch = async (ctx) => {
  ctx.body = await askSearchResults({
    platform: ctx.request.body.platform,
    keyword: ctx.request.body.keyword,
    question: ctx.request.body.question,
    results: ctx.request.body.results,
  });
};

export const askComments = async (ctx) => {
  ctx.body = await askPostComments({
    platform: ctx.request.body.platform,
    targetName: ctx.request.body.targetName,
    postText: ctx.request.body.postText,
    question: ctx.request.body.question,
    comments: ctx.request.body.comments,
  });
};

export const askExtension = async (ctx) => {
  ctx.body = await askExtensionContent({
    source: ctx.request.body.source,
    pageType: ctx.request.body.pageType,
    pageUrl: ctx.request.body.pageUrl,
    question: ctx.request.body.question,
    items: ctx.request.body.items,
  });
};

export const syncExtensionMarkdown = async (ctx) => {
  ctx.body = {
    synced: await syncMarkdownToBaizhiKnowledgeBase({
      userId: ctx.state.user.id,
      markdown: ctx.request.body.markdown,
      title: ctx.request.body.title,
      source: ctx.request.body.source,
    }),
  };
};

export const getSearchHistories = async (ctx) => {
  ctx.body = {
    histories: await listSearchHistories({
      userId: ctx.state.user.id,
      limit: ctx.query.limit,
    }),
  };
};

export const removeSearchHistory = async (ctx) => {
  ctx.body = await deleteSearchHistory({
    userId: ctx.state.user.id,
    id: ctx.params.id,
  });
};

export const removeAllSearchHistories = async (ctx) => {
  ctx.body = await clearSearchHistories({ userId: ctx.state.user.id });
};

export const getTargetPosts = async (ctx) => {
  ctx.body = await listTargetPosts({
    targetId: ctx.params.id,
    platform: ctx.query.platform,
    page: ctx.query.page,
    pageSize: ctx.query.pageSize,
  });
};

export const getPostComments = async (ctx) => {
  ctx.body = await listWeiboPostComments({
    targetId: ctx.params.id,
    postId: ctx.params.postId,
    maxId: ctx.query.maxId,
  });
};
