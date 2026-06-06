// Content script injected into claude.ai — puppeteers the UI on behalf of Handshake Plus.
if (window.__handshakePlusClaudeLoaded) { throw new Error('Handshake Plus claude.js already loaded — skipping re-init'); }
window.__handshakePlusClaudeLoaded = true;

const COMPOSER_SELECTORS = [
  'div[contenteditable="true"].ProseMirror',
  'div[contenteditable="true"][data-placeholder]',
  'div[contenteditable="true"]',
];

const SEND_BUTTON_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label*="Send"]',
  'button[type="submit"]',
];

const STOP_BUTTON_SELECTORS = [
  'button[aria-label="Stop"]',
  'button[aria-label*="Stop"]',
];

const SEND_ACCEPTANCE_TIMEOUT_MS = 8000;
const SEND_ATTEMPTS = 3;

let streamTimer = null;
let streamObserver = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'handshakePlusPing') {
    sendResponse({ ready: true });
    return true;
  }

  if (message.type !== 'handshakePlusPrompt') return;

  // Ack immediately so background.js's tabs.sendMessage resolves.
  sendResponse({ received: true });

  handlePrompt(message.prompt).catch(err => {
    console.error('[Handshake Plus claude.js] ERROR in handlePrompt:', err);
    try {
      chrome.runtime.sendMessage({ type: 'handshakePlusResponse', error: err.message });
    } catch (e) {
      // Extension context invalidated — ignore
    }
  });

  return true;
});

async function handlePrompt(prompt) {
  const composer = findElement(COMPOSER_SELECTORS);
  if (!composer) {
    console.error('[Handshake Plus claude.js] Claude composer not found', describeContenteditableElements());
    try { HandshakePlusSelectors.flagWarning('claude-composer'); } catch (e) {}
    throw new Error('Claude composer not found');
  }

  fillComposer(composer, prompt);

  // ProseMirror needs time to process paste/insert events
  let filledText = '';
  for (let i = 0; i < 10; i++) {
    await sleep(150);
    filledText = composer.textContent || composer.innerText || '';
    if (filledText.trim().length > 0) break;
  }

  if (filledText.trim().length === 0) {
    console.warn('[Handshake Plus claude.js] Composer appears empty after fill attempt; send may fail.');
  }

  const sendBtn = (globalThis.HandshakePlusSelectors && HandshakePlusSelectors.claude && HandshakePlusSelectors.claude.sendButton(document))
    || findElement(SEND_BUTTON_SELECTORS);
  if (!sendBtn) {
    console.error('[Handshake Plus claude.js] Claude send button not found', describeButtons());
    try { HandshakePlusSelectors.flagWarning('claude-send-button'); } catch (e) {}
    throw new Error('Claude send button not found');
  }

  const messagesBefore = countAssistantMessages();
  const streamElsBefore = [...document.querySelectorAll('[data-is-streaming]')];
  const textBefore = streamElsBefore.length ? streamElsBefore[streamElsBefore.length - 1].innerText.trim() : '';

  await submitPromptToClaude(composer, sendBtn, messagesBefore);
  try {
    chrome.runtime.sendMessage({ type: 'handshakePlusAiProgress', provider: 'claude', phase: 'sent' });
  } catch (e) {
    // Extension context invalidated — ignore
  }

  await waitForResponse(messagesBefore, textBefore);
}

function findElement(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function describeContenteditableElements() {
  return Array.from(document.querySelectorAll('[contenteditable]')).map(e => ({
    tagName: e.tagName,
    className: e.className,
    placeholder: e.getAttribute('data-placeholder') || '',
  }));
}

function describeButtons() {
  return Array.from(document.querySelectorAll('button')).map(b => ({
    ariaLabel: b.getAttribute('aria-label') || '',
    type: b.type || '',
    text: b.textContent.trim().slice(0, 30),
  }));
}

async function submitPromptToClaude(composer, sendBtn, messagesBefore) {
  for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt++) {
    if (isButtonDisabled(sendBtn)) {
      await sleep(1000);
      continue;
    }

    sendBtn.click();

    const accepted = await waitForClaudeSendAccepted(composer, messagesBefore, SEND_ACCEPTANCE_TIMEOUT_MS);
    if (accepted) {
      return;
    }

    composer.focus();
    await sleep(500);
  }

  throw new Error('Claude did not accept the prompt; the message may still be sitting in the composer');
}

function isButtonDisabled(button) {
  if (!button) return true;
  return Boolean(
    button.disabled ||
    button.getAttribute('disabled') !== null ||
    button.getAttribute('aria-disabled') === 'true'
  );
}

function hasClaudeAcceptedPrompt(composer, messagesBefore) {
  const composerText = (composer?.textContent || composer?.innerText || '').trim();
  return composerText.length === 0 ||
    isStreaming() ||
    countAssistantMessages() > messagesBefore ||
    document.querySelector('[data-is-streaming]');
}

function waitForClaudeSendAccepted(composer, messagesBefore, timeoutMs) {
  return new Promise(resolve => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (hasClaudeAcceptedPrompt(composer, messagesBefore)) {
        clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, 250);
  });
}

