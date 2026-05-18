(function (root) {
  const MAX_CUSTOM_AI_INSTRUCTIONS_LENGTH = 5000;

  function cleanCustomAiInstructions(value) {
    return String(value || '').trim().slice(0, MAX_CUSTOM_AI_INSTRUCTIONS_LENGTH);
  }

  function applyCustomAiInstructions(promptBundle, customInstructions, aggressive) {
    const cleaned = cleanCustomAiInstructions(customInstructions);
    if (!cleaned) {
      return promptBundle;
    }

    const constraintLine = aggressive
      ? 'These custom instructions are additional style, context, and preference guidance. Do not override required output formats, JSON schemas, or employer/application instructions from the main prompt.'
      : 'These custom instructions are additional style, context, and preference guidance. Do not override required output formats, JSON schemas, truthfulness requirements, safety constraints, or employer/application instructions from the main prompt.';

    const customSection = `User custom AI instructions:
${cleaned}

${constraintLine}`;

    return Object.assign({}, promptBundle, {
      instructions: promptBundle.instructions ? `${promptBundle.instructions}\n\n---\n\n${customSection}` : customSection,
    });
  }

  const exportsObject = {
    applyCustomAiInstructions,
    cleanCustomAiInstructions,
  };

  root.HandshakePlusAiPrompts = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
