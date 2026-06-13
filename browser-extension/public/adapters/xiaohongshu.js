(() => {
  const { absoluteUrl, cleanText, dedupeItems, firstUsefulLine, normalizeMetric } = globalThis.MpssAdapterUtils;

  globalThis.MpssXiaohongshuAdapter = {
    canHandle: () => /xiaohongshu\.com/.test(location.hostname),
    scrapePage,
  };

  function scrapePage({ limit } = {}) {
    const pageType = detectPageType();
    const preciseItems = pageType === 'note_detail' ? scrapeNoteDetail() : scrapeSearchResults();
    const fallback = globalThis.MpssFallbackAdapter.scrapePage({ limit: 100 });
    const allItems = preciseItems.length ? preciseItems : fallback.items;
    const normalizedLimit = normalizeLimit(limit);

    return {
      ...fallback,
      source: 'xiaohongshu',
      pageType,
      loadedCount: allItems.length,
      selectedCount: Math.min(allItems.length, normalizedLimit),
      items: allItems.slice(0, normalizedLimit),
    };
  }

  function detectPageType() {
    if (document.querySelector('.interaction-container, .comments-container, .note-content #detail-title')) return 'note_detail';
    if (document.querySelector('.feeds-container .note-item, .note-item')) return 'search_results';
    if (/\/explore\//.test(location.pathname)) return 'note_detail';
    return 'search_results';
  }

  function scrapeSearchResults() {
    const cards = [...document.querySelectorAll('.feeds-container .note-item, .note-item')];
    const items = cards
      .map((card) => {
        const titleLink = card.querySelector('a.title[href], a[href*="/search_result/"], a[href*="/explore/"]');
        const authorLink = card.querySelector('a.author[href], a[href*="/user/profile/"]');
        const title = cleanText(card.querySelector('.title')?.innerText) || firstUsefulLine(card.innerText);
        const author = cleanText(card.querySelector('.author .name, .name')?.innerText || authorLink?.innerText);
        const timeText = cleanText(card.querySelector('.author .time, .time')?.innerText);
        const likeCount = normalizeMetric(cleanText(card.querySelector('.like-wrapper .count, .count')?.innerText));
        const image = card.querySelector('img[data-xhs-img], img');

        if (!title) return null;
        return {
          type: 'note',
          title,
          text: [title, timeText ? `时间：${timeText}` : ''].filter(Boolean).join('\n'),
          author,
          url: absoluteUrl(titleLink?.getAttribute('href')),
          imageUrl: image?.currentSrc || image?.src || '',
          likeCount,
          commentCount: 0,
          repostCount: 0,
          collectCount: 0,
        };
      })
      .filter(Boolean);

    return dedupeItems(items);
  }

  function scrapeNoteDetail() {
    const items = [];
    const container = document.querySelector('.interaction-container') || document;
    const content = container.querySelector('.note-content') || document.querySelector('.note-content');
    const title = cleanText(content?.querySelector('#detail-title, .title')?.innerText);
    const desc = cleanText(content?.querySelector('#detail-desc, .desc')?.innerText);
    const author =
      cleanText(document.querySelector('.username')?.innerText) ||
      cleanText(document.querySelector('a[href*="/user/profile/"]')?.innerText);
    const dateText = cleanText(content?.querySelector('.bottom-container .date, .date')?.innerText);
    const likeCount = normalizeMetric(cleanText(container.querySelector('.like-wrapper .count')?.innerText));
    const commentCount = normalizeMetric(cleanText(container.querySelector('.chat-wrapper .count')?.innerText));

    if (title || desc) {
      items.push({
        type: 'post',
        title: title || firstUsefulLine(desc),
        text: [title, desc, dateText ? `时间：${dateText}` : ''].filter(Boolean).join('\n'),
        author,
        url: location.href,
        likeCount,
        commentCount,
        repostCount: 0,
        collectCount: 0,
      });
    }

    const commentGroups = [...document.querySelectorAll('.comments-container .parent-comment, .list-container .parent-comment')];
    for (const group of commentGroups) {
      const parentNode = group.querySelector(':scope > .comment-item');
      const parentComment = parentNode ? parseComment(parentNode) : null;
      if (parentComment) items.push(parentComment);

      const replyNodes = [...group.querySelectorAll('.reply-container .comment-item-sub')];
      for (const replyNode of replyNodes) {
        const reply = parseComment(replyNode, parentComment);
        if (reply) items.push(reply);
      }
    }

    return dedupeItems(items);
  }

  function parseComment(node, parentComment = null) {
    const author = cleanText(node.querySelector('.author .name, a.name')?.innerText);
    const contentRoot = node.querySelector('.content');
    const rawContent = cleanText(contentRoot?.innerText);
    const noteText = readNoteText(node.querySelector('.content .note-text'));
    const date = cleanText(node.querySelector('.info .date')?.innerText);
    const likeText = cleanText(node.querySelector('.interactions .like .count, .like-wrapper .count')?.innerText);
    const replyText = cleanText(node.querySelector('.reply .count')?.innerText);
    const id = node.id || '';
    const isReply = node.classList.contains('comment-item-sub');
    const explicitReplyAuthor = isReply ? readExplicitReplyAuthor(contentRoot, rawContent) : '';
    const content = noteText || stripReplyPrefix(rawContent, explicitReplyAuthor);

    if (!content || isExpansionText(content)) return null;
    return {
      type: isReply ? 'reply' : 'comment',
      platformCommentId: id,
      parentCommentId: parentComment?.platformCommentId || '',
      parentCommentAuthor: parentComment?.author || '',
      parentCommentText: parentComment?.text ? stripTimeLine(parentComment.text) : '',
      replyToCommentId: '',
      replyToCommentAuthor: explicitReplyAuthor,
      replyToCommentText: '',
      title: author ? `${author} 的评论` : '评论',
      text: [content, date ? `时间：${date}` : ''].filter(Boolean).join('\n'),
      author,
      url: id ? `${location.href.split('#')[0]}#${id}` : location.href,
      likeCount: normalizeMetric(likeText),
      commentCount: normalizeMetric(replyText),
      repostCount: 0,
      collectCount: 0,
    };
  }

  function readNoteText(node) {
    if (!node) return '';
    return cleanText([...node.querySelectorAll('span')].map((span) => span.textContent).join('')) || cleanText(node.textContent);
  }

  function readExplicitReplyAuthor(contentRoot, rawContent) {
    const linkText = cleanText(contentRoot?.querySelector('a[href*="/user/profile/"], a.name')?.innerText);
    if (linkText) return linkText.replace(/^回复\s*/, '').replace(/[:：]$/, '').trim();

    const match = cleanText(rawContent).match(/^回复\s*([^:：\n]+)\s*[:：]/);
    return cleanText(match?.[1]);
  }

  function stripReplyPrefix(text, replyAuthor) {
    if (!replyAuthor) return cleanText(text);
    return cleanText(text).replace(new RegExp(`^回复\\s*${escapeRegExp(replyAuthor)}\\s*[:：]\\s*`), '');
  }

  function stripTimeLine(text) {
    return String(text || '')
      .split('\n')
      .filter((line) => !/^时间[:：]/.test(line.trim()))
      .join('\n')
      .trim();
  }

  function isExpansionText(text) {
    const normalized = cleanText(text).replace(/\s+/g, '');
    return /^展开\d*条?回复$/.test(normalized) || /^共\d+条回复$/.test(normalized) || normalized === '查看更多回复';
  }

  function normalizeLimit(value) {
    const parsed = Number(value || 30);
    if (!Number.isInteger(parsed) || parsed <= 0) return 30;
    return Math.min(parsed, 100);
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
})();
