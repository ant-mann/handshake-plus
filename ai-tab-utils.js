(function (root) {
  const PROVIDER_HOSTS = {
    claude: 'claude.ai',
    gemini: 'gemini.google.com',
  };

  function normalizeAiProviderUrl(provider, rawUrl) {
    if (!rawUrl) return '';
    const expectedHost = PROVIDER_HOSTS[provider];
    if (!expectedHost) return '';

    try {
      const url = new URL(String(rawUrl).trim());
      if (url.protocol !== 'https:' || url.hostname !== expectedHost) {
        return '';
      }
      return url.href;
    } catch (e) {
      return '';
    }
  }

  function canonicalComparableUrl(rawUrl) {
    try {
      const url = new URL(String(rawUrl || '').trim());
      url.hash = '';
      let href = url.href;
      if (href.endsWith('/')) href = href.slice(0, -1);
      return href;
    } catch (e) {
      return '';
    }
  }

  function isSameAiProviderUrl(left, right) {
    const normalizedLeft = canonicalComparableUrl(left);
    const normalizedRight = canonicalComparableUrl(right);
    return !!normalizedLeft && normalizedLeft === normalizedRight;
  }

  const exportsObject = {
    normalizeAiProviderUrl,
    isSameAiProviderUrl,
  };

  root.HandshakePlusAiTabs = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
