const assert = require('assert');
const f = require('./ai-job-fit-filter-utils.js');

const ids = ['100', '200', '300'];

// Inputs mirror what the extension actually receives: a fenced or object-wrapped
// JSON object (extractJsonText resolves the first {...}, so a bare top-level array
// is intentionally not exercised here).

// Fenced ```json object with a decisions array.
let r = f.parseJobFitDecisions('```json\n{"decisions":[{"jobId":"100","apply":true},{"jobId":"200","apply":false,"reason":"location"}]}\n```', ids);
assert.strictEqual(r['100'].apply, true);
assert.strictEqual(r['100'].reason, ''); // approved => no reason
assert.strictEqual(r['200'].apply, false);
assert.strictEqual(r['200'].reason, 'location');
assert.strictEqual(r['300'].apply, false); // missing => default skip
assert.strictEqual(r['300'].reason, f.DEFAULT_SKIP_REASON);

// Object with a `jobs` key is also accepted.
r = f.parseJobFitDecisions('{"jobs":[{"id":"200","apply":true}]}', ids);
assert.strictEqual(r['200'].apply, true);

// apply must be strictly boolean true.
r = f.parseJobFitDecisions('{"decisions":[{"jobId":"100","apply":"true"},{"jobId":"200","apply":1}]}', ids);
assert.strictEqual(r['100'].apply, false);
assert.strictEqual(r['200'].apply, false);

// Unknown ids ignored; known ones stay skipped.
r = f.parseJobFitDecisions('{"decisions":[{"jobId":"999","apply":true}]}', ids);
assert.strictEqual(r['100'].apply, false);
assert.ok(!('999' in r));

// Malformed JSON => all skipped with parse-error reason.
r = f.parseJobFitDecisions('not json at all', ids);
assert.strictEqual(r['100'].apply, false);
assert.strictEqual(r['100'].reason, f.PARSE_ERROR_REASON);

// Reason truncated to <= 36 chars.
r = f.parseJobFitDecisions('{"decisions":[{"jobId":"100","apply":false,"reason":"' + 'x'.repeat(100) + '"}]}', ids);
assert.ok(r['100'].reason.length <= 36);

// Duplicate ids: first decision wins.
r = f.parseJobFitDecisions('{"decisions":[{"jobId":"100","apply":true},{"jobId":"100","apply":false}]}', ids);
assert.strictEqual(r['100'].apply, true);

console.log('job-fit-filter tests passed');
