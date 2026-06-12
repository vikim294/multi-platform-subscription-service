import { Activity, PlatformToken, Target } from '../../models/index.js';
import { fetchWeiboPostComments } from '../platforms/weibo.adapter.js';
import { getPlatformErrorCode, throwHttpError } from '../search/search.service.js';

const COMMENT_PAGE_SIZE = 20;

export const listTargetPosts = async ({ targetId, platform = 'weibo', page = 1, pageSize = 10 }) => {
  const target = await findTarget(targetId);
  if (target.platform !== platform || target.platform !== 'weibo') throwHttpError('unsupported_platform', 400);

  const normalizedPage = normalizePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);
  const { rows, count } = await Activity.findAndCountAll({
    where: { targetId: target.id },
    order: [
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: normalizedPageSize,
    offset: (normalizedPage - 1) * normalizedPageSize,
  });

  return {
    target: serializeTarget(target),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total: count,
    posts: rows.map((row) => serializePost(row, target)),
  };
};

export const listWeiboPostComments = async ({ targetId, postId, maxId = 0 }) => {
  const target = await findTarget(targetId);
  if (target.platform !== 'weibo') throwHttpError('unsupported_platform', 400);

  const post = await Activity.findOne({
    where: {
      targetId: target.id,
      platformActivityId: String(postId || '').trim(),
    },
  });
  if (!post) throwHttpError('post_not_found', 404);

  const token = await PlatformToken.findOne({ where: { platform: 'weibo', enabled: true } });
  if (!token?.cookie) throwHttpError('missing_platform_token', 400);

  try {
    const rawData = await fetchWeiboPostComments({
      target,
      postId: post.platformActivityId,
      maxId: normalizeMaxId(maxId),
      count: COMMENT_PAGE_SIZE,
      cookie: token.cookie,
    });
    return parseWeiboCommentResponse(rawData, { target, post });
  } catch (error) {
    throwHttpError(getPlatformErrorCode(error, 'platform_comment_error'), error.tokenInvalid ? 400 : 500);
  }
};

const findTarget = async (targetId) => {
  const target = await Target.findByPk(targetId);
  if (!target) throwHttpError('target_not_found', 404);
  return target;
};

const parseWeiboCommentResponse = (rawData, { target, post }) => ({
  target: serializeTarget(target),
  post: serializePost(post, target),
  total: Number.isFinite(Number(rawData.total_number)) ? Number(rawData.total_number) : null,
  maxId: normalizeMaxId(rawData.max_id),
  maxIdType: normalizeMaxId(rawData.max_id_type),
  comments: rawData.data.map(parseWeiboComment),
});

const parseWeiboComment = (item) => {
  if (!item?.id) throwHttpError('platform_contract_error', 500);
  const user = item.user || {};
  return {
    id: String(item.id),
    text: item.text_raw ? item.text_raw.trim() : stripHtmlTags(item.text || ''),
    createdAt: parseWeiboDate(item.created_at),
    source: stripHtmlTags(item.source || ''),
    likeCount: Number(item.like_counts ?? item.like_count ?? 0) || 0,
    replyCount: Number(item.total_number ?? item.comments_count ?? 0) || 0,
    user: {
      id: user.idstr ? String(user.idstr) : String(user.id || ''),
      name: user.screen_name || user.name || '未知用户',
      avatar: user.avatar_large || user.profile_image_url || '',
      url: user.id ? `https://weibo.com/u/${user.id}` : undefined,
      verified: Boolean(user.verified),
    },
  };
};

const serializeTarget = (target) => ({
  id: target.id,
  platform: target.platform,
  platformTargetId: target.platformTargetId,
  name: target.name,
});

const serializePost = (activity, target) => {
  const raw = activity.rawPayload || {};
  return {
    id: activity.id,
    platformActivityId: activity.platformActivityId,
    text: activity.content,
    pics: raw.pic_infos ? Object.values(raw.pic_infos).map((pic) => pic?.large?.url || pic?.thumbnail?.url).filter(Boolean) : [],
    videoUrl: raw.page_info?.media_info?.stream_url || raw.page_info?.media_info?.mp4_720p_mp4 || null,
    source: raw.source || null,
    publishedAt: activity.publishedAt,
    commentCount: Number(raw.comments_count ?? raw.commentsCount ?? 0) || 0,
    repostCount: Number(raw.reposts_count ?? raw.repostsCount ?? 0) || 0,
    likeCount: Number(raw.attitudes_count ?? raw.likesCount ?? 0) || 0,
    url: activity.sourceUrl || `https://weibo.com/${target?.platformTargetId || raw.user?.id || ''}/${activity.platformActivityId}`,
  };
};

const normalizePage = (value) => {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, 100);
};

const normalizePageSize = (value) => {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, 30);
};

const normalizeMaxId = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const stripHtmlTags = (value) => String(value || '').replace(/<[^>]+>/g, '').trim();

const parseWeiboDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
