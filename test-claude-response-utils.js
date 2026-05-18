const assert = require('assert');
const claudeResponse = require('./claude-response-utils.js');

const cleanedProject = claudeResponse.cleanClaudeResponseText(`AI Projects
Deliberated on authentic literature choice aligned with candidate's technical profile
Deliberated on authentic literature choice aligned with candidate's technical profile

Built a small AI document assistant that helped organize project notes into clearer summaries.`);

assert.strictEqual(
  cleanedProject,
  'AI Projects\n\nBuilt a small AI document assistant that helped organize project notes into clearer summaries.'
);

const cleanedPriorText = claudeResponse.cleanClaudeResponseText(
  'Old response\nClaude responded:\n\nHello,\n\nNew response',
  'Old response'
);
assert.strictEqual(cleanedPriorText, 'Hello,\n\nNew response');

assert.strictEqual(claudeResponse.isClaudeStatusLine('Deliberated on matching the prompt'), true);
assert.strictEqual(claudeResponse.isClaudeStatusLine('Thought for 8 seconds'), true);
assert.strictEqual(claudeResponse.isClaudeStatusLine('Thinking'), true);
assert.strictEqual(claudeResponse.isClaudeStatusLine('Built an AI project'), false);

console.log('claude-response-utils tests passed');
