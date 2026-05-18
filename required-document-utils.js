(function (root) {
  const REQUIRED_DOCUMENT_BEGIN = 'BEGIN_HANDSHAKE_PLUS_REQUIRED_DOCUMENT';
  const REQUIRED_DOCUMENT_END = 'END_HANDSHAKE_PLUS_REQUIRED_DOCUMENT';

  function sanitizeRequiredDocumentFilePart(value) {
    const cleaned = String(value || 'Required_Document')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);
    return cleaned || 'Required_Document';
  }

  function buildRequiredDocumentPrompt(input) {
    const instruction = input.instruction || 'Required document';
    const aggressive = input.aggressive === true;

    const instructionPrompt = aggressive
      ? 'You are helping prepare a required application document for a job application. Follow the employer instruction closely, produce a complete and cohesive document that maximizes the candidate\u2019s interview chances, and output only the document text.'
      : 'You are helping prepare a required application document for a job application. Follow the employer instruction closely, stay truthful, and output only the document text.';

    const guidanceSection = aggressive
      ? `Produce a complete, cohesive, and compelling required document as specified by the employer instruction. Ground everything in the resume where possible (real skills, employers, education, roles). Where the resume lacks specific details the instruction asks for, try your best to align with the candidate\u2019s demonstrated skills and the job requirements. Never use placeholder brackets or mark missing information \u2014 always produce complete, ready-to-submit text. Make the candidate sound maximally qualified for the role.`
      : `Write the required document requested by the employer instruction. Follow the instruction closely. Use only facts supported by the resume summary and job context. Do not invent project names, employers, dates, certifications, credentials, metrics, locations, work authorization status, or personal experiences.

If the instruction asks for something that cannot be answered truthfully from the available information, write a brief editable draft that clearly marks the missing details in brackets, such as [add project name] or [add availability]. Keep the document professional, concise, and ready for the user to review and edit before upload.`;

    const userPrompt = `Employer instruction:
"${instruction}"

Job:
"${input.jobTitle || ''}" at "${input.companyName || ''}"

Job summary:
"${input.jobSummary || ''}"

Applicant resume summary:
"${input.resumeSummary || ''}"

${guidanceSection}

Output the final document between these exact markers:
${REQUIRED_DOCUMENT_BEGIN}
[document text only]
${REQUIRED_DOCUMENT_END}

Do not put any commentary, reasoning, or explanation inside the markers.

CRITICAL INSTRUCTION: You are strictly forbidden from using any hyphens, dashes, or em-dashes (e.g. no "-", "--", or "\u2014") anywhere in the text under any circumstance. Avoid saying "Inc" or "LLC" in the company name to sound more natural.`;

    return { instructionPrompt, userPrompt };
  }

  function isRequiredDocumentStatusLine(line) {
    const text = String(line || '').trim();
    return (
      /^Claude responded:\s*$/i.test(text) ||
      /^Deliberated on\b/i.test(text) ||
      /^Thought for\b/i.test(text) ||
      /^Thinking\b/i.test(text) ||
      /^Here(?:'s| is)\s+(?:the\s+)?(?:required\s+)?document:?\s*$/i.test(text) ||
      /^I can help with that\.?$/i.test(text)
    );
  }

  function stripRequiredDocumentCodeFence(text) {
    const match = String(text || '').trim().match(/^```(?:rtf|text|txt|markdown|md)?\s*([\s\S]*?)\s*```$/i);
    return match ? match[1].trim() : String(text || '').trim();
  }

  function extractRequiredDocumentText(rawText) {
    let text = stripRequiredDocumentCodeFence(rawText);
    const beginIdx = text.indexOf(REQUIRED_DOCUMENT_BEGIN);
    const endIdx = text.indexOf(REQUIRED_DOCUMENT_END);
    if (beginIdx >= 0 && endIdx > beginIdx) {
      text = text.slice(beginIdx + REQUIRED_DOCUMENT_BEGIN.length, endIdx);
    }

    const cleanedLines = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed === REQUIRED_DOCUMENT_BEGIN || trimmed === REQUIRED_DOCUMENT_END) continue;
      if (isRequiredDocumentStatusLine(trimmed)) continue;
      cleanedLines.push(line);
    }

    return stripRequiredDocumentCodeFence(cleanedLines.join('\n')).trim();
  }

  function buildRequiredDocumentFileName(companyName) {
    const companyPart = sanitizeRequiredDocumentFilePart(companyName);
    if (!companyName || companyPart === 'Required_Document') {
      return 'Required_Document.rtf';
    }
    return `${companyPart}_Required_Document.rtf`;
  }

  const exportsObject = {
    extractRequiredDocumentText,
    buildRequiredDocumentFileName,
    buildRequiredDocumentPrompt,
    isRequiredDocumentStatusLine,
    sanitizeRequiredDocumentFilePart,
  };

  root.HandshakePlusRequiredDocuments = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
