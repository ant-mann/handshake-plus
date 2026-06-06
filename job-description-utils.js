(function(root) {
  function getControlText(control) {
    if (!control) return '';
    return [
      control.innerText || control.textContent || '',
      control.getAttribute ? control.getAttribute('aria-label') || '' : '',
      control.getAttribute ? control.getAttribute('title') || '' : ''
    ].join(' ').replace(/\s+/g, ' ').trim();
  }

  // A real "show more" expander is an in-place toggle (a button, or an anchor with
  // no real href). Handshake also renders event cards near the job summary with a
  // "View more" link that navigates (target="_blank" / href to /events) — that text
  // matches the expand heuristic but must NOT be clicked, or it opens a new tab.
  function isNavigationLink(control) {
    if (!control || !control.getAttribute) return false;
    if (String(control.getAttribute('target') || '').toLowerCase() === '_blank') return true;
    if (String(control.tagName || '').toUpperCase() === 'A') {
      const href = String(control.getAttribute('href') || '').trim();
      if (href && href !== '#' && !/^javascript:/i.test(href)) return true;
    }
    return false;
  }

  function isLikelyDescriptionExpandControl(control) {
    const expanded = control && control.getAttribute && control.getAttribute('aria-expanded');
    if (String(expanded).toLowerCase() === 'true') return false;
    if (isNavigationLink(control)) return false;

    const text = getControlText(control).toLowerCase();
    if (!text) return false;
    if (/\b(show|read|see|view)\s+less\b/.test(text)) return false;
    if (/^learn\s+more\b/.test(text)) return false;

    return (
      text === 'more' ||
      /\b(show|read|see|view)\s+more\b/.test(text) ||
      /\bmore\s+(details|description|about|responsibilities|qualifications)\b/.test(text)
    );
  }

  function cleanJobDescriptionText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.trimEnd())
      .filter(line => {
        const trimmed = line.trim();
        return (
          !/^job description$/i.test(trimmed) &&
          !/^summary$/i.test(trimmed) &&
          !/^\.\.\.$/.test(trimmed) &&
          !/^more$/i.test(trimmed) &&
          !/^\s*(show|read|see|view)\s+more\s*$/i.test(trimmed)
        );
      })
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  const exportsObject = {
    cleanJobDescriptionText,
    isLikelyDescriptionExpandControl,
  };

  root.HandshakePlusJobDescriptions = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
