/**
 * Chromy 2 - High-Precision Fuzzy Matching & Search Engine
 * Normalization, Token Overlap (Jaccard Index), Levenshtein Distance, and Option Set Matching.
 */

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(str) {
  const normalized = normalizeText(str);
  if (!normalized) return [];
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
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

function computeMatchScore(pageQuestionText, kbQuestionText, pageOptions = [], kbOptions = []) {
  const normPage = normalizeText(pageQuestionText);
  const normKb = normalizeText(kbQuestionText);

  // 1. Direct exact question match
  if (normPage === normKb && normPage.length > 5) return 1.0;

  // 2. Substring containment check
  if (normPage.length > 10 && normKb.length > 10) {
    if (normPage.includes(normKb) || normKb.includes(normPage)) {
      return 0.95;
    }
  }

  // 3. Question Token & Levenshtein score
  const jaccardScore = calculateJaccardSimilarity(pageQuestionText, kbQuestionText);
  const levenshteinScore = calculateLevenshteinSimilarity(pageQuestionText, kbQuestionText);
  let qScore = (jaccardScore * 0.6) + (levenshteinScore * 0.4);

  // 4. Option set similarity boost
  if (pageOptions.length > 0 && kbOptions.length > 0) {
    let optionMatches = 0;
    pageOptions.forEach(pOpt => {
      const normPOpt = normalizeText(pOpt);
      if (normPOpt.length > 5) {
        kbOptions.forEach(kOpt => {
          const normKOpt = normalizeText(kOpt);
          if (normKOpt.includes(normPOpt) || normPOpt.includes(normKOpt)) {
            optionMatches++;
          }
        });
      }
    });

    const optScore = optionMatches / Math.max(pageOptions.length, 1);
    if (optScore >= 0.5) {
      qScore = Math.max(qScore, 0.85 + (optScore * 0.15));
    }
  }

  return qScore;
}

/**
 * Finds best matching question from stored Knowledge Base entries.
 * @param {string} queryQuestion - Question text detected on webpage.
 * @param {Array} knowledgeBaseEntries - Array of stored Q&A objects.
 * @param {string} [activeCategory] - Optional category title filter.
 * @param {Array} [pageOptions] - Array of options extracted from webpage.
 */
function findBestMatch(queryQuestion, knowledgeBaseEntries, activeCategory = null, pageOptions = []) {
  if (!knowledgeBaseEntries || knowledgeBaseEntries.length === 0) {
    return { matchFound: false, reason: 'No database entries stored' };
  }

  let candidates = knowledgeBaseEntries;

  // Optional category pre-filter if specific module detected
  if (activeCategory && activeCategory !== 'Checkpoint Exam' && activeCategory !== 'General') {
    const normCategory = normalizeText(activeCategory);
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
    const score = computeMatchScore(queryQuestion, entry.question, pageOptions, entry.options || []);
    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  // Fallback to full database search if candidate score is low
  if (highestScore < 0.4 && candidates !== knowledgeBaseEntries) {
    for (const entry of knowledgeBaseEntries) {
      const score = computeMatchScore(queryQuestion, entry.question, pageOptions, entry.options || []);
      if (score > highestScore) {
        highestScore = score;
        bestEntry = entry;
      }
    }
  }

  const SCORE_THRESHOLD = 0.35; // minimum 35% confidence threshold

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