function fillComposer(el, text) {
  el.focus();

  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.addRange(range);
  }

  // Method 1: execCommand (works on some ProseMirror configs)
  let execWorked = false;
  try {
    document.execCommand('selectAll', false, null);
    execWorked = document.execCommand('insertText', false, text);
  } catch (e) {
    console.warn('[Handshake Plus claude.js] execCommand failed:', e.message);
  }

  // Method 2: Clipboard paste simulation — most reliable for ProseMirror
  if (!execWorked || !el.textContent || el.textContent.trim().length === 0) {
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });
      el.dispatchEvent(pasteEvent);
    } catch (e) {
      console.warn('[Handshake Plus claude.js] paste simulation failed:', e.message);
    }
  }

  // Method 3: Set innerHTML with proper paragraph structure for ProseMirror
  if (!el.textContent || el.textContent.trim().length === 0) {
    const lines = text.split('\n');
    const html = lines.map(line => {
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<p>${escaped || '<br>'}</p>`;
    }).join('');
    el.innerHTML = html;
  }

  // Dispatch the full event sequence ProseMirror expects
  el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    inputType: 'insertText',
    data: text,
  }));
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: text,
  }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  // Trigger a keyup so any React/ProseMirror keyboard listeners fire
  el.dispatchEvent(new KeyboardEvent('keyup', {
    bubbles: true,
    key: 'v',
    ctrlKey: true,
  }));
}

function countAssistantMessages() {
  return getAssistantMessages().length;
}

function getAssistantMessages() {
  const candidates = [
    ...document.querySelectorAll('.font-claude-message'),
    ...document.querySelectorAll('[data-testid="bot-message-content"]'),
    ...document.querySelectorAll('[data-is-streaming]'),
  ];
  return [...new Set(candidates)];
}

function isStreaming() {
  return STOP_BUTTON_SELECTORS.some(sel => document.querySelector(sel));
}

function captureResponseText(messagesBefore, textBefore) {
  // [data-is-streaming] is a persistent container (count doesn't change),
  // so we grab its text directly rather than slicing by count.
  const streamEls = [...document.querySelectorAll('[data-is-streaming]')];
  if (streamEls.length) {
    const raw = streamEls[streamEls.length - 1].innerText.trim();
    // If the text hasn't changed since before we sent the prompt, the response
    // hasn't arrived yet — return null so the observer keeps waiting.
    if (raw === textBefore) {
      return null;
    }
    const text = window.HandshakePlusClaudeResponse
      ? window.HandshakePlusClaudeResponse.cleanClaudeResponseText(raw, textBefore)
      : raw.replace(/^Claude responded:\s*/i, '').trim();
    if (text.length > 5) return text;
  }

  // Fallback: class-based selectors from DOM probe
  const fallbacks = [
    ...[...document.querySelectorAll('[class*="response"]')],
    ...[...document.querySelectorAll('[class*="claude"]')],
  ];
  const candidates = fallbacks.map(el => el.innerText.trim()).filter(t => t.length > 10 && t !== textBefore);
  return candidates[0] || null;
}

function waitForResponse(messagesBefore, textBefore) {
  return new Promise((resolve, reject) => {
    let mutationCount = 0;
    let streamingStarted = false;

    const hardTimeout = setTimeout(() => {
      cleanup();
      console.error('[Handshake Plus claude.js] Claude response timed out', {
        mutationCount,
        streamingStarted,
        assistantMessages: countAssistantMessages(),
        streaming: isStreaming(),
      });
      reject(new Error('Claude response timed out after 90s'));
    }, 90000);

    function onStreamSettled() {
      // If Claude is still generating (Stop button visible), keep waiting —
      // this handles pauses during extended thinking before the actual response.
      if (isStreaming()) {
        resetStreamTimer();
        return;
      }
      const text = captureResponseText(messagesBefore, textBefore);
      if (!text) {
        // Response hasn't changed yet — keep waiting.
        return;
      }
      cleanup();
      clearTimeout(hardTimeout);
      try {
        chrome.runtime.sendMessage({ type: 'handshakePlusResponse', text });
      } catch (e) {
        // Extension context invalidated — ignore
      }
      resolve();
    }

    function resetStreamTimer() {
      clearTimeout(streamTimer);
      streamTimer = setTimeout(onStreamSettled, 2000);
    }

    function cleanup() {
      clearTimeout(streamTimer);
      if (streamObserver) { streamObserver.disconnect(); streamObserver = null; }
    }

    streamObserver = new MutationObserver(() => {
      mutationCount++;
      // Only start the settle timer once streaming has actually begun (first DOM mutation).
      // This prevents premature capture if Claude takes a few seconds to start responding.
      if (!streamingStarted) {
        try {
          chrome.runtime.sendMessage({ type: 'handshakePlusAiProgress', provider: 'claude', phase: 'streaming' });
        } catch (e) {
          // Extension context invalidated — ignore
        }
      }
      streamingStarted = true;
      resetStreamTimer();
    });

    streamObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Do NOT call resetStreamTimer() here — wait for the first mutation.
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
