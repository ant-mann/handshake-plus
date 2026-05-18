const assert = require('assert');
const screening = require('./screening-utils.js');

const questions = [
  {
    id: 'q1',
    questionText: 'Do you speak English?',
    inputType: 'radio',
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ],
  },
  {
    id: 'q2',
    questionText: 'Are you located in or willing to relocate to NYC?',
    inputType: 'radio',
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ],
  },
];

const result = screening.answerScreeningQuestionsFromFacts({
  questions,
  screeningFacts: {
    languages: 'English',
    relocationLocations: '',
  },
  contactLocation: 'Chicago, IL',
});

assert.strictEqual(result.answers.length, 2);
assert.deepStrictEqual(result.answers[0], {
  id: 'q1',
  questionText: 'Do you speak English?',
  selectedValue: 'yes',
  selectedLabel: 'Yes',
  confidence: 'high',
  evidence: 'Saved screening facts list English as a spoken language.',
  status: 'answered',
});
assert.strictEqual(result.answers[1].selectedValue, '');
assert.strictEqual(result.answers[1].confidence, 'low');
assert.strictEqual(result.answers[1].status, 'needs_review');
assert.match(result.answers[1].evidence, /No saved fact confirms/i);
assert.strictEqual(result.requiresReview, true);

console.log('screening-utils tests passed');

const prompt = screening.buildScreeningAnswerPrompt({
  questions,
  screeningFacts: { languages: 'English' },
  contactLocation: 'Chicago, IL',
  resumeSummary: 'Applicant speaks English and studies computer science.',
  jobContext: { jobTitle: 'Software Engineer Intern', companyName: 'NextLabs' },
});
assert.match(prompt.instructionPrompt, /strict JSON/i);
assert.match(prompt.userPrompt, /"questions"/);
assert.match(prompt.userPrompt, /needs_review/);

const parsed = screening.parseScreeningAnswerResponse(
  '```json\n{"answers":[{"id":"q1","selectedValue":"yes","confidence":"high","evidence":"Resume says English.","status":"answered"},{"id":"q2","selectedValue":"yes","confidence":"low","evidence":"Not enough data.","status":"answered"}]}\n```',
  questions
);

assert.strictEqual(parsed.answers[0].selectedValue, 'yes');
assert.strictEqual(parsed.answers[0].selectedLabel, 'Yes');
assert.strictEqual(parsed.answers[0].status, 'answered');
assert.strictEqual(parsed.answers[1].selectedValue, '');
assert.strictEqual(parsed.answers[1].status, 'needs_review');
assert.strictEqual(parsed.requiresReview, true);

console.log('screening AI JSON tests passed');
