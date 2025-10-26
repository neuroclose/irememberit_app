/**
 * Word Cloud Question Processor
 * Generates word clouds with decoys based on stage progression
 */

interface WordItem {
  word: string;
  id: string; // Unique identifier for each word instance
}

interface ProcessedWordCloud {
  words: WordItem[];
  decoys: WordItem[];
  correctOrder: WordItem[];
  stage: number;
  originalText: string;
}

/**
 * Calculate number of decoy words based on stage
 * Early stages have fewer decoys, later stages have more
 */
function getDecoyCount(stage: number, wordCount: number): number {
  // Stage 1-3: 2-3 decoys
  // Stage 4-6: 4-5 decoys
  // Stage 7-9: 6-8 decoys
  const baseDecoys = Math.min(Math.floor(stage / 3) + 2, wordCount);
  return Math.min(baseDecoys, Math.floor(wordCount * 0.5)); // Max 50% decoys
}

/**
 * Generate decoy words that are similar to the actual words
 */
function generateWordCloudDecoys(
  words: string[],
  stage: number,
  allModuleWords?: string[]
): string[] {
  const decoyCount = getDecoyCount(stage, words.length);
  const decoys: string[] = [];
  const usedWords = new Set(words.map(w => w.toLowerCase()));
  
  // Common word pool for decoys
  const commonWords = [
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall',
    'you', 'I', 'we', 'they', 'he', 'she', 'it',
    'my', 'your', 'his', 'her', 'their', 'our', 'its',
    'this', 'that', 'these', 'those',
    'at', 'in', 'on', 'to', 'for', 'with', 'from', 'by',
    'about', 'like', 'through', 'over', 'before', 'after',
    'not', 'no', 'yes', 'but', 'or', 'and', 'so',
  ];
  
  // Build candidate pool from module words and common words
  const candidatePool = [...(allModuleWords || []), ...commonWords]
    .filter(w => !usedWords.has(w.toLowerCase()))
    .filter((w, idx, self) => self.indexOf(w) === idx); // Remove duplicates
  
  // Shuffle and select decoys
  const shuffled = candidatePool.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(decoyCount, shuffled.length); i++) {
    if (!usedWords.has(shuffled[i].toLowerCase())) {
      decoys.push(shuffled[i]);
      usedWords.add(shuffled[i].toLowerCase());
    }
  }
  
  // If we still need more decoys, create variations
  while (decoys.length < decoyCount) {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const variation = randomWord + 's'; // Simple pluralization
    if (!usedWords.has(variation.toLowerCase())) {
      decoys.push(variation);
      usedWords.add(variation.toLowerCase());
    }
  }
  
  return decoys;
}

/**
 * Process a text phrase into a word cloud question
 */
export function processWordCloudQuestion(
  originalText: string,
  stage: number,
  allModuleWords?: string[]
): ProcessedWordCloud {
  // Split text into words
  const cleanText = originalText.trim();
  const wordStrings = cleanText.split(/\s+/).filter(w => w.length > 0);
  
  // Create WordItem objects with unique IDs for each word instance
  const words: WordItem[] = wordStrings.map((word, index) => ({
    word,
    id: `word-${index}-${word}`
  }));
  
  // Generate decoys
  const decoyStrings = generateWordCloudDecoys(wordStrings, stage, allModuleWords);
  const decoys: WordItem[] = decoyStrings.map((word, index) => ({
    word,
    id: `decoy-${index}-${word}`
  }));
  
  return {
    words,
    decoys,
    correctOrder: words,
    stage,
    originalText: cleanText,
  };
}

/**
 * Calculate Levenshtein distance (edit distance) between two word arrays
 * This gives us a more accurate measure of how close the user was
 */
function calculateEditDistance(arr1: string[], arr2: string[]): number {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1].toLowerCase() === arr2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1]; // No operation needed
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // Deletion
          dp[i][j - 1] + 1,     // Insertion
          dp[i - 1][j - 1] + 1  // Substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Check if the user's word order is correct
 */
export function checkWordCloudAnswer(
  processedQuestion: ProcessedWordCloud,
  userOrder: WordItem[]
): {
  correct: boolean;
  accuracy: number;
  correctOrder: string[];
  pointsEarned: number;
} {
  const correctWords = processedQuestion.correctOrder;
  
  // Extract word strings for comparison
  const userWordStrings = userOrder.map(w => w.word);
  const correctWordStrings = correctWords.map(w => w.word);
  
  // Check exact match (case-insensitive)
  const exactMatch = userOrder.length === correctWords.length &&
    userOrder.every((wordItem, index) => 
      wordItem.word.toLowerCase() === correctWords[index].word.toLowerCase()
    );
  
  // Calculate accuracy using edit distance
  // This gives a more accurate representation of how close the user was
  const editDistance = calculateEditDistance(userWordStrings, correctWordStrings);
  const maxLength = Math.max(userOrder.length, correctWords.length);
  
  // Accuracy = 1 - (editDistance / maxLength)
  // This means if they got everything right, accuracy = 100%
  // If they got 20 out of 21 words right, accuracy ≈ 95%
  const accuracy = maxLength > 0 
    ? ((maxLength - editDistance) / maxLength) * 100 
    : 0;
  
  // Calculate points based on accuracy threshold (70% to pass)
  const passingThreshold = 70;
  const passed = accuracy >= passingThreshold;
  
  // Base points: stage × 50
  const basePoints = processedQuestion.stage * 50;
  
  // Accuracy bonus:
  // 100% = full points
  // 95-99% = 90% of points
  // 85-94% = 80% of points
  // 70-84% = 70% of points
  let accuracyMultiplier = 0;
  if (accuracy >= 100) {
    accuracyMultiplier = 1.0;
  } else if (accuracy >= 95) {
    accuracyMultiplier = 0.9;
  } else if (accuracy >= 85) {
    accuracyMultiplier = 0.8;
  } else if (accuracy >= 70) {
    accuracyMultiplier = 0.7;
  }
  
  const pointsEarned = passed 
    ? Math.round(basePoints * accuracyMultiplier) 
    : 0;
  
  return {
    correct: exactMatch,
    accuracy,
    correctOrder: correctWordStrings,
    pointsEarned,
  };
}
