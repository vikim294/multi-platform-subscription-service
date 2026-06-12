(() => {
  const { absoluteUrl, cleanText, dedupeItems, firstUsefulLine, readMetric } = globalThis.MpssAdapterUtils;

  globalThis.MpssFallbackAdapter = {
    scrapePage,
  };

  function scrapePage({ limit } = {}) {
    const allItems = scrapeGenericCards();
    const normalizedLimit = normalizeLimit(limit);

    return {
      source: detectSource(),
      pageType: detectPageType(),
      pageUrl: location.href,
      title: document.title,
      loadedCount: allItems.length,
      selectedCount: Math.min(allItems.length, normalizedLimit),
      items: allItems.slice(0, normalizedLimit),
    };
  }

  function detectSource() {
    if (/douyin\.com/.test(location.hostname)) return 'douyin';
    if (/xiaohongshu\.com/.test(location.hostname)) return 'xiaohongshu';
    if (/weibo\.com/.test(location.hostname)) return 'weibo';
    return 'unknown';
  }

  function detectPageType() {
    if (/\/video\//.test(location.pathname)) return 'douyin_post_detail';
    if (/\/explore\//.test(location.pathname)) return 'note_detail';
    if (/search|keyword|query|\/weibo/.test(location.href)) return 'search_results';
    if (document.querySelector('[class*="comment"], [id*="comment"]')) return 'post_detail';
    return 'page';
  }

  function scrapeGenericCards() {
    const anchors = [...document.querySelectorAll('a[href*="weibo.com"], a[href*="/explore/"], a[href*="/search_result/"], a[href^="/"]')];
    const items = anchors
      .map((anchor) => {
        const card = closestUsefulCard(anchor);
        const text = cleanText(card?.innerText || anchor.innerText);
        const title = firstUsefulLine(text);
        if (!title && !text) return null;
        return {
          type: 'page',
          title,
          text,
          author: '',
          url: absoluteUrl(anchor.getAttribute('href')),
          likeCount: readMetric(text, ['赞', '点赞']),
          commentCount: readMetric(text, ['评论']),
          repostCount: readMetric(text, ['转发']),
          collectCount: 0,
        };
      })
      .filter(Boolean);

    if (!items.length) {
      const text = cleanText(document.body.innerText).slice(0, 1200);
      if (text) {
        items.push({
          type: 'page',
          title: firstUsefulLine(text) || document.title,
          text,
          author: '',
          url: location.href,
        });
      }
    }

    return dedupeItems(items);
  }

  function closestUsefulCard(anchor) {
    let node = anchor;
    for (let depth = 0; node && depth < 6; depth += 1) {
      const text = cleanText(node.innerText);
      if (text.length > 20 && text.length < 1200) return node;
      node = node.parentElement;
    }
    return anchor;
  }

  function normalizeLimit(value) {
    const parsed = Number(value || 30);
    if (!Number.isInteger(parsed) || parsed <= 0) return 30;
    return Math.min(parsed, 100);
  }
})();
