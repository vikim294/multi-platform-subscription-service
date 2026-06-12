(() => {
  globalThis.MpssAdapterUtils = {
    absoluteUrl,
    cleanText,
    dedupeItems,
    firstUsefulLine,
    normalizeMetric,
    readMetric,
  };

  function cleanText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function absoluteUrl(href) {
    if (!href) return '';
    try {
      return new URL(href, location.origin).href;
    } catch {
      return '';
    }
  }

  function firstUsefulLine(text) {
    return (
      cleanText(text)
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length >= 2 && line.length <= 120) || ''
    );
  }

  function readMetric(text, labels) {
    for (const label of labels) {
      const match = cleanText(text).match(new RegExp(`([0-9.]+)\\s*(万|k|K)?\\s*${escapeRegExp(label)}`));
      if (match) return normalizeMetric(match[1], match[2]);
    }
    return 0;
  }

  function normalizeMetric(value, unit) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return 0;
    if (unit === '万') return Math.round(number * 10000);
    if (unit === 'k' || unit === 'K') return Math.round(number * 1000);
    return Math.round(number);
  }

  function dedupeItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.platformCommentId
        ? `${item.type}:comment:${item.platformCommentId}`
        : item.url || `${item.type}:${item.author}:${item.title}:${item.text}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
})();
