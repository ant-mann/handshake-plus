(function (root) {
  // Single source of truth for the brittle DOM selectors this extension depends
  // on across Handshake, claude.ai, and gemini.google.com. Each resolver tries a
  // fallback chain, logs which strategy matched, and trips a health warning when
  // the whole chain misses — so a third-party UI change surfaces to the user
  // instead of failing silently.

  const log = (root.HandshakePlusLog) || { log() {}, warn() {}, error() {} };

  const WARNING_KEY = 'handshake-plus-selector-warning';

  function flagWarning(surface) {
    log.warn('selectors', 'no match for', surface);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [WARNING_KEY]: { surface, ts: Date.now() } });
      }
    } catch (e) { /* ignore */ }
  }

  function clearWarning() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(WARNING_KEY);
      }
    } catch (e) { /* ignore */ }
  }

  // Try each CSS selector in order; return the first match (optionally filtered).
  function firstMatch(doc, selectors, surface, filter) {
    const d = doc || document;
    for (let i = 0; i < selectors.length; i++) {
      const sel = selectors[i];
      let els;
      try { els = d.querySelectorAll(sel); } catch (e) { continue; }
      for (const el of els) {
        if (filter && !filter(el)) continue;
        log.log('selectors', surface, 'matched', sel);
        return el;
      }
    }
    flagWarning(surface);
    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent !== null) return true;
    const cs = (el.ownerDocument || document).defaultView.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  // --- Handshake ---------------------------------------------------------------

  // Accessible title of a dialog: aria-label, else the aria-labelledby target's
  // text, else the first heading inside. Handshake moved the apply-modal title
  // from aria-label to an aria-labelledby <h2>, so resolve from all three.
  function dialogTitle(dialog) {
    let title = dialog.getAttribute('aria-label') || '';
    if (!title.startsWith('Apply to')) {
      const id = dialog.getAttribute('aria-labelledby');
      const el = id ? (dialog.ownerDocument || document).getElementById(id) : null;
      if (el) title = el.textContent.trim();
    }
    if (!title.startsWith('Apply to')) {
      const h = dialog.querySelector('h1, h2, h3');
      if (h) title = h.textContent.trim();
    }
    return title;
  }

  function findApplyModal(doc) {
    const d = doc || document;
    const dialogs = d.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      if (dialog.getAttribute('data-dialog') !== 'true') continue;
      const title = dialogTitle(dialog);
      if (title.startsWith('Apply to') && isVisible(dialog)) {
        log.log('selectors', 'apply-modal matched', title);
        return dialog;
      }
    }
    return null; // caller decides whether a miss is a warning (retry loop)
  }

  function findSubmitButton(modal) {
    const buttons = modal.querySelectorAll('button, input[type="submit"]');
    for (const button of buttons) {
      const text = button.textContent.trim();
      const textLower = text.toLowerCase();
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      if (text === 'Submit Application' || textLower === 'submit application' ||
          textLower.includes('submit') || ariaLabel.includes('submit') ||
          button.type === 'submit') {
        return button;
      }
    }
    flagWarning('handshake-submit-button');
    return null;
  }

  function findCloseButton(modal) {
    return modal.querySelector('button[aria-label="Close"]') ||
      modal.querySelector('[data-hook="modal-close-button"]') ||
      Array.from(modal.querySelectorAll('button')).find(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        return label.includes('close') || label.includes('dismiss') || b.textContent.includes('Cancel');
      }) || null;
  }

  // Choose the in-site Apply button (a real BUTTON labelled exactly "Apply",
  // never "Apply externally" and never an external/app-store link).
  function findApplyButton(doc) {
    const d = doc || document;
    const all = d.querySelectorAll('button, a[role="button"]');
    const candidates = [];
    for (const button of all) {
      const text = button.textContent.trim();
      const ariaLabel = button.getAttribute('aria-label') || '';
      if (text !== 'Apply' && ariaLabel !== 'Apply') continue;
      if (text.toLowerCase().includes('external') || ariaLabel.toLowerCase().includes('external')) continue;
      if (button.tagName === 'A') {
        const href = button.getAttribute('href') || '';
        if (href && (href.startsWith('http') || href.includes('apple.com') || href.includes('play.google'))) continue;
      }
      candidates.push({ element: button, isButton: button.tagName === 'BUTTON' });
    }
    candidates.sort((a, b) => (a.isButton === b.isButton ? 0 : a.isButton ? -1 : 1));
    return candidates.length ? candidates[0].element : null;
  }

  // --- claude.ai ---------------------------------------------------------------

  const claude = {
    composer(doc) {
      return firstMatch(doc, [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"]',
      ], 'claude-composer');
    },
    sendButton(doc) {
      return firstMatch(doc, [
        'button[aria-label="Send message"]',
        'button[aria-label*="Send"]',
        'button[type="submit"]',
      ], 'claude-send-button', el => !el.disabled);
    },
    stopButton(doc) {
      const d = doc || document;
      for (const sel of ['button[aria-label="Stop"]', 'button[aria-label*="Stop"]']) {
        const el = d.querySelector(sel);
        if (el) return el;
      }
      return null; // absence of a stop button is normal (not streaming)
    },
    streamingEls(doc) {
      return (doc || document).querySelectorAll('[data-is-streaming]');
    },
  };

  // --- gemini.google.com -------------------------------------------------------

  const gemini = {
    editor(doc) {
      return firstMatch(doc, ['.ql-editor', 'div[contenteditable="true"]'], 'gemini-editor');
    },
    sendButton(doc) {
      return firstMatch(doc, ['.send-button', 'button[aria-label*="Send"]'], 'gemini-send-button');
    },
    responses(doc) {
      return (doc || document).querySelectorAll('model-response');
    },
  };

  const api = {
    WARNING_KEY,
    flagWarning,
    clearWarning,
    firstMatch,
    isVisible,
    dialogTitle,
    findApplyModal,
    findSubmitButton,
    findCloseButton,
    findApplyButton,
    claude,
    gemini,
  };

  root.HandshakePlusSelectors = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : self);
