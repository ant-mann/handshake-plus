// Content script injected into gemini.google.com — puppeteers the UI on behalf of Handshake Plus.
if (window.__handshakePlusGeminiLoaded) { throw new Error('Handshake Plus gemini.js already loaded — skipping re-init'); }
window.__handshakePlusGeminiLoaded = true;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'handshakePlusGeminiPing') {
    sendResponse({ ready: true });
    return true;
  }
  if (message.type !== 'handshakePlusGeminiPrompt') return;
  sendResponse({ received: true });
  handlePrompt(message.prompt).catch(err => {
    chrome.runtime.sendMessage({ type: 'handshakePlusGeminiResponse', error: err.message });
  });
  return true;
});

function isGenerating() {
  const btn = document.querySelector('.send-button');
  return btn && btn.classList.contains('stop');
}

async function waitForIdle(timeout = 90000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (!isGenerating()) { clearInterval(id); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(id); reject(new Error('Timed out waiting for Gemini to finish')); }
    }, 500);
  });
}

async function handlePrompt(prompt) {
  await waitForIdle();

  const messagesBefore = document.querySelectorAll('model-response').length;

  const inputArea = (globalThis.HandshakePlusSelectors && HandshakePlusSelectors.gemini && HandshakePlusSelectors.gemini.editor(document))
    || document.querySelector('.ql-editor');
  if (!inputArea) {
    try { HandshakePlusSelectors.flagWarning('gemini-editor'); } catch (e) {}
    throw new Error('Gemini input area (.ql-editor) not found — is gemini.google.com loaded?');
  }

  // Fill composer using paragraph nodes (matches Gemini's Quill editor format)
  inputArea.focus();
  inputArea.innerHTML = '';
  const fragment = document.createDocumentFragment();
  for (const line of prompt.split('\n')) {
    const p = document.createElement('p');
    if (line.length === 0) p.appendChild(document.createElement('br'));
    else p.textContent = line;
    fragment.appendChild(p);
  }
  inputArea.appendChild(fragment);
  inputArea.dispatchEvent(new Event('input', { bubbles: true }));
  inputArea.dispatchEvent(new Event('change', { bubbles: true }));

  await new Promise(r => setTimeout(r, 300));

  const sendBtn = (globalThis.HandshakePlusSelectors && HandshakePlusSelectors.gemini && HandshakePlusSelectors.gemini.sendButton(document))
    || document.querySelector('.send-button');
  if (!sendBtn) {
    try { HandshakePlusSelectors.flagWarning('gemini-send-button'); } catch (e) {}
    throw new Error('Gemini send button (.send-button) not found');
  }
  sendBtn.click();
  chrome.runtime.sendMessage({ type: 'handshakePlusAiProgress', provider: 'gemini', phase: 'sent' });

  // Wait for a new model-response to appear
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (document.querySelectorAll('model-response').length > messagesBefore) {
        chrome.runtime.sendMessage({ type: 'handshakePlusAiProgress', provider: 'gemini', phase: 'streaming' });
        clearInterval(id);
        resolve();
      }
      else if (Date.now() - start > 30000) { clearInterval(id); reject(new Error('Gemini did not start responding within 30s')); }
    }, 500);
  });

  // Wait for streaming to finish
  await waitForIdle();
  await new Promise(r => setTimeout(r, 800)); // grace period for final DOM update

  const responses = document.querySelectorAll('model-response');
  const text = responses[responses.length - 1]?.innerText?.trim() || '';
  if (!text) throw new Error('Gemini returned an empty response');

  chrome.runtime.sendMessage({ type: 'handshakePlusGeminiResponse', text });
}
