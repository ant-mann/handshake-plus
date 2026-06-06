(function (root) {
  // Gated debug logger. Off by default so production runs stay silent.
  //
  // Content-script / page context: enable by setting
  //   localStorage['handshake-plus-debug'] = 'true'
  // Service-worker context (background.js): there is no localStorage, so the
  // worker reads chrome.storage.local['handshake-plus-debug'] and calls
  // HandshakePlusLog.setEnabled(true/false).
  const FLAG_KEY = 'handshake-plus-debug';
  let forced = null; // null = derive from localStorage; true/false = explicit override

  function enabled() {
    if (forced !== null) return forced;
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(FLAG_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setEnabled(value) {
    forced = value === null ? null : !!value;
  }

  function emit(method, category, args) {
    if (!enabled()) return;
    const tag = '[HS+' + (category ? ':' + category : '') + ']';
    try {
      console[method](tag, ...args);
    } catch (e) {
      // logging must never throw
    }
  }

  const api = {
    FLAG_KEY,
    setEnabled,
    isEnabled: enabled,
    log(category, ...args) { emit('log', category, args); },
    warn(category, ...args) { emit('warn', category, args); },
    error(category, ...args) { emit('error', category, args); },
  };

  root.HandshakePlusLog = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : self);
