(function (root) {
  function splitFactList(value) {
    return String(value || '')
      .split(/[,;\n]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function normalizeLocation(value) {
    return normalizeText(value)
      .replace(/\bnew york city\b/g, 'nyc')
      .replace(/\bnew york ny\b/g, 'nyc')
      .replace(/\bnew york\b/g, 'nyc');
  }

  function optionByValueOrLabel(question, value) {
    const wanted = normalizeText(value);
    return (question.options || []).find(option =>
      normalizeText(option.value) === wanted || normalizeText(option.label) === wanted
    );
  }

  function getQuestionLocation(questionText) {
    const text = String(questionText || '');
    const match = text.match(/(?:relocate to|located in(?: or willing to relocate to)?|based in)\s+([^?.,]+)/i);
    return match ? match[1].trim() : '';
  }

  function factListIncludes(list, expected) {
    const normalizedExpected = normalizeText(expected);
    return list.some(item => normalizeText(item) === normalizedExpected || normalizeText(item).includes(normalizedExpected));
  }

  function locationListIncludes(list, expected) {
    const normalizedExpected = normalizeLocation(expected);
    return list.some(item => {
      const normalized = normalizeLocation(item);
      return normalized === normalizedExpected || normalized.includes(normalizedExpected) || normalizedExpected.includes(normalized);
    });
  }

  function makeAnswer(question, option, confidence, evidence, status) {
    return {
      id: question.id,
      questionText: question.questionText,
      selectedValue: option ? option.value : '',
      selectedLabel: option ? option.label : '',
      confidence,
      evidence,
      status,
    };
  }

  function unanswered(question, evidence) {
    return makeAnswer(question, null, 'low', evidence, 'needs_review');
  }

  function answerScreeningQuestion(question, facts) {
    const text = normalizeText(question.questionText);
    const yes = optionByValueOrLabel(question, 'yes');
    const no = optionByValueOrLabel(question, 'no');
    const languages = splitFactList(facts.languages);
    const relocationLocations = splitFactList(facts.relocationLocations);
    const contactLocation = facts.contactLocation || '';
    const workAuthorization = normalizeText(facts.workAuthorization);
    const sponsorship = normalizeText(facts.sponsorship);

    if (text.includes('speak english') || text.includes('english')) {
      if (yes && factListIncludes(languages, 'english')) {
        return makeAnswer(question, yes, 'high', 'Saved screening facts list English as a spoken language.', 'answered');
      }
      return unanswered(question, 'No saved fact confirms English speaking ability.');
    }

    if (text.includes('relocate') || text.includes('located in') || text.includes('based in')) {
      const targetLocation = getQuestionLocation(question.questionText);
      if (yes && targetLocation) {
        if (locationListIncludes([contactLocation], targetLocation)) {
          return makeAnswer(question, yes, 'high', `Contact location matches ${targetLocation}.`, 'answered');
        }
        if (locationListIncludes(relocationLocations, targetLocation) || relocationLocations.some(item => normalizeText(item) === 'anywhere')) {
          return makeAnswer(question, yes, 'high', `Saved screening facts confirm willingness to relocate to ${targetLocation}.`, 'answered');
        }
      }
      return unanswered(question, `No saved fact confirms current location or relocation willingness for ${targetLocation || 'the requested location'}.`);
    }

    if (text.includes('authorized') && text.includes('work')) {
      if (yes && (workAuthorization === 'yes' || workAuthorization.includes('authorized'))) {
        return makeAnswer(question, yes, 'high', 'Saved screening facts confirm work authorization.', 'answered');
      }
      if (no && workAuthorization === 'no') {
        return makeAnswer(question, no, 'high', 'Saved screening facts say work authorization is not currently held.', 'answered');
      }
      return unanswered(question, 'No saved fact confirms work authorization.');
    }

    if (text.includes('sponsorship') || text.includes('sponsor')) {
      if (yes && sponsorship === 'yes') {
        return makeAnswer(question, yes, 'high', 'Saved screening facts say sponsorship is needed.', 'answered');
      }
      if (no && sponsorship === 'no') {
        return makeAnswer(question, no, 'high', 'Saved screening facts say sponsorship is not needed.', 'answered');
      }
      return unanswered(question, 'No saved fact confirms sponsorship needs.');
    }

    return unanswered(question, 'Question is not covered by saved screening facts.');
  }

  function answerScreeningQuestionsFromFacts(input) {
    const facts = Object.assign({}, input.screeningFacts || {}, {
      contactLocation: input.contactLocation || input.screeningFacts?.currentLocation || '',
    });
    const answers = (input.questions || []).map(question => answerScreeningQuestion(question, facts));
    return {
      answers,
      requiresReview: answers.length > 0,
    };
  }

  function buildScreeningAnswerPrompt(input) {
    const aggressive = input.aggressive === true;

    const instructionPrompt = aggressive
      ? 'You answer job application screening questions using strict JSON. Your goal is to maximize the candidate\u2019s chance of getting an interview. For every question, select the option that makes the candidate most hirable. Tie answers back to the resume where possible for plausibility, but always pick the best available option even when no explicit support exists.'
      : 'You answer job application screening questions using strict JSON. Use only the applicant facts provided. If unsure, choose needs_review instead of guessing.';

    const rulesSection = aggressive
      ? `Rules:
- For each question, evaluate all provided options and select the one that most increases the likelihood of getting an interview. Prioritize answers that demonstrate seniority, experience, authorization, flexibility, and qualifications.
- Tie your selection back to the resume summary and job context for plausibility wherever possible. If the resume does not directly support any option, still pick the most advantageous answer and draw reasonable inferences that highlight strengths already present in the resume.
- Only use selectedValue values that appear in that question's options.
- Always set confidence to "high" and status to "answered" for every single question. Never use "needs_review".
- Do not include markdown, prose, or keys outside the JSON object.`
      : `Rules:
- Use only facts in the resume summary, saved screening facts, contact location, and job context.
- Do not infer sensitive eligibility, work authorization, relocation willingness, language ability, degree status, sponsorship needs, dates, or locations unless explicitly supported.
- Only use selectedValue values that appear in that question's options.
- Use status "answered" only when confidence is "high" and the evidence directly supports the selected option.
- If confidence is "medium" or "low", if evidence is missing, or if the truthful answer is unclear, set selectedValue to "" and status to "needs_review".
- Do not include markdown, prose, or keys outside the JSON object.`;

    const userPrompt = `Input JSON:
${JSON.stringify({
  jobContext: input.jobContext || {},
  resumeSummary: input.resumeSummary || '',
  screeningFacts: input.screeningFacts || {},
  contactLocation: input.contactLocation || '',
  questions: input.questions || [],
}, null, 2)}

Return strict JSON only — wrap it in a \`\`\`json codeblock. Use this exact shape:
\`\`\`json
{
  "answers": [
    {
      "id": "question id",
      "selectedValue": "one of the provided option values, or empty string if unsure",
      "confidence": "high" | "medium" | "low",
      "evidence": "brief factual evidence from the supplied applicant data",
      "status": "answered" | "needs_review"
    }
  ]
}
\`\`\`

${rulesSection}`;

    return { instructionPrompt, userPrompt };
  }

  function extractJsonObject(text) {
    let jsonText = String(text || '').trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      jsonText = fenceMatch[1].trim();
    } else {
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) jsonText = objectMatch[0].trim();
    }
    return JSON.parse(jsonText);
  }

  function parseScreeningAnswerResponse(text, questions, aggressive) {
    const parsed = extractJsonObject(text);
    const rawAnswers = Array.isArray(parsed.answers) ? parsed.answers : [];
    const answers = (questions || []).map(question => {
      const raw = rawAnswers.find(answer => answer && answer.id === question.id) || {};
      const options = Array.isArray(question.options) ? question.options : [];
      const option = options.find(opt =>
        normalizeText(opt.value) === normalizeText(raw.selectedValue) ||
        normalizeText(opt.label) === normalizeText(raw.selectedValue)
      );
      const confidence = ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'low';
      const canAnswer = aggressive
        ? (raw.status === 'answered' && option)
        : (raw.status === 'answered' && confidence === 'high' && option);

      if (!canAnswer) {
        return {
          id: question.id,
          questionText: question.questionText,
          selectedValue: '',
          selectedLabel: '',
          confidence,
          evidence: raw.evidence || 'AI was not confident enough to answer.',
          status: 'needs_review',
        };
      }

      return {
        id: question.id,
        questionText: question.questionText,
        selectedValue: option.value,
        selectedLabel: option.label,
        confidence,
        evidence: raw.evidence || '',
        status: 'answered',
      };
    });

    return {
      answers,
      requiresReview: answers.length > 0,
    };
  }

  function createNeedsReviewScreeningAnswers(questions, reason) {
    return {
      answers: (questions || []).map(question => ({
        id: question.id,
        questionText: question.questionText,
        selectedValue: '',
        selectedLabel: '',
        confidence: 'low',
        evidence: reason ? `Needs review: ${reason}` : 'AI was unsure.',
        status: 'needs_review',
      })),
      requiresReview: (questions || []).length > 0,
    };
  }

  const exportsObject = {
    answerScreeningQuestionsFromFacts,
    buildScreeningAnswerPrompt,
    parseScreeningAnswerResponse,
    createNeedsReviewScreeningAnswers,
    splitFactList,
    normalizeText,
  };

  root.HandshakePlusScreening = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
