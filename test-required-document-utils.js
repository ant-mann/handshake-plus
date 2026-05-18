const assert = require('assert');
const docs = require('./required-document-utils.js');

const payload = docs.buildRequiredDocumentPrompt({
  instruction: 'School or work project',
  jobTitle: 'Software Engineer Intern',
  companyName: 'NextLabs, Inc.',
  jobSummary: 'Build policy automation software for enterprise customers.',
  resumeSummary: 'Applicant built a React and Node.js job automation tool and has coursework in computer science.',
});

assert.match(payload.instructionPrompt, /required application document/i);
assert.match(payload.userPrompt, /Employer instruction:\n"School or work project"/);
assert.match(payload.userPrompt, /Do not invent project names, employers, dates, certifications, credentials, metrics, locations, work authorization status, or personal experiences/);
assert.match(payload.userPrompt, /\[add project name\] or \[add availability\]/);
assert.match(payload.userPrompt, /BEGIN_HANDSHAKE_PLUS_REQUIRED_DOCUMENT/);
assert.match(payload.userPrompt, /END_HANDSHAKE_PLUS_REQUIRED_DOCUMENT/);

assert.strictEqual(
  docs.extractRequiredDocumentText(`I can help with that.

BEGIN_HANDSHAKE_PLUS_REQUIRED_DOCUMENT
AI Projects

Built a small document assistant using resume backed summaries.
END_HANDSHAKE_PLUS_REQUIRED_DOCUMENT

Let me know if you want edits.`),
  'AI Projects\n\nBuilt a small document assistant using resume backed summaries.'
);

assert.strictEqual(
  docs.extractRequiredDocumentText(`Claude responded:
Thought for 8 seconds

Here is the required document:

AI Projects

Built a small document assistant using resume backed summaries.`),
  'AI Projects\n\nBuilt a small document assistant using resume backed summaries.'
);

assert.strictEqual(
  docs.sanitizeRequiredDocumentFilePart('School or work project'),
  'School_or_work_project'
);

assert.strictEqual(
  docs.buildRequiredDocumentFileName('NextLabs, Inc.'),
  'NextLabs_Inc_Required_Document.rtf'
);
assert.strictEqual(docs.buildRequiredDocumentFileName(''), 'Required_Document.rtf');

console.log('required-document-utils tests passed');
