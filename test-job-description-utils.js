const assert = require('assert');
const jobDescriptions = require('./job-description-utils.js');

function fakeControl(text, attrs) {
  return {
    textContent: text,
    innerText: text,
    getAttribute(name) {
      return attrs && attrs[name] ? attrs[name] : '';
    },
  };
}

assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('Show more')),
  true
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('More')),
  true
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('Read more about this role')),
  true
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('Learn more about Acme Corp')),
  false
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('', { 'aria-label': 'Show more job description' })),
  true
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('Show less')),
  false
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(fakeControl('Show more', { 'aria-expanded': 'true' })),
  false
);
assert.strictEqual(
  jobDescriptions.cleanJobDescriptionText('Job description\n\nFirst paragraph.\n\n...\n\nMore'),
  'First paragraph.'
);

console.log('job-description-utils tests passed');
