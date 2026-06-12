import { env } from '../../config/env.js';
import { throwHttpError } from '../search/search.service.js';

const MAX_RESULTS = 30;
const MAX_EXTENSION_ITEMS = 100;
const MAX_TEXT_LENGTH = 500;
const MAX_QUESTION_LENGTH = 500;

export const askSearchResults = async ({ platform, keyword, question, results }) => {
  if (!env.ai.apiKey) throwHttpError('missing_ai_api_key', 400);

  const normalizedPlatform = normalizeText(platform || 'weibo', 32);
  const normalizedKeyword = normalizeText(keyword, 128);
  const normalizedQuestion = normalizeText(question, MAX_QUESTION_LENGTH);
  const normalizedResults = normalizeResults(results);

  if (!normalizedKeyword) throwHttpError('missing_keyword', 400);
  if (!normalizedQuestion) throwHttpError('missing_question', 400);
  if (!normalizedResults.length) throwHttpError('missing_search_results', 400);

  return askAi({
    system: [
      '你是社交媒体内容分析助手。',
      '只能基于用户提供的搜索结果回答，不要编造外部事实。',
      '请用中文回答，尽量结构化、简洁、可执行。',
      '如果搜索结果不足以回答，请明确说明。',
    ].join('\n'),
    prompt: buildSearchPrompt({
      platform: normalizedPlatform,
      keyword: normalizedKeyword,
      question: normalizedQuestion,
      results: normalizedResults,
    }),
  });
};

export const askPostComments = async ({ platform, targetName, postText, question, comments }) => {
  if (!env.ai.apiKey) throwHttpError('missing_ai_api_key', 400);

  const normalizedQuestion = normalizeText(question, MAX_QUESTION_LENGTH);
  const normalizedComments = normalizeComments(comments);
  if (!normalizedQuestion) throwHttpError('missing_question', 400);
  if (!normalizedComments.length) throwHttpError('missing_comments', 400);

  return askAi({
    system: [
      '你是社交媒体评论分析助手。',
      '只能基于用户提供的帖子和评论回答，不要编造外部事实。',
      '请用中文回答，尽量结构化、简洁、可执行。',
      '如果评论不足以回答，请明确说明。',
    ].join('\n'),
    prompt: buildCommentPrompt({
      platform: normalizeText(platform || 'weibo', 32),
      targetName: normalizeText(targetName, 80),
      postText: normalizeText(postText, MAX_TEXT_LENGTH),
      question: normalizedQuestion,
      comments: normalizedComments,
    }),
  });
};

export const askExtensionContent = async ({ source, pageType, pageUrl, question, items }) => {
  if (!env.ai.apiKey) throwHttpError('missing_ai_api_key', 400);

  const normalizedQuestion = normalizeText(question, MAX_QUESTION_LENGTH);
  const normalizedItems = normalizeExtensionItems(items);
  if (!normalizedQuestion) throwHttpError('missing_question', 400);
  if (!normalizedItems.length) throwHttpError('missing_extension_items', 400);

  return askAi({
    system: [
      '你是社交媒体页面内容分析助手。',
      '只能基于浏览器插件从当前页面提取的内容回答，不要编造外部事实。',
      '请用中文回答，尽量结构化、简洁、可执行。',
      '如果页面内容不足以回答，请明确说明。',
    ].join('\n'),
    prompt: buildExtensionPrompt({
      source: normalizeText(source || 'weibo', 32),
      pageType: normalizeText(pageType, 64),
      pageUrl: normalizeText(pageUrl, 300),
      question: normalizedQuestion,
      items: normalizedItems,
    }),
  });
};

