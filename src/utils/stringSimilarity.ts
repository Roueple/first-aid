/**
 * String similarity utilities for fuzzy matching
 * Uses Levenshtein distance for calculating similarity
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
export function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

export interface SimilarityMatch {
  value: string;
  score: number;
  distance: number;
}

/**
 * Find the closest matching string from a list
 * Returns the best match with score >= minScore, or null if none found
 */
export function findClosestMatch(
  query: string,
  candidates: string[],
  minScore: number = 0.6
): SimilarityMatch | null {
  if (!query || candidates.length === 0) return null;
  
  let bestMatch: SimilarityMatch | null = null;
  
  for (const candidate of candidates) {
    const score = similarityScore(query, candidate);
    const distance = levenshteinDistance(query.toLowerCase(), candidate.toLowerCase());
    
    if (score >= minScore && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { value: candidate, score, distance };
    }
  }
  
  return bestMatch;
}

/**
 * Find all matches above a threshold, sorted by score descending
 * Also includes substring matches with boosted scores
 */
export function findAllMatches(
  query: string,
  candidates: string[],
  minScore: number = 0.5,
  maxResults: number = 5
): SimilarityMatch[] {
  if (!query || candidates.length === 0) return [];
  
  const matches: SimilarityMatch[] = [];
  const queryLower = query.toLowerCase();
  
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    let score = similarityScore(query, candidate);
    
    // Boost score for substring matches
    if (candidateLower.includes(queryLower)) {
      // If query is contained in candidate, boost score significantly
      score = Math.max(score, 0.85);
    } else if (queryLower.includes(candidateLower)) {
      // If candidate is contained in query, also boost
      score = Math.max(score, 0.80);
    }
    
    // Check for word-level matches (all words in query appear in candidate)
    const queryWords = queryLower.split(/\s+/);
    const candidateWords = candidateLower.split(/\s+/);
    const matchingWords = queryWords.filter(qw => 
      candidateWords.some(cw => cw.includes(qw) || qw.includes(cw))
    );
    
    if (matchingWords.length === queryWords.length && queryWords.length > 1) {
      // All query words found in candidate
      score = Math.max(score, 0.75);
    }
    
    if (score >= minScore) {
      const distance = levenshteinDistance(queryLower, candidateLower);
      matches.push({ value: candidate, score, distance });
    }
  }
  
  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  
  return matches.slice(0, maxResults);
}
