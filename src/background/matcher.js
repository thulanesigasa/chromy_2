/**
 * My Buddy - Fuzzy Matching & Search Engine
 * High-precision string normalization, token overlap, and Levenshtein similarity.
 */

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(str) {
  const normalized = normalizeText(str);
  if (!normalized) return [];
  // Filter out short stop words (e.g., a, an, the, is, of, to, in)
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'it', 'this', 'that']);
  return normalized
    .split(' ')
    .filter(token => token.length > 1 && !stopWords.has(token));
}

function calculateJaccardSimilarity(textA, textB) {
  const tokensA = new Set(getTokens(textA));
  const tokensB = new Set(getTokens(textB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  tokensA.forEach(token => {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  });

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

function calculateLevenshteinDistance(a, b) {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (normA === normB) return 0;
  if (normA.length === 0) return normB.length;
  if (normB.length === 0) return normA.length;

  const matrix = [];
  for (let i = 0; i <= normB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= normA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= normB.length; i++) {
    for (let j = 1; j <= normA.length; j++) {
      if (normB.charAt(i - 1) === normA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[normB.length][normA.length];
}

function calculateLevenshteinSimilarity(a, b) {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  const dist = calculateLevenshteinDistance(normA, normB);
  return 1.0 - (dist / maxLen);
}

function computeMatchScore(pageQuestionText, kbQuestionText) {
  const normPage = normalizeText(pageQuestionText);
  const normKb = normalizeText(kbQuestionText);

  // 1. Direct exact match
  if (normPage === normKb) return 1.0;

  // 2. Substring containment check
  if (normPage.length > 20 && normKb.length > 20) {
    if (normPage.includes(normKb) || normKb.includes(normPage)) {
      return 0.95;
    }
  }

  // 3. Combined Jaccard Token & Levenshtein metric
  const jaccardScore = calculateJaccardSimilarity(pageQuestionText, kbQuestionText);
  const levenshteinScore = calculateLevenshteinSimilarity(pageQuestionText, kbQuestionText);

  // Weighted hybrid score
  return (jaccardScore * 0.6) + (levenshteinScore * 0.4);
}

/**
 * Finds best matching question from stored Knowledge Base entries.
 * @param {string} queryQuestion - Question text detected on webpage.
 * @param {Array} knowledgeBaseEntries - Array of stored Q&A objects.
 * @param {string} [activeModuleCategory] - Optional category title filter.
 */
function findBestMatch(queryQuestion, knowledgeBaseEntries, activeModuleCategory = null) {
  if (!queryQuestion || !knowledgeBaseEntries || knowledgeBaseEntries.length === 0) {
    return { matchFound: false, reason: 'No database entries stored' };
  }

  let candidates = knowledgeBaseEntries;

  // Optional category pre-filter if active module detected
  if (activeModuleCategory) {
    const normCategory = normalizeText(activeModuleCategory);
    const categoryMatches = knowledgeBaseEntries.filter(entry => {
      if (!entry.category) return false;
      const normEntryCat = normalizeText(entry.category);
      return normEntryCat.includes(normCategory) || normCategory.includes(normEntryCat);
    });

    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  let bestEntry = null;
  let highestScore = 0;

  for (const entry of candidates) {
    const score = computeMatchScore(queryQuestion, entry.question);
    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  // Fallback to searching all entries if category filtering returned low score
  if (highestScore < 0.4 && candidates !== knowledgeBaseEntries) {
    for (const entry of knowledgeBaseEntries) {
      const score = computeMatchScore(queryQuestion, entry.question);
      if (score > highestScore) {
        highestScore = score;
        bestEntry = entry;
      }
    }
  }

  const SCORE_THRESHOLD = 0.40; // minimum 40% confidence to claim match

  if (bestEntry && highestScore >= SCORE_THRESHOLD) {
    return {
      matchFound: true,
      score: Math.round(highestScore * 100),
      matchedQuestion: bestEntry.question,
      answer: bestEntry.answer,
      options: bestEntry.options || [],
      category: bestEntry.category || 'General',
      sourceDoc: bestEntry.sourceDoc || 'Uploaded Document'
    };
  }

  return {
    matchFound: false,
    score: Math.round(highestScore * 100),
    bestCandidate: bestEntry ? bestEntry.question : null
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeText,
    getTokens,
    calculateJaccardSimilarity,
    calculateLevenshteinSimilarity,
    computeMatchScore,
    findBestMatch
  };
}