const askAi = async ({ system, prompt }) => {
  const response = await fetchWithTimeout(`${env.ai.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: env.ai.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throwHttpError(data?.error?.message || 'ai_provider_error', 502);
  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) throwHttpError('ai_empty_response', 502);

  return {
    answer,
    model: data.model || env.ai.model,
  };
};

const buildSearchPrompt = ({ platform, keyword, question, results }) => {
  const resultText = results
    .map((item, index) =>
      [
        `${index + 1}. 用户：${item.userName || '未知用户'}`,
        `   时间：${item.postedAtText || '-'}`,
        `   互动：评论 ${item.commentCount} / 转发 ${item.repostCount} / 点赞 ${item.likeCount}`,
        `   内容：${item.text || '无正文'}`,
      ].join('\n'),
    )
    .join('\n\n');

  return [`平台：${platform}`, `搜索关键词：${keyword}`, '', '搜索结果：', resultText, '', `用户问题：${question}`].join('\n');
};

const buildCommentPrompt = ({ platform, targetName, postText, question, comments }) => {
  const commentText = comments
    .map((item, index) =>
      [
        `${index + 1}. 用户：${item.userName || '未知用户'}`,
        `   时间：${item.createdAtText || '-'}`,
        `   互动：点赞 ${item.likeCount} / 回复 ${item.replyCount}`,
        `   评论：${item.text || '无内容'}`,
      ].join('\n'),
    )
    .join('\n\n');

  return [
    `平台：${platform}`,
    `目标：${targetName || '-'}`,
    `帖子正文：${postText || '无正文'}`,
    '',
    '评论：',
    commentText,
    '',
    `用户问题：${question}`,
  ].join('\n');
};

const buildExtensionPrompt = ({ source, pageType, pageUrl, question, items }) => {
  const itemText = items
    .map((item, index) =>
      [
        `${index + 1}. 作者：${item.author || '未知作者'}`,
        item.parentTitle ? `   所属帖子：${item.parentTitle}` : '',
        item.parentAuthor ? `   所属帖子作者：${item.parentAuthor}` : '',
        item.parentCommentText ? `   回复的评论：${item.parentCommentText}` : '',
        item.parentCommentAuthor ? `   回复的评论作者：${item.parentCommentAuthor}` : '',
        `   标题：${item.title || '-'}`,
        `   互动：评论 ${item.commentCount} / 转发 ${item.repostCount} / 点赞 ${item.likeCount} / 收藏 ${item.collectCount}`,
        `   链接：${item.url || '-'}`,
        item.parentUrl ? `   所属帖子链接：${item.parentUrl}` : '',
        `   内容：${item.text || '无内容'}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');

  return [
    `来源：${source}`,
    `页面类型：${pageType || '-'}`,
    `页面 URL：${pageUrl || '-'}`,
    '',
    '页面提取内容：',
    itemText,
    '',
    `用户问题：${question}`,
  ].join('\n');
};

const normalizeResults = (results) => {
  if (!Array.isArray(results)) return [];
  return results
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      userName: normalizeText(item?.user?.name || item?.userName, 80),
      text: normalizeText(item?.text, MAX_TEXT_LENGTH),
      postedAtText: normalizeText(item?.postedAtText, 80),
      commentCount: normalizeCount(item?.commentCount),
      repostCount: normalizeCount(item?.repostCount),
      likeCount: normalizeCount(item?.likeCount),
    }))
    .filter((item) => item.text);
};

const normalizeComments = (comments) => {
  if (!Array.isArray(comments)) return [];
  return comments
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      userName: normalizeText(item?.user?.name || item?.userName, 80),
      text: normalizeText(item?.text, MAX_TEXT_LENGTH),
      createdAtText: normalizeText(item?.createdAtText || item?.createdAt, 80),
      likeCount: normalizeCount(item?.likeCount),
      replyCount: normalizeCount(item?.replyCount),
    }))
    .filter((item) => item.text);
};

const normalizeExtensionItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, MAX_EXTENSION_ITEMS)
    .map((item) => ({
      author: normalizeText(item?.author || item?.user?.name, 80),
      title: normalizeText(item?.title, 160),
      text: normalizeText(item?.text, MAX_TEXT_LENGTH),
      url: normalizeText(item?.url, 300),
      parentTitle: normalizeText(item?.parentTitle, 160),
      parentAuthor: normalizeText(item?.parentAuthor, 80),
      parentUrl: normalizeText(item?.parentUrl, 300),
      parentCommentAuthor: normalizeText(item?.parentCommentAuthor, 80),
      parentCommentText: normalizeText(item?.parentCommentText, 240),
      commentCount: normalizeCount(item?.commentCount),
      repostCount: normalizeCount(item?.repostCount),
      likeCount: normalizeCount(item?.likeCount),
      collectCount: normalizeCount(item?.collectCount),
    }))
    .filter((item) => item.title || item.text);
};

const normalizeText = (value, maxLength) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const normalizeCount = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const fetchWithTimeout = async (url, options) => {
  const controller = new globalThis.AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), env.ai.timeoutMs);
  try {
    return await globalThis.fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throwHttpError('ai_provider_timeout', 504);
    throwHttpError('ai_provider_network_error', 502);
  } finally {
    globalThis.clearTimeout(timeout);
  }
};
