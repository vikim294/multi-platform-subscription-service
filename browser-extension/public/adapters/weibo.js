(() => {
  const { absoluteUrl, cleanText, dedupeItems, firstUsefulLine, normalizeMetric } = globalThis.MpssAdapterUtils;

  globalThis.MpssWeiboAdapter = {
    canHandle: () => /(^|\.)weibo\.com$/.test(location.hostname),
    scrapePage,
  };

  function scrapePage({ limit } = {}) {
    const pageType = detectPageType();
    const preciseItems = pageType === 'post_detail' ? scrapePostDetail() : scrapeSearchResults();
    const fallback = globalThis.MpssFallbackAdapter.scrapePage({ limit: 100 });
    const allItems = preciseItems.length ? preciseItems : fallback.items;
    const normalizedLimit = normalizeLimit(limit);

    return {
      ...fallback,
      source: 'weibo',
      pageType,
      loadedCount: allItems.length,
      selectedCount: Math.min(allItems.length, normalizedLimit),
      items: allItems.slice(0, normalizedLimit),
    };
  }

  function detectPageType() {
    if (document.querySelector('[action-type="feed_list_item"], .card-wrap[mid]')) return 'search_results';
    if (document.querySelector('article .wbpro-feed-content, article .wbpro-feed-ogText')) return 'post_detail';
    if (document.querySelector('[node-type="feed_list_commentList"], .card-review[comment_id], [node-type="comment_list"], [action-type="comment_item"]')) {
      return 'post_detail';
    }
    return /\/weibo/.test(location.pathname) ? 'search_results' : 'post_detail';
  }

  function scrapeSearchResults() {
    const cards = [...document.querySelectorAll('[action-type="feed_list_item"], .card-wrap[mid]')];
    const items = [];

    for (const card of cards) {
      const post = parsePostCard(card);
      if (!post) continue;
      items.push(post);

      for (const comment of parseCardComments(card, post)) {
        items.push(comment);
      }
    }

    return dedupeItems(items);
  }

  function scrapePostDetail() {
    const items = [];
    const post = parseDetailPost();
    if (post) items.push(post);

    const modernComments = parseModernDetailComments(post || {});
    if (modernComments.length) {
      items.push(...modernComments);
    } else {
      const commentNodes = findCommentNodes(document);
      for (const node of commentNodes) {
        const comment = parseCommentNode(node, post || {});
        if (comment) items.push(comment);
      }
    }

    return dedupeItems(items);
  }

  function parsePostCard(card) {
    const platformPostId = cleanText(card.getAttribute('mid')) || readMidFromCard(card);
    const authorLink = card.querySelector('.info .name, a.name, a[nick-name]');
    const author = cleanText(authorLink?.getAttribute('nick-name') || authorLink?.innerText);
    const contentNode = card.querySelector('[node-type="feed_list_content"], .txt');
    const text = cleanText(contentNode?.innerText);
    const timeLink = card.querySelector('.from a[href*="weibo.com"]');
    const timeText = cleanText(timeLink?.innerText);
    const url = absoluteUrl(timeLink?.getAttribute('href')) || buildPostUrl(authorLink, platformPostId);
    const image = card.querySelector('[node-type="feed_list_media_prev"] img, .media img');
    const metrics = readPostMetrics(card);

    if (!text && !platformPostId) return null;
    return {
      type: 'post',
      platformPostId,
      title: firstUsefulLine(text) || `${author || '微博用户'} 的微博`,
      text: [text, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
      author,
      url,
      imageUrl: image?.currentSrc || image?.src || '',
      repostCount: metrics.repostCount,
      commentCount: metrics.commentCount,
      likeCount: metrics.likeCount,
      collectCount: 0,
    };
  }

  function parseDetailPost() {
    const card = document.querySelector('[action-type="feed_list_item"], .card-wrap[mid]');
    if (card) return parsePostCard(card);

    const modernArticle = document.querySelector('article .wbpro-feed-content, article .wbpro-feed-ogText')?.closest('article');
    if (modernArticle) return parseModernDetailPost(modernArticle);

    const textNode = document.querySelector('[node-type="feed_list_content"], article .wbpro-feed-content, main');
    const text = cleanText(textNode?.innerText || document.title);
    if (!text) return null;
    return {
      type: 'post',
      platformPostId: readMidFromUrl(),
      title: firstUsefulLine(text) || document.title,
      text,
      author: cleanText(document.querySelector('a.name, a[nick-name]')?.innerText),
      url: location.href,
      repostCount: 0,
      commentCount: document.querySelectorAll('[action-type="comment_item"], [node-type="comment_list"] [mid]').length,
      likeCount: 0,
      collectCount: 0,
    };
  }

  function parseModernDetailPost(article) {
    const authorLink = article.querySelector('header a[usercard], header a[href*="/u/"], header a[href*="weibo.com/u/"]');
    const author = cleanText(
      authorLink?.querySelector('span[title]')?.getAttribute('title') ||
        authorLink?.getAttribute('aria-label') ||
        authorLink?.innerText,
    );
    const uid = cleanText(authorLink?.getAttribute('usercard')) || readUidFromHref(authorLink?.getAttribute('href'));
    const timeLink = article.querySelector('a[class*="_time_"], a[href*="weibo.com"][href]:not([href*="/u/"])');
    const timeText = cleanText(timeLink?.innerText);
    const postUrl = absoluteUrl(timeLink?.getAttribute('href')) || location.href;
    const platformPostId = readMidFromUrl();
    const contentNode = article.querySelector('.wbpro-feed-ogText [class*="_wbtext_"], .wbpro-feed-content [class*="_wbtext_"], .wbpro-feed-ogText, .wbpro-feed-content');
    const text = readWeiboContentText(contentNode);
    const metrics = readModernPostMetrics(article);

    if (!text && !platformPostId) return null;
    return {
      type: 'post',
      platformPostId,
      title: firstUsefulLine(text) || `${author || '微博用户'} 的微博`,
      text: [text, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
      author,
      url: postUrl || (uid && platformPostId ? `https://weibo.com/${uid}/${platformPostId}` : location.href),
      imageUrl: '',
      repostCount: metrics.repostCount,
      commentCount: metrics.commentCount,
      likeCount: metrics.likeCount,
      collectCount: 0,
    };
  }

  function parseCardComments(card, post) {
    const repeat = card.querySelector('[node-type="feed_list_repeat"]') || card;
    return findCommentNodes(repeat)
      .map((node) => parseCommentNode(node, post))
      .filter(Boolean);
  }

  function parseModernDetailComments(post) {
    const views = [...document.querySelectorAll('#scroller .vue-recycle-scroller__item-view .wbpro-list, .vue-recycle-scroller__item-view .wbpro-list')];
    const comments = [];

    for (const [viewIndex, view] of views.entries()) {
      const scrollerItem = view.closest('.wbpro-scroller-item');
      const commentIndex = cleanText(scrollerItem?.getAttribute('data-index')) || String(viewIndex);
      const rootNode = view.querySelector(':scope > .item1');
      const rootComment = parseModernDetailCommentBlock(rootNode, post, {
        platformCommentId: buildModernCommentId(post, commentIndex, 'root'),
      });
      if (!rootComment) continue;
      comments.push(rootComment);

      const replyNodes = [...view.querySelectorAll(':scope > .item1 .list2 .item2, :scope .list2 .item2')];
      for (const [replyIndex, replyNode] of replyNodes.entries()) {
        const reply = parseModernDetailCommentBlock(replyNode, post, {
          platformCommentId: buildModernCommentId(post, commentIndex, `reply-${replyIndex}`),
          parentComment: rootComment,
        });
        if (reply) comments.push(reply);
      }
    }

    return comments;
  }

  function parseModernDetailCommentBlock(node, post, options = {}) {
    if (!node) return null;
    const textNode = node.querySelector('.text');
    const authorLink =
      textNode?.querySelector('a[usercard][href^="/u/"], a[usercard][href*="weibo.com/u/"]') ||
      node.querySelector('a[usercard][href^="/u/"], a[usercard][href*="weibo.com/u/"]');
    const author = cleanText(authorLink?.innerText || authorLink?.getAttribute('aria-label'));
    const text = cleanupCommentText(readModernDetailCommentText(textNode, author), author);
    const infoText = cleanText(node.querySelector('.info > div:first-child, .info div')?.innerText);
    const likeText = cleanText(node.querySelector('.woo-like-count')?.innerText);
    const platformCommentId = options.platformCommentId || cleanText(node.getAttribute('comment_id') || node.id);
    if (!text || text === author || isReplyExpansionText(text)) return null;

    const parentComment = options.parentComment;
    return {
      type: 'comment',
      platformPostId: post.platformPostId || '',
      platformCommentId,
      parentPlatformPostId: post.platformPostId || '',
      parentTitle: post.title || '',
      parentAuthor: post.author || '',
      parentUrl: post.url || location.href,
      parentCommentId: parentComment?.platformCommentId || '',
      parentCommentAuthor: parentComment?.author || '',
      parentCommentText: parentComment ? stripTimeLine(parentComment.text) : '',
      title: author ? `${author} 的评论` : '评论',
      text: [text, infoText ? `时间：${infoText}` : ''].filter(Boolean).join('\n'),
      author,
      url: buildCommentUrl(post.url || location.href, platformCommentId),
      likeCount: normalizeMetric(likeText),
      commentCount: 0,
      collectCount: 0,
    };
  }

  function readModernDetailCommentText(node, author) {
    if (!node) return '';
    const clone = node.cloneNode(true);
    const authorLink = clone.querySelector('a[usercard][href^="/u/"], a[usercard][href*="weibo.com/u/"]');
    authorLink?.remove();
    clone.querySelectorAll('a[class*="_none_"], span[class*="_fans_"], span[class*="_colon_"], .woo-icon-wrap, svg, i').forEach((item) => item.remove());
    clone.querySelectorAll('img').forEach((img) => {
      const alt = cleanText(img.getAttribute('alt') || img.getAttribute('title'));
      img.replaceWith(document.createTextNode(alt));
    });
    return cleanText(clone.innerText || clone.textContent)
      .replace(new RegExp(`^${escapeRegExp(author)}\\s*[:：]?\\s*`), '')
      .replace(/^[:：]\s*/, '')
      .trim();
  }

  function findCommentNodes(root) {
    const selectors = [
      '[node-type="feed_list_commentList"] .card-review[comment_id]',
      '[node-type="commentList"] .card-review[comment_id]',
      '.card-review[comment_id]',
      '[action-type="comment_item"]',
      '[node-type="comment_list"] [mid]',
      '[node-type="feed_list_commentList"] [mid]',
      '.list_li[mid]',
      '.comment-item',
    ];
    return [...root.querySelectorAll(selectors.join(', '))].filter((node) => {
      const text = cleanText(node.innerText);
      return text.length >= 2 && text.length <= 1200 && !isReplyExpansionText(text);
    });
  }

  function parseCommentNode(node, post) {
    const authorLink = node.querySelector('a.name, a[usercard], a[href*="/u/"], a[href*="weibo.com"]');
    const author =
      cleanText(authorLink?.getAttribute('nick-name') || authorLink?.innerText) ||
      firstUsefulLine(cleanText(node.innerText)).replace(/[:：].*$/, '');
    const contentNode = node.querySelector('.txt, [node-type="text"], .WB_text');
    const rawText = cleanCommentTextNode(contentNode, author) || cleanText(node.innerText);
    const text = cleanupCommentText(rawText, author);
    const timeText = cleanText(node.querySelector('.fun .from, .from, .time, [node-type="feed_list_item_date"]')?.innerText);
    const likeText = cleanText(node.querySelector('[action-type="comment_object_like"] .woo-like-count, [action-type*="like"] .woo-like-count, .like em')?.innerText);
    const platformCommentId = cleanText(node.getAttribute('mid') || node.getAttribute('comment_id') || node.id);
    if (!text || text === author || isReplyExpansionText(text)) return null;

    return {
      type: 'comment',
      platformPostId: post.platformPostId || '',
      platformCommentId,
      parentPlatformPostId: post.platformPostId || '',
      parentTitle: post.title || '',
      parentAuthor: post.author || '',
      parentUrl: post.url || '',
      title: author ? `${author} 的评论` : '评论',
      text: [text, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
      author,
      url: buildCommentUrl(post.url || location.href, platformCommentId),
      likeCount: normalizeMetric(likeText),
      commentCount: 0,
      collectCount: 0,
    };
  }

  function cleanCommentTextNode(node, author) {
    if (!node) return '';
    const clone = node.cloneNode(true);
    clone.querySelector('a.name')?.remove();
    clone.querySelectorAll('.user_vip_icon_container, img, svg, i').forEach((item) => item.remove());
    return cleanText(clone.innerText || clone.textContent)
      .replace(new RegExp(`^${escapeRegExp(author)}\\s*[:：]?\\s*`), '')
      .replace(/^[:：]\s*/, '')
      .trim();
  }

  function buildCommentUrl(url, platformCommentId) {
    const baseUrl = String(url || location.href).split('#')[0];
    return platformCommentId ? `${baseUrl}#comment-${platformCommentId}` : baseUrl;
  }

  function readPostMetrics(card) {
    const actionLinks = [...card.querySelectorAll('.card-act li a, [action-type^="feed_list_"]')];
    return {
      repostCount: normalizeMetric(cleanText(actionLinks.find((link) => link.getAttribute('action-type') === 'feed_list_forward')?.innerText)),
      commentCount: normalizeMetric(cleanText(actionLinks.find((link) => link.getAttribute('action-type') === 'feed_list_comment')?.innerText)),
      likeCount:
        normalizeMetric(cleanText(card.querySelector('.woo-like-count')?.innerText)) ||
        normalizeMetric(cleanText(actionLinks.find((link) => link.getAttribute('action-type') === 'feed_list_like')?.innerText)),
    };
  }

  function readModernPostMetrics(article) {
    const footer = article.querySelector('footer') || article;
    const byIconTitle = (title) => {
      const icon = footer.querySelector(`i[title="${title}"]`);
      const item = icon?.closest('[class*="_item_"], [class*="_wrap_"]') || icon?.parentElement;
      return normalizeMetric(cleanText(item?.querySelector('[class*="_num_"], .woo-like-count')?.innerText || item?.innerText));
    };
    return {
      repostCount: byIconTitle('转发'),
      commentCount: byIconTitle('评论'),
      likeCount: normalizeMetric(cleanText(footer.querySelector('.woo-like-count')?.innerText)) || byIconTitle('赞'),
    };
  }

  function readWeiboContentText(node) {
    if (!node) return '';
    const clone = node.cloneNode(true);
    clone.querySelectorAll('script, style, .woo-picture-main, .picture, img').forEach((item) => {
      if (item.tagName === 'IMG') {
        const alt = cleanText(item.getAttribute('alt') || item.getAttribute('title'));
        item.replaceWith(document.createTextNode(alt));
      } else {
        item.remove();
      }
    });
    return cleanText(clone.innerText || clone.textContent);
  }

  function cleanupCommentText(text, author) {
    return cleanText(text)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line !== author)
      .filter((line) => !/^(回复|赞|转发|评论|收藏|\d+)$/.test(line))
      .join('\n')
      .replace(new RegExp(`^${escapeRegExp(author)}\\s*[:：]?\\s*`), '')
      .trim();
  }

  function isReplyExpansionText(text) {
    const normalized = cleanText(text).replace(/\s+/g, '');
    return /^共\d+条回复$/.test(normalized) || /^展开\d*条?回复$/.test(normalized) || normalized === '查看更多回复';
  }

  function stripTimeLine(text) {
    return String(text || '')
      .split('\n')
      .filter((line) => !/^时间[:：]/.test(line.trim()))
      .join('\n')
      .trim();
  }

  function readMidFromCard(card) {
    const actionData = [...card.querySelectorAll('[action-data]')]
      .map((node) => node.getAttribute('action-data') || '')
      .find((value) => /(^|&)mid=/.test(value));
    return new URLSearchParams(actionData).get('mid') || '';
  }

  function readMidFromUrl() {
    const match = location.pathname.match(/\/([A-Za-z0-9]+)$/);
    return match?.[1] || '';
  }

  function buildPostUrl(authorLink, platformPostId) {
    const href = authorLink?.getAttribute('href') || '';
    const match = href.match(/weibo\.com\/(?:u\/)?(\d+)|\/\/weibo\.com\/(\d+)/);
    const uid = match?.[1] || match?.[2] || '';
    if (uid && platformPostId) return `https://weibo.com/${uid}/${platformPostId}`;
    return '';
  }

  function readUidFromHref(href) {
    const match = String(href || '').match(/weibo\.com\/(?:u\/)?(\d+)|\/\/weibo\.com\/(?:u\/)?(\d+)|\/u\/(\d+)/);
    return match?.[1] || match?.[2] || match?.[3] || '';
  }

  function buildModernCommentId(post, viewIndex, suffix) {
    return [post.platformPostId || readMidFromUrl() || location.pathname, viewIndex, suffix].filter(Boolean).join(':');
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeLimit(value) {
    const parsed = Number(value || 30);
    if (!Number.isInteger(parsed) || parsed <= 0) return 30;
    return Math.min(parsed, 100);
  }
})();
