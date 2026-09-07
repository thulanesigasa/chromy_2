/**
 * My Buddy - High-Precision Fuzzy Matching & Search Engine
 * Normalization, Token Overlap (Jaccard Index), Levenshtein Distance,
 * Option Set Matching, and Options-Only fallback matching.
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
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'it', 'this', 'that', 'and', 'or', 'be', 'do', 'has', 'have', 'had', 'not', 'as', 'but']);
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

  // Cap at 200 chars to avoid O(n²) on very long strings
  const capA = normA.substring(0, 200);
  const capB = normB.substring(0, 200);

  const matrix = [];
  for (let i = 0; i <= capB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= capA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= capB.length; i++) {
    for (let j = 1; j <= capA.length; j++) {
      if (capB.charAt(i - 1) === capA.charAt(j - 1)) {
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

  return matrix[capB.length][capA.length];
}

function calculateLevenshteinSimilarity(a, b) {
  const normA = normalizeText(a).substring(0, 200);
  const normB = normalizeText(b).substring(0, 200);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  const dist = calculateLevenshteinDistance(normA, normB);
  return 1.0 - (dist / maxLen);
}

/**
 * Calculates how well the page's option set matches a KB entry's option set.
 * Returns a score 0..1 based on how many options overlap.
 */
function calculateOptionSetScore(pageOptions, kbOptions) {
  if (!pageOptions || !kbOptions || pageOptions.length === 0 || kbOptions.length === 0) return 0;

  let optionMatches = 0;

  pageOptions.forEach(pOpt => {
    const normPOpt = normalizeText(pOpt);
    if (normPOpt.length < 3) return;

    kbOptions.forEach(kOpt => {
      const normKOpt = normalizeText(kOpt);
      if (normKOpt.length < 3) return;

      // Exact containment match
      if (normKOpt.includes(normPOpt) || normPOpt.includes(normKOpt)) {
        optionMatches++;
        return;
      }

      // High Jaccard similarity between the individual option strings (> 0.7)
      const j = calculateJaccardSimilarity(pOpt, kOpt);
      if (j >= 0.7) {
        optionMatches++;
      }
    });
  });

  // Proportion of page options that matched KB options
  return optionMatches / Math.max(pageOptions.length, kbOptions.length);
}

function computeMatchScore(pageQuestionText, kbQuestionText, pageOptions = [], kbOptions = []) {
  const normPage = normalizeText(pageQuestionText);
  const normKb = normalizeText(kbQuestionText);
  const hasPageQuestion = normPage.length > 5;
  const hasKbQuestion = normKb.length > 5;

  // ── Option-set-only matching (when question text was not extracted) ──────────
  // If we have no usable page question text but have matching options, use pure option score.
  if (!hasPageQuestion && pageOptions.length >= 2) {
    const optScore = calculateOptionSetScore(pageOptions, kbOptions);
    if (optScore >= 0.5) {
      // Treat high option overlap as high confidence (options are unique per question)
      return 0.75 + (optScore * 0.25); // max 1.0
    }
    return optScore * 0.5; // low confidence
  }

  // ── Question text matching ───────────────────────────────────────────────────

  // 1. Direct exact question match
  if (hasPageQuestion && hasKbQuestion && normPage === normKb) return 1.0;

  // 2. Substring containment
  if (hasPageQuestion && hasKbQuestion && normPage.length > 10 && normKb.length > 10) {
    if (normPage.includes(normKb) || normKb.includes(normPage)) {
      return 0.95;
    }
  }

  // 3. Token (Jaccard) + Levenshtein combo
  // For longer questions, weight Jaccard more (Levenshtein is too punishing for long strings)
  const isLongQuestion = Math.max(normPage.length, normKb.length) > 80;
  let qScore = 0;
  if (hasPageQuestion && hasKbQuestion) {
    const jaccardScore = calculateJaccardSimilarity(pageQuestionText, kbQuestionText);
    const levenshteinScore = calculateLevenshteinSimilarity(pageQuestionText, kbQuestionText);
    if (isLongQuestion) {
      qScore = (jaccardScore * 0.8) + (levenshteinScore * 0.2);
    } else {
      qScore = (jaccardScore * 0.6) + (levenshteinScore * 0.4);
    }
  }

  // 4. Option set similarity boost
  const optScore = calculateOptionSetScore(pageOptions, kbOptions);
  if (optScore >= 0.5) {
    // Options strongly suggest the right entry — boost score significantly
    const boosted = Math.max(qScore, 0.80 + (optScore * 0.20));
    return boosted;
  }

  // 5. Partial option boost even if question score was decent
  if (optScore > 0.2 && qScore > 0.2) {
    qScore = qScore + (optScore * 0.15);
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

  if (!queryQuestion && (!pageOptions || pageOptions.length === 0)) {
    return { matchFound: false, reason: 'No question or options detected on page' };
  }

  let candidates = knowledgeBaseEntries;

  // Optional category pre-filter — use relaxed substring matching
  if (activeCategory && activeCategory !== 'Checkpoint Exam' && activeCategory !== 'General') {
    const normCategory = normalizeText(activeCategory);
    const categoryWords = normCategory.split(' ').filter(w => w.length > 3);

    const categoryMatches = knowledgeBaseEntries.filter(entry => {
      if (!entry.category) return false;
      const normEntryCat = normalizeText(entry.category);
      // Match if any significant word from the page category appears in KB category
      return normEntryCat.includes(normCategory) ||
        normCategory.includes(normEntryCat) ||
        categoryWords.some(w => normEntryCat.includes(w));
    });

    // Only apply filter if it returns results (otherwise search all)
    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  let bestEntry = null;
  let highestScore = 0;

  for (const entry of candidates) {
    const score = computeMatchScore(queryQuestion || '', entry.question, pageOptions, entry.options || []);
    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  // Always fallback to full database search if candidate pool was filtered
  if (candidates !== knowledgeBaseEntries) {
    for (const entry of knowledgeBaseEntries) {
      const score = computeMatchScore(queryQuestion || '', entry.question, pageOptions, entry.options || []);
      if (score > highestScore) {
        highestScore = score;
        bestEntry = entry;
      }
    }
  }

  // Threshold: 35% for question-based, 50% for options-only
  const hasQuestion = queryQuestion && queryQuestion.length > 5;
  const SCORE_THRESHOLD = hasQuestion ? 0.35 : 0.50;

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
    calculateOptionSetScore,
    computeMatchScore,
    findBestMatch
  };
}
