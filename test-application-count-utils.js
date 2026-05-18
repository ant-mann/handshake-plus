const assert = require('assert');

process.env.TZ = 'America/Chicago';

const counts = require('./application-count-utils.js');

const localToday = new Date(2026, 4, 17, 12, 0, 0);

assert.strictEqual(counts.getLocalDateKey(localToday), '2026-05-17');
assert.strictEqual(counts.getCreatedAtLocalDateKey('2026-05-18T04:30:00Z'), '2026-05-17');
assert.strictEqual(counts.isCreatedAtOnLocalDate('2026-05-18T04:30:00Z', localToday), true);
assert.strictEqual(counts.isCreatedAtOnLocalDate('2026-05-17T02:00:00Z', localToday), false);

const edges = [
  { node: { createdAt: '2026-05-18T04:30:00Z' } },
  { node: { createdAt: '2026-05-17T15:00:00Z' } },
  { node: { createdAt: '2026-05-17T02:00:00Z' } },
];

assert.strictEqual(counts.countApplicationsForLocalDate(edges, localToday).count, 2);
assert.strictEqual(counts.countApplicationsForLocalDate(edges, localToday).sawOlderApplication, true);

console.log('application-count-utils tests passed');
