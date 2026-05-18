(function(root) {
  function stripPriorText(rawText, textBefore) {
    const raw = String(rawText || '').trim();
    const before = String(textBefore || '').trim();
    if (before && raw.startsWith(before)) {
      return raw.slice(before.length).trim();
    }
    return raw;
  }

  function isClaudeStatusLine(line) {
    const text = String(line || '').trim();
    return (
      /^Claude responded:\s*$/i.test(text) ||
      /^Deliberated on\b/i.test(text) ||
      /^Thought for\b/i.test(text) ||
      /^Thinking\b/i.test(text)
    );
  }

  function cleanClaudeResponseText(rawText, textBefore) {
    let text = stripPriorText(rawText, textBefore);
    text = text.replace(/^Claude responded:\s*/i, '').trim();

    const cleanedLines = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (isClaudeStatusLine(trimmed)) continue;
      if (trimmed && cleanedLines[cleanedLines.length - 1] === trimmed) continue;
      cleanedLines.push(line);
    }

    return cleanedLines.join('\n').trim();
  }

  const exportsObject = {
    cleanClaudeResponseText,
    isClaudeStatusLine,
    stripPriorText,
  };

  root.HandshakePlusClaudeResponse = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
