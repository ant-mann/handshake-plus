(function (root) {
  const DEFAULT_SKIP_REASON = 'No explicit AI approval';
  const PARSE_ERROR_REASON = 'AI filter response could not be parsed';
  const MAX_REASON_LENGTH = 36;

  function cleanJobId(value) {
    return String(value || '').trim();
  }

  function cleanReason(value, fallback) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return fallback;
    return text.slice(0, MAX_REASON_LENGTH).trim();
  }

  function createAllSkipped(jobIds, reason) {
    const result = {};
    for (const jobId of jobIds || []) {
      const id = cleanJobId(jobId);
      if (!id) continue;
      result[id] = { apply: false, reason };
    }
    return result;
  }

  function extractJsonText(rawText) {
    let text = String(rawText || '').trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) {
      return fenced[1].trim();
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return objectMatch[0].trim();
    }

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return arrayMatch[0].trim();
    }

    return text;
  }

  function getDecisionItems(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.decisions)) return parsed.decisions;
    if (Array.isArray(parsed?.jobs)) return parsed.jobs;
    return [];
  }

  function normalizeJobFitDecisions(parsed, jobIds) {
    const result = createAllSkipped(jobIds, DEFAULT_SKIP_REASON);
    const knownIds = new Set(Object.keys(result));
    const seen = new Set();

    for (const item of getDecisionItems(parsed)) {
      const id = cleanJobId(item?.jobId || item?.id);
      if (!id || !knownIds.has(id) || seen.has(id)) continue;

      const approved = item?.apply === true;
      result[id] = {
        apply: approved,
        reason: approved ? '' : cleanReason(item?.reason, DEFAULT_SKIP_REASON),
      };
      seen.add(id);
    }

    return result;
  }

  function parseJobFitDecisions(rawText, jobIds) {
    try {
      const parsed = JSON.parse(extractJsonText(rawText));
      return normalizeJobFitDecisions(parsed, jobIds);
    } catch (error) {
      return createAllSkipped(jobIds, PARSE_ERROR_REASON);
    }
  }

  const exportsObject = {
    DEFAULT_SKIP_REASON,
    PARSE_ERROR_REASON,
    parseJobFitDecisions,
    normalizeJobFitDecisions,
  };

  root.HandshakePlusJobFitFilter = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
