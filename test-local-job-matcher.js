const assert = require('assert');

global.window = {};
require('./local-job-matcher.js');

const matcher = new window.LocalJobMatcher();

async function assertMatches(jobTitle, roles, expectedRole) {
  const result = await matcher.compareJobTitleToRoles(jobTitle, roles, 0.5);
  assert.strictEqual(result.match, true, `${jobTitle} should match ${roles.join(', ')}`);
  assert.strictEqual(result.bestMatchRole, expectedRole);
  assert.strictEqual(typeof result.similarity, 'number');
  assert.ok(result.similarity >= 0.5, `Expected similarity >= 0.5, got ${result.similarity}`);
}

async function assertDoesNotMatch(jobTitle, roles) {
  const result = await matcher.compareJobTitleToRoles(jobTitle, roles, 0.5);
  assert.strictEqual(result.match, false, `${jobTitle} should not match ${roles.join(', ')}`);
  assert.strictEqual(typeof result.similarity, 'number');
  assert.ok(result.similarity < 0.5, `Expected similarity < 0.5, got ${result.similarity}`);
}

(async () => {
  await assertMatches('SWE Intern', ['Software Engineer'], 'Software Engineer');
  await assertMatches('Marketing Intern', ['Marketing'], 'Marketing');
  await assertMatches('RN', ['Registered Nurse'], 'Registered Nurse');
  await assertMatches('HR Generalist', ['Human Resources'], 'Human Resources');
  await assertMatches('Graphic Design Intern', ['Graphic Designer'], 'Graphic Designer');

  await assertDoesNotMatch('Sales Engineer', ['Software Engineer']);

  const multi = await matcher.compareJobTitleToRoles(
    'Lab Research Assistant',
    ['Marketing', 'Lab Researcher', 'Graphic Designer'],
    0.5
  );
  assert.strictEqual(multi.match, true);
  assert.strictEqual(multi.bestMatchRole, 'Lab Researcher');
  assert.ok(multi.comparisons[1].similarity > multi.comparisons[0].similarity);
  assert.ok(multi.comparisons[1].similarity > multi.comparisons[2].similarity);

  console.log('local job matcher tests passed');
})();
