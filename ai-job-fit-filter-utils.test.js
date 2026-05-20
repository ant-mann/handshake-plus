const assert = require('node:assert/strict');
const test = require('node:test');

const {
  parseJobFitDecisions,
  normalizeJobFitDecisions,
} = require('./ai-job-fit-filter-utils.js');

test('parses fenced AI job-fit JSON and defaults missing jobs to skip', () => {
  const raw = `Here you go:
\`\`\`json
{
  "decisions": [
    { "jobId": "101", "apply": true },
    { "jobId": "202", "apply": false, "reason": "hardware role" }
  ]
}
\`\`\``;

  const decisions = parseJobFitDecisions(raw, ['101', '202', '303']);

  assert.deepEqual(decisions, {
    101: { apply: true, reason: '' },
    202: { apply: false, reason: 'hardware role' },
    303: { apply: false, reason: 'No explicit AI approval' },
  });
});

test('treats malformed AI job-fit output as all skipped', () => {
  const decisions = parseJobFitDecisions('not json', ['101', '202']);

  assert.deepEqual(decisions, {
    101: { apply: false, reason: 'AI filter response could not be parsed' },
    202: { apply: false, reason: 'AI filter response could not be parsed' },
  });
});

test('normalizes duplicate and long AI job-fit reasons conservatively', () => {
  const decisions = normalizeJobFitDecisions({
    decisions: [
      { jobId: 101, apply: true, reason: 'yes' },
      { jobId: '101', apply: false, reason: 'later duplicate should not win' },
      { jobId: '202', apply: 'true' },
      { jobId: '303', apply: false, reason: 'this reason is intentionally way too long for the tiny skipped-job note' },
    ],
  }, ['101', '202', '303']);

  assert.equal(decisions['101'].apply, true);
  assert.deepEqual(decisions['202'], { apply: false, reason: 'No explicit AI approval' });
  assert.deepEqual(decisions['303'], { apply: false, reason: 'this reason is intentionally way too' });
});
