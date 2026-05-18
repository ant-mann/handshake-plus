// Local job title matcher for selected-role filtering.

class LocalJobMatcher {
  constructor() {
    this.lowImportanceTokens = new Set([
      'intern', 'internship', 'assistant', 'associate', 'junior', 'senior',
      'entry', 'level', 'trainee', 'temporary', 'seasonal', 'part', 'time',
      'full', 'co', 'op', 'coop'
    ]);
  }

  normalizeJobTitle(jobTitle) {
    return this.normalizeText(jobTitle).normalized;
  }

  normalizeText(text) {
    let normalized = (text || '').toLowerCase().trim();

    normalized = normalized
      .replace(/\bswe\b/g, 'software engineer')
      .replace(/\bsde\b/g, 'software engineer')
      .replace(/\brn\b/g, 'registered nurse')
      .replace(/\bhr\b/g, 'human resources')
      .replace(/\bqa\b/g, 'quality assurance')
      .replace(/\bux\b/g, 'user experience')
      .replace(/\bui\b/g, 'user interface')
      .replace(/&/g, ' and ')
      .replace(/[+/|_-]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = normalized
      ? normalized.split(' ').map(token => this.normalizeToken(token)).filter(Boolean)
      : [];
    const contentTokens = tokens.filter(token => !this.lowImportanceTokens.has(token));

    return {
      normalized: tokens.join(' '),
      tokens: tokens,
      contentTokens: contentTokens.length > 0 ? contentTokens : tokens
    };
  }

  normalizeToken(token) {
    const map = {
      admin: 'administrative',
      analysis: 'analyst',
      analyses: 'analyst',
      analytical: 'analyst',
      designer: 'design',
      designing: 'design',
      designs: 'design',
      developer: 'develop',
      development: 'develop',
      developing: 'develop',
      engineers: 'engineer',
      engineering: 'engineer',
      finance: 'finance',
      financial: 'finance',
      marketer: 'marketing',
      marketers: 'marketing',
      management: 'manager',
      managing: 'manager',
      researchers: 'research',
      researcher: 'research',
      researching: 'research',
      researches: 'research'
    };

    if (map[token]) return map[token];

    if (token.length > 4 && token.endsWith('ies')) {
      return token.slice(0, -3) + 'y';
    }

    if (
      token.length > 4 &&
      token.endsWith('s') &&
      !token.endsWith('ss') &&
      !token.endsWith('us') &&
      !token.endsWith('is')
    ) {
      return token.slice(0, -1);
    }

    return token;
  }

  tokenSet(tokens) {
    return new Set(tokens);
  }

  intersectionSize(setA, setB) {
    let count = 0;
    for (const item of setA) {
      if (setB.has(item)) count++;
    }
    return count;
  }

  ngrams(text, size = 3) {
    const compact = (text || '').replace(/\s+/g, '');
    if (!compact) return new Set();
    if (compact.length <= size) return new Set([compact]);

    const grams = new Set();
    for (let i = 0; i <= compact.length - size; i++) {
      grams.add(compact.slice(i, i + size));
    }
    return grams;
  }

  jaccard(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = this.intersectionSize(setA, setB);
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  compareProfiles(jobProfile, roleProfile) {
    if (!jobProfile.normalized || !roleProfile.normalized) return 0;
    if (jobProfile.normalized === roleProfile.normalized) return 1;

    const jobTokens = this.tokenSet(jobProfile.contentTokens);
    const roleTokens = this.tokenSet(roleProfile.contentTokens);
    const intersection = this.intersectionSize(jobTokens, roleTokens);

    const smallerTokenCount = Math.min(jobTokens.size, roleTokens.size);
    const containment = smallerTokenCount === 0 ? 0 : intersection / smallerTokenCount;
    const tokenJaccard = this.jaccard(jobTokens, roleTokens);
    const charJaccard = this.jaccard(
      this.ngrams(jobProfile.normalized),
      this.ngrams(roleProfile.normalized)
    );

    return (containment * 0.55) + (tokenJaccard * 0.30) + (charJaccard * 0.15);
  }

  async compareJobTitles(jobTitle, preferredRole, threshold = 0.5) {
    try {
      const jobProfile = this.normalizeText(jobTitle);
      const roleProfile = this.normalizeText(preferredRole);
      const similarity = this.compareProfiles(jobProfile, roleProfile);

      return {
        match: similarity >= threshold,
        similarity: similarity,
        jobTitle: jobProfile.normalized,
        preferredRole: preferredRole
      };
    } catch (error) {
      return {
        match: true,
        similarity: null,
        error: error.message
      };
    }
  }

  async compareJobTitleToRoles(jobTitle, preferredRoles, threshold = 0.5) {
    try {
      const jobProfile = this.normalizeText(jobTitle);

      const roles = (preferredRoles || [])
        .map(role => (role || '').trim())
        .filter(role => role.length > 0)
        .slice(0, 5);

      if (roles.length === 0) {
        return {
          match: true,
          similarity: null,
          bestMatchRole: null,
          comparisons: []
        };
      }

      const comparisons = roles.map(role => {
        const similarity = this.compareProfiles(jobProfile, this.normalizeText(role));
        return {
          preferredRole: role,
          similarity: similarity,
          match: similarity >= threshold
        };
      });

      const bestComparison = comparisons.reduce((best, current) => {
        return current.similarity > best.similarity ? current : best;
      }, comparisons[0]);

      return {
        match: comparisons.some(item => item.match),
        similarity: bestComparison.similarity,
        bestMatchRole: bestComparison.preferredRole,
        comparisons: comparisons,
        jobTitle: jobProfile.normalized
      };
    } catch (error) {
      console.error('Error comparing job title to multiple roles:', error);
      return {
        match: true,
        similarity: null,
        bestMatchRole: null,
        comparisons: [],
        error: error.message
      };
    }
  }
}

window.LocalJobMatcher = LocalJobMatcher;
