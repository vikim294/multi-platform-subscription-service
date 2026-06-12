(() => {
  if (window.__MPSS_NETWORK_HOOKED__) return;
  window.__MPSS_NETWORK_HOOKED__ = true;

  const EVENT_TYPE = 'MPSS_NETWORK_RESPONSE';
  const MAX_TEXT_LENGTH = 2 * 1024 * 1024;

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async function mpssFetch(input, init) {
      const response = await originalFetch.apply(this, arguments);
      captureFetch(input, init, response);
      return response;
    };
  }

  const OriginalXHR = window.XMLHttpRequest;
  if (OriginalXHR?.prototype) {
    const originalOpen = OriginalXHR.prototype.open;
    const originalSend = OriginalXHR.prototype.send;

    OriginalXHR.prototype.open = function mpssXhrOpen(method, url) {
      this.__mpssRequest = {
        method: method || 'GET',
        url: String(url || ''),
      };
      return originalOpen.apply(this, arguments);
    };

    OriginalXHR.prototype.send = function mpssXhrSend() {
      this.addEventListener('loadend', () => {
        captureXhr(this);
      });
      return originalSend.apply(this, arguments);
    };
  }

  function captureFetch(input, init, response) {
    try {
      const url = typeof input === 'string' ? input : input?.url;
      if (!shouldCapture(url)) return;
      const cloned = response.clone();
      cloned
        .text()
        .then((text) =>
          postCapturedResponse({
            url: absoluteUrl(url),
            method: init?.method || input?.method || 'GET',
            status: response.status,
            contentType: response.headers?.get?.('content-type') || '',
            text,
          }),
        )
        .catch(() => {});
    } catch {
      // Keep host page behavior untouched if capture fails.
    }
  }

  function captureXhr(xhr) {
    try {
      const request = xhr.__mpssRequest || {};
      if (!shouldCapture(request.url)) return;
      if (xhr.responseType && xhr.responseType !== 'text' && xhr.responseType !== 'json') return;
      const text = typeof xhr.responseText === 'string' ? xhr.responseText : JSON.stringify(xhr.response || null);
      postCapturedResponse({
        url: absoluteUrl(request.url),
        method: request.method || 'GET',
        status: xhr.status,
        contentType: xhr.getResponseHeader?.('content-type') || '',
        text,
      });
    } catch {
      // Keep host page behavior untouched if capture fails.
    }
  }

  function shouldCapture(url) {
    const value = String(url || '');
    return /\/aweme\/v1\/web\/comment\/list(?:\/reply)?\//.test(value);
  }

  function postCapturedResponse(payload) {
    if (!payload.text || payload.text.length > MAX_TEXT_LENGTH) return;
    let body = null;
    try {
      body = JSON.parse(payload.text);
    } catch {
      return;
    }
    window.postMessage(
      {
        type: EVENT_TYPE,
        payload: {
          ...payload,
          body,
          capturedAt: Date.now(),
        },
      },
      '*',
    );
  }

  function absoluteUrl(url) {
    try {
      return new URL(url, location.href).href;
    } catch {
      return String(url || '');
    }
  }
})();
