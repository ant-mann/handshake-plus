const assert = require('assert');
const tabs = require('./ai-tab-utils.js');

assert.strictEqual(
  tabs.normalizeAiProviderUrl('claude', 'https://claude.ai/chat/abc?x=1#top'),
  'https://claude.ai/chat/abc?x=1#top'
);
assert.strictEqual(
  tabs.normalizeAiProviderUrl('gemini', 'https://gemini.google.com/app/123'),
  'https://gemini.google.com/app/123'
);
assert.strictEqual(tabs.normalizeAiProviderUrl('claude', 'https://example.com/chat'), '');
assert.strictEqual(tabs.normalizeAiProviderUrl('gemini', 'https://claude.ai/chat/abc'), '');
assert.strictEqual(tabs.isSameAiProviderUrl('https://claude.ai/chat/abc', 'https://claude.ai/chat/abc/'), true);
assert.strictEqual(tabs.isSameAiProviderUrl('https://claude.ai/chat/abc#foo', 'https://claude.ai/chat/abc#bar'), true);
assert.strictEqual(tabs.isSameAiProviderUrl('https://claude.ai/chat/abc', 'https://claude.ai/chat/def'), false);

console.log('ai-tab-utils tests passed');
