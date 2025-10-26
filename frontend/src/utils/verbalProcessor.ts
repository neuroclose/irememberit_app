/**
 * Verbal Speaking Processor
 * Handles processing of verbal speaking questions with progressive word removal
 */

export interface VerbalQuestion {
  displayText: string;
  fullText: string;
  stage: number;
  wordsRemoved: number;
  totalWords: number;
  removedWords: string[];
}

/**
 * Process verbal question with stage-based word removal
 * Stage 1: 10-15% words removed
 * Stage 9: 90-95% words removed
 */
export function processVerbalQuestion(
  text: string,
  stage: number
): VerbalQuestion {
  // Clean and split text into words
  const cleanText = text.trim();
  const words = cleanText.split(/\s+/);
  const totalWords = words.length;
  
  // Calculate how many words to remove based on stage (10% per stage)
  const removalPercentage = Math.min(stage * 10, 95);
  const minWordsToRemove = Math.floor(totalWords * (removalPercentage / 100));
  const maxWordsToRemove = Math.ceil(totalWords * ((removalPercentage + 5) / 100));
  const wordsToRemove = Math.min(
    Math.floor(Math.random() * (maxWordsToRemove - minWordsToRemove + 1)) + minWordsToRemove,
    totalWords
  );
  
  // Select random words to remove
  const indicesToRemove = new Set<number>();
  const removedWords: string[] = [];
  
  while (indicesToRemove.size < wordsToRemove) {
    const randomIndex = Math.floor(Math.random() * totalWords);
    if (!indicesToRemove.has(randomIndex)) {
      indicesToRemove.add(randomIndex);
      removedWords.push(words[randomIndex]);
    }
  }
  
  // Create display text with blanks (___) for removed words
  const displayWords = words.map((word, index) => 
    indicesToRemove.has(index) ? '___' : word
  );
  
  return {
    displayText: displayWords.join(' '),
    fullText: cleanText,
    stage,
    wordsRemoved: wordsToRemove,
    totalWords,
    removedWords,
  };
}

/**
 * Calculate accuracy using Levenshtein Distance algorithm
 * More forgiving than exact string comparison
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1      // insertion
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Check verbal answer against correct text
 * Uses Levenshtein Distance for more forgiving comparison
 */
export function checkVerbalAnswer(
  question: VerbalQuestion,
  spokenText: string
): {
  isCorrect: boolean;
  accuracy: number;
  correctAnswer: string;
  userAnswer: string;
} {
  // Normalize both texts for comparison
  const normalizeText = (text: string) => 
    text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  
  const normalizedCorrect = normalizeText(question.fullText);
  const normalizedSpoken = normalizeText(spokenText);
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedCorrect, normalizedSpoken);
  const maxLength = Math.max(normalizedCorrect.length, normalizedSpoken.length);
  
  // Calculate accuracy percentage (100% - error percentage)
  const accuracy = maxLength > 0 
    ? Math.max(0, 100 - (distance / maxLength) * 100)
    : 100;
  
  // Consider correct if accuracy >= 70%
  const isCorrect = accuracy >= 70;
  
  return {
    isCorrect,
    accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal place
    correctAnswer: question.fullText,
    userAnswer: spokenText,
  };
}
