(() => {
  injectNetworkHook();
  setupNetworkCapture();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'MPSS_CLEAR_CAPTURE') {
      globalThis.MpssNetworkCapture?.clear?.();
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type !== 'MPSS_SCRAPE_PAGE') return false;

    try {
      const adapter = selectAdapter();
      sendResponse({
        ok: true,
        ...adapter.scrapePage({ limit: message.limit }),
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.message || 'scrape_failed',
      });
    }
    return true;
  });

  function selectAdapter() {
    const adapters = [globalThis.MpssDouyinAdapter, globalThis.MpssXiaohongshuAdapter, globalThis.MpssWeiboAdapter].filter(Boolean);
    return adapters.find((adapter) => adapter.canHandle?.()) || globalThis.MpssFallbackAdapter;
  }

  function injectNetworkHook() {
    if (!/douyin\.com/.test(location.hostname)) return;
    if (document.documentElement?.dataset.mpssNetworkInjected) return;
    if (document.documentElement) {
      document.documentElement.dataset.mpssNetworkInjected = 'true';
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-network.js');
    script.onload = () => script.remove();
    const target = document.documentElement || document.head || document.body;
    if (!target) {
      document.addEventListener('DOMContentLoaded', injectNetworkHook, { once: true });
      return;
    }
    target.appendChild(script);
  }

  function setupNetworkCapture() {
    const maxEntries = 200;
    const entries = [];

    globalThis.MpssNetworkCapture = {
      getEntries: () => [...entries],
      clear: () => {
        entries.length = 0;
      },
    };

    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'MPSS_NETWORK_RESPONSE') return;
      const entry = event.data.payload;
      if (!entry?.url || !entry.body) return;
      entries.push({
        ...entry,
        pageUrl: location.href,
      });
      if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
    });
  }
})();
