(() => {
  const { cleanText, dedupeItems, firstUsefulLine } = globalThis.MpssAdapterUtils;

  globalThis.MpssDouyinAdapter = {
    canHandle: () => /douyin\.com/.test(location.hostname),
    scrapePage,
  };

  function scrapePage({ limit } = {}) {
    const normalizedLimit = normalizeLimit(limit);
    const comments = readCapturedCommentsAndReplies();
    const post = comments.length ? readPostInfo(comments) : readPostInfo([]);
    const domItems = comments.length ? [] : readDomComments();
    const items = [...(post ? [post] : []), ...comments, ...domItems];

    return {
      source: 'douyin',
      pageType: 'douyin_post_detail',
      pageUrl: location.href,
      title: post?.title || document.title,
      loadedCount: items.length,
      selectedCount: Math.min(items.length, normalizedLimit),
      items: items.slice(0, normalizedLimit),
    };
  }

  function readCapturedCommentsAndReplies() {
    const entries = globalThis.MpssNetworkCapture?.getEntries?.() || [];
    const currentPostId = readCurrentPostId();
    const comments = [];
    const replies = [];

    for (const entry of entries) {
      if (!isDouyinCommentEntry(entry)) continue;
      const body = entry.body || {};
      if (Number(body.status_code) !== 0 || !Array.isArray(body.comments)) continue;
      if (!isCurrentEntry(entry, body.comments, currentPostId)) continue;

      if (isDouyinReplyList(entry)) {
        for (const reply of body.comments) {
          const item = normalizeReply(reply, entry);
          if (item) replies.push(item);
        }
      } else {
        for (const comment of body.comments) {
          const item = normalizeComment(comment, entry);
          if (item) comments.push(item);
        }
      }
    }

    const parentById = new Map(comments.map((comment) => [comment.platformCommentId, comment]));
    const normalizedReplies = replies.map((reply) => attachParentComment(reply, parentById));
    return dedupeItems(interleaveReplies(comments, normalizedReplies));
  }

  function normalizeComment(comment, entry) {
    const text = cleanText(comment?.text);
    const cid = String(comment?.cid || '');
    if (!text || !cid) return null;

    const author = cleanText(comment?.user?.nickname);
    const timeText = formatTime(comment?.create_time, comment?.ip_label);
    const postId = String(comment?.aweme_id || readQuery(entry.url, 'aweme_id') || '');

    return {
      type: 'comment',
      platformCommentId: cid,
      platformPostId: postId,
      title: author ? `${author} 的评论` : '评论',
      text: [text, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
      author,
      url: postId ? `https://www.douyin.com/video/${postId}` : location.href,
      likeCount: Number(comment?.digg_count || 0),
      commentCount: Number(comment?.reply_comment_total || 0),
      repostCount: 0,
      collectCount: 0,
    };
  }

  function normalizeReply(reply, entry) {
    const text = cleanText(reply?.text);
    const cid = String(reply?.cid || '');
    if (!text || !cid) return null;

    const parentCommentId = readQuery(entry.url, 'comment_id') || String(reply?.reply_id || reply?.reply_to_reply_id || '');
    const author = cleanText(reply?.user?.nickname);
    const timeText = formatTime(reply?.create_time, reply?.ip_label);
    const postId = String(reply?.aweme_id || readQuery(entry.url, 'item_id') || readQuery(entry.url, 'aweme_id') || '');

    return {
      type: 'reply',
      platformCommentId: cid,
      platformPostId: postId,
      parentCommentId,
      parentCommentAuthor: '',
      parentCommentText: '',
      title: author ? `${author} 的回复` : '回复',
      text: [text, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
      author,
      url: postId ? `https://www.douyin.com/video/${postId}#comment-${cid}` : location.href,
      likeCount: Number(reply?.digg_count || 0),
      commentCount: Number(reply?.comment_reply_total || 0),
      repostCount: 0,
      collectCount: 0,
    };
  }

  function attachParentComment(reply, parentById) {
    const parentComment = parentById.get(reply.parentCommentId);
    if (!parentComment) return reply;
    return {
      ...reply,
      parentCommentAuthor: parentComment.author || '',
      parentCommentText: stripTimeLine(parentComment.text),
    };
  }

  function interleaveReplies(comments, replies) {
    const repliesByParentId = new Map();
    for (const reply of replies) {
      if (!reply.parentCommentId) continue;
      const group = repliesByParentId.get(reply.parentCommentId) || [];
      group.push(reply);
      repliesByParentId.set(reply.parentCommentId, group);
    }

    const items = [];
    const usedReplyIds = new Set();
    for (const comment of comments) {
      items.push(comment);
      const childReplies = repliesByParentId.get(comment.platformCommentId) || [];
      for (const reply of childReplies) {
        items.push(reply);
        usedReplyIds.add(reply.platformCommentId);
      }
    }

    for (const reply of replies) {
      if (!usedReplyIds.has(reply.platformCommentId)) {
        items.push(reply);
        usedReplyIds.add(reply.platformCommentId);
      }
    }

    return items;
  }

  function readPostInfo(comments) {
    const root = findVisibleElement('#video-info-wrap, [data-e2e="video-info"]') || document;
    const desc = cleanText(
      root.querySelector('[data-e2e="video-desc"], [class*="video-desc"], .title.cursorPointer, [class*="title"][data-e2e]')?.innerText ||
        document.querySelector('[data-e2e="video-desc"], [class*="video-desc"]')?.innerText,
    );
    const author = cleanText(
      root.querySelector('[data-e2e="feed-video-nickname"], .account-name-text, [data-click-from="title"], a[href*="/user/"]')?.innerText ||
        document.querySelector('[data-e2e="feed-video-nickname"], a[href*="/user/"]')?.innerText,
    );
    const timeText = cleanText(root.querySelector('.video-create-time .time, [class*="video-create-time"] [class*="time"], [class*="create-time"]')?.innerText);
    const postId = comments.find((item) => item.platformPostId)?.platformPostId || readCurrentPostId();
    if (!desc) return null;

    return {
      type: 'post',
      platformPostId: postId,
      title: firstUsefulLine(desc) || '抖音作品',
      text: [desc, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
      author,
      url: postId ? `https://www.douyin.com/video/${postId}` : location.href,
      likeCount: 0,
      commentCount: comments.length,
      repostCount: 0,
      collectCount: 0,
    };
  }

  function readDomComments() {
    const nodes = [...document.querySelectorAll('[class*="comment-item"], [data-e2e*="comment"]')];
    const items = nodes
      .map((node, index) => {
        const text = cleanText(node.innerText);
        if (text.length < 2 || text.length > 800) return null;
        return {
          type: 'comment',
          platformCommentId: cleanText(node.getAttribute('id')) || `dom-${index}`,
          platformPostId: readCurrentPostId(),
          title: firstUsefulLine(text) || '评论',
          text,
          author: '',
          url: location.href,
          likeCount: 0,
          commentCount: 0,
          repostCount: 0,
          collectCount: 0,
        };
      })
      .filter(Boolean);
    return dedupeItems(items);
  }

  function isDouyinCommentEntry(entry) {
    const url = String(entry?.url || '');
    return /douyin\.com\/aweme\/v1\/web\/comment\/list(?:\/reply)?\//.test(url);
  }

  function isDouyinReplyList(entry) {
    return /\/aweme\/v1\/web\/comment\/list\/reply\//.test(String(entry?.url || ''));
  }

  function readQuery(url, key) {
    try {
      return new URL(url).searchParams.get(key) || '';
    } catch {
      return '';
    }
  }

  function readPostIdFromUrl() {
    const match = location.pathname.match(/\/video\/(\d+)/);
    return match?.[1] || '';
  }

  function readCurrentPostId() {
    const node = findVisibleElement('[data-e2e-aweme-id]');
    return cleanText(node?.getAttribute('data-e2e-aweme-id')) || readPostIdFromUrl();
  }

  function isCurrentEntry(entry, comments, currentPostId) {
    if (currentPostId) {
      const entryPostId = readQuery(entry.url, 'aweme_id') || readQuery(entry.url, 'item_id') || String(comments.find((comment) => comment?.aweme_id)?.aweme_id || '');
      return !entryPostId || entryPostId === currentPostId;
    }
    return !entry.pageUrl || normalizeUrl(entry.pageUrl) === normalizeUrl(location.href);
  }

  function normalizeUrl(value) {
    try {
      const url = new URL(value, location.href);
      url.hash = '';
      return url.href;
    } catch {
      return String(value || '').split('#')[0];
    }
  }

  function findVisibleElement(selector) {
    const nodes = [...document.querySelectorAll(selector)];
    return nodes.find(isVisibleElement) || null;
  }

  function isVisibleElement(node) {
    if (!node) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
  }

  function formatTime(value, ipLabel) {
    const seconds = Number(value || 0);
    const date = Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toLocaleString('zh-CN', { hour12: false }) : '';
    return [date, ipLabel ? `来自${ipLabel}` : ''].filter(Boolean).join(' ');
  }

  function stripTimeLine(text) {
    return String(text || '')
      .split('\n')
      .filter((line) => !/^时间[:：]/.test(line.trim()))
      .join('\n')
      .trim();
  }

  function normalizeLimit(value) {
    const parsed = Number(value || 30);
    if (!Number.isInteger(parsed) || parsed <= 0) return 30;
    return Math.min(parsed, 100);
  }
})();
