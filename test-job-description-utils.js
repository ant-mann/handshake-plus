const assert = require('assert');
const jobDescriptions = require('./job-description-utils.js');

function fakeControl(text, attrs) {
  return {
    tagName: (attrs && attrs.tagName) || 'BUTTON',
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
// Event card "View more" link must NOT be treated as a description expander
// (navigating anchor — clicking it opens a new tab).
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(
    fakeControl('View more', { tagName: 'A', href: '/events?employers=22003', target: '_blank' })
  ),
  false
);
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(
    fakeControl('See more', { tagName: 'A', href: '/events?employers=22003' })
  ),
  false
);
// A real expander anchor without a navigating href is still allowed.
assert.strictEqual(
  jobDescriptions.isLikelyDescriptionExpandControl(
    fakeControl('Show more', { tagName: 'A', href: '#' })
  ),
  true
);
assert.strictEqual(
  jobDescriptions.cleanJobDescriptionText('Job description\n\nFirst paragraph.\n\n...\n\nMore'),
  'First paragraph.'
);

console.log('job-description-utils tests passed');
