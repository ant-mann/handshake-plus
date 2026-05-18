const assert = require('assert');
const prompts = require('./ai-prompt-utils.js');

const original = {
  instructions: 'Return strict JSON.',
  messages: [{ role: 'user', content: 'Answer the question.' }],
};

const composed = prompts.applyCustomAiInstructions(original, 'Prefer concise, direct language.');

assert.strictEqual(original.instructions, 'Return strict JSON.');
assert.match(composed.instructions, /Return strict JSON/);
assert.match(composed.instructions, /User custom AI instructions/);
assert.match(composed.instructions, /Prefer concise, direct language/);
assert.match(composed.instructions, /Do not override required output formats/);
assert.deepStrictEqual(composed.messages, original.messages);
assert.notStrictEqual(composed, original);

const withoutCustom = prompts.applyCustomAiInstructions(original, '   ');
assert.deepStrictEqual(withoutCustom, original);

const noInstructions = prompts.applyCustomAiInstructions({ messages: [] }, 'Use my preferred cover letter style.');
assert.match(noInstructions.instructions, /Use my preferred cover letter style/);

console.log('ai-prompt-utils tests passed');
