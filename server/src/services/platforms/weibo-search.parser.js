import { PlatformContractError } from './platform-errors.js';

export const parseWeiboSearchHtml = (html) => {
  if (!html || typeof html !== 'string') {
    throw new PlatformContractError('微博搜索响应不是 HTML');
  }
  if (html.includes('Sina Visitor System') || html.includes('/visitor/genvisitor')) {
    throw new PlatformContractError('微博搜索进入访客验证页，请更新 Cookie 后重试');
  }
  if (!html.includes('pl_feedlist_index')) {
    throw new PlatformContractError('微博搜索 SSR 响应结构变化：缺少搜索结果容器');
  }

  const results = [];
  const cardPattern = /<div class="card-wrap" action-type="feed_list_item" mid="([^"]+)"[^>]*>([\s\S]*?)<!--\/card-wrap-->/g;
  let match;
  while ((match = cardPattern.exec(html)) !== null) {
    const item = parseCard(match[1], match[2]);
    if (item) results.push(item);
  }

  return results;
};

const parseCard = (mid, html) => {
  const userTag = matchFirst(html, /<a[^>]*class="name"[^>]*>[\s\S]*?<\/a>/);
  const timeTag = matchFirst(html, /<div class="from"[^>]*>[\s\S]*?(<a[^>]*>[\s\S]*?<\/a>)/);
  const contentHtml =
    matchFirst(html, /<p class="txt" node-type="feed_list_content_full"[^>]*>([\s\S]*?)<\/p>/) ||
    matchFirst(html, /<p class="txt" node-type="feed_list_content"[^>]*>([\s\S]*?)<\/p>/);
  if (!userTag || !contentHtml) return null;

  const userHref = normalizeUrl(getAttribute(userTag, 'href'));
  const userId = userHref?.match(/weibo\.com\/(\d+)/)?.[1] ?? null;
  const postUrl = normalizeUrl(getAttribute(timeTag || '', 'href'));

  return {
    platform: 'weibo',
    platformPostId: mid,
    url: postUrl,
    user: {
      id: userId,
      name: cleanText(stripTags(userTag)),
      url: userHref,
    },
    text: cleanText(stripTags(contentHtml)),
    pics: extractImages(html),
    commentCount: parseActionCount(html, 'feed_list_comment'),
    repostCount: parseActionCount(html, 'feed_list_forward'),
    likeCount: parseLikeCount(html),
    postedAtText: cleanText(stripTags(timeTag || '')),
  };
};

const extractImages = (html) => {
  const media = matchFirst(html, /<div node-type="feed_list_media_prev">([\s\S]*?)<div node-type="feed_list_media_disp">/);
  if (!media) return [];
  const urls = [];
  const imagePattern = /<img[^>]*src="([^"]+)"/g;
  let match;
  while ((match = imagePattern.exec(media)) !== null) {
    const url = normalizeUrl(match[1]);
    if (url && !url.includes('face.t.sinajs.cn')) urls.push(url);
  }
  return [...new Set(urls)];
};

const parseActionCount = (html, actionType) => {
  const tag = matchFirst(html, new RegExp(`<a[^>]*action-type="${actionType}"[^>]*>[\\s\\S]*?<\\/a>`));
  if (!tag) return 0;
  return parseCount(cleanText(stripTags(tag)).replace(/转发|评论/g, ''));
};

const parseLikeCount = (html) => parseCount(cleanText(stripTags(matchFirst(html, /<span class="woo-like-count">([\s\S]*?)<\/span>/) || '')));

const parseCount = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return 0;
  if (normalized.endsWith('万')) return Math.round(Number(normalized.slice(0, -1)) * 10_000) || 0;
  return Number(normalized.replace(/[^\d]/g, '')) || 0;
};

const matchFirst = (text, pattern) => text.match(pattern)?.[1] ?? text.match(pattern)?.[0] ?? null;

const getAttribute = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;

const normalizeUrl = (url) => {
  if (!url) return null;
  const decoded = decodeHtml(url.trim());
  if (decoded.startsWith('//')) return `https:${decoded}`;
  if (decoded.startsWith('/')) return `https://s.weibo.com${decoded}`;
  return decoded;
};

const stripTags = (html) => decodeHtml(String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));

const cleanText = (text) =>
  String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const decodeHtml = (value) =>
  String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
