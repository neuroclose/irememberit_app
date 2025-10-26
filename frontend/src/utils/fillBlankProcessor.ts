/**
 * Fill-in-the-Blank Question Processor
 * Handles word removal and choice generation based on stage progression
 */

interface BlankInfo {
  index: number;
  correctAnswer: string;
  choices: string[];
}

interface ProcessedQuestion {
  displayText: string;
  blanks: BlankInfo[];
  stage: number;
  originalText: string;
  correctAnswers: { [key: number]: string };
}

/**
 * Calculate the percentage of words to remove based on stage
 * Ensures at least one additional word is removed each stage
 */
function getRemovalPercentage(stage: number): number {
  // Stage 1: 10-15%, Stage 2: 20-25%, ..., Stage 9: 90-95%
  const basePercentage = stage * 10;
  const variance = Math.random() * 5;
  return Math.min(basePercentage + variance, 95);
}

/**
 * Calculate minimum number of words to remove for a stage
 * Ensures progressive difficulty
 */
function getMinimumWordsToRemove(stage: number, totalWords: number): number {
  // At least 1 word per stage, but respect total word count
  const minWords = Math.ceil(stage * 0.5) + 1;
  const percentageWords = Math.ceil((totalWords * stage * 10) / 100);
  return Math.min(Math.max(minWords, percentageWords), totalWords);
}

/**
 * Generate decoy words that are similar but incorrect
 */
function generateDecoys(correctWord: string, allWords: string[], count: number = 3): string[] {
  const decoys: string[] = [];
  const usedWords = new Set<string>([correctWord.toLowerCase()]);
  
  // Filter out the correct word and get candidates
  const candidates = allWords.filter(w => 
    w.toLowerCase() !== correctWord.toLowerCase() &&
    w.length > 2 // Avoid very short words as decoys
  );
  
  // If we have common words list, prioritize those
  const commonWords = ['the', 'a', 'is', 'are', 'was', 'were', 'have', 'has', 'do', 'does', 
    'you', 'your', 'my', 'their', 'his', 'her', 'it', 'this', 'that', 'these', 'those',
    'can', 'could', 'would', 'should', 'will', 'may', 'might', 'must', 'need', 'want'];
  
  // Try to get words with similar length first
  const similarLength = candidates.filter(w => 
    Math.abs(w.length - correctWord.length) <= 2
  );
  
  // Shuffle and pick decoys
  const pool = [...similarLength, ...candidates, ...commonWords]
    .filter(w => !usedWords.has(w.toLowerCase()));
  
  for (let i = 0; i < pool.length && decoys.length < count; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const word = pool.splice(randomIndex, 1)[0];
    if (word && !usedWords.has(word.toLowerCase())) {
      decoys.push(word);
      usedWords.add(word.toLowerCase());
    }
  }
  
  // If we don't have enough decoys, generate simple variations
  while (decoys.length < count) {
    const variation = correctWord + (decoys.length + 1);
    if (!usedWords.has(variation.toLowerCase())) {
      decoys.push(variation);
      usedWords.add(variation.toLowerCase());
    }
  }
  
  return decoys;
}

/**
 * Process a text phrase into a fill-in-blank question
 */
export function processFillBlankQuestion(
  originalText: string,
  stage: number,
  allModuleWords?: string[]
): ProcessedQuestion {
  // Clean and split the text into words
  const cleanText = originalText.trim();
  const words = cleanText.split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords === 0) {
    return {
      displayText: cleanText,
      blanks: [],
      stage,
      originalText: cleanText,
      correctAnswers: {},
    };
  }
  
  // Calculate how many words to remove
  const removalPercentage = getRemovalPercentage(stage);
  const minWordsToRemove = getMinimumWordsToRemove(stage, totalWords);
  const wordsToRemove = Math.max(
    Math.ceil((totalWords * removalPercentage) / 100),
    minWordsToRemove
  );
  
  // Randomly select which words to remove (avoid removing all words)
  const maxRemovable = Math.max(1, totalWords - 1);
  const actualWordsToRemove = Math.min(wordsToRemove, maxRemovable);
  
  // Create array of word indices and shuffle
  const wordIndices = Array.from({ length: totalWords }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = wordIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordIndices[i], wordIndices[j]] = [wordIndices[j], wordIndices[i]];
  }
  
  // Select indices to remove
  const indicesToRemove = wordIndices.slice(0, actualWordsToRemove).sort((a, b) => a - b);
  
  // Build the display text and blanks info
  const blanks: BlankInfo[] = [];
  const correctAnswers: { [key: number]: string } = {};
  let displayText = '';
  let currentBlankIndex = 0;
  
  // Use module words or extract from text for decoy generation
  const decoyPool = allModuleWords && allModuleWords.length > 0 
    ? allModuleWords 
    : words;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isBlank = indicesToRemove.includes(i);
    
    if (isBlank) {
      // This word should be a blank
      const correctAnswer = word;
      const decoys = generateDecoys(correctAnswer, decoyPool, 3);
      const allChoices = [correctAnswer, ...decoys];
      
      // Shuffle choices
      for (let j = allChoices.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [allChoices[j], allChoices[k]] = [allChoices[k], allChoices[j]];
      }
      
      blanks.push({
        index: currentBlankIndex,
        correctAnswer,
        choices: allChoices,
      });
      
      correctAnswers[currentBlankIndex] = correctAnswer;
      displayText += '___';
      currentBlankIndex++;
    } else {
      // This word is visible
      displayText += word;
    }
    
    // Add space after each word except the last
    if (i < words.length - 1) {
      displayText += ' ';
    }
  }
  
  return {
    displayText,
    blanks,
    stage,
    originalText: cleanText,
    correctAnswers,
  };
}

/**
 * Check if the user's answers are correct
 */
export function checkFillBlankAnswers(
  processedQuestion: ProcessedQuestion,
  userAnswers: { [key: number]: string }
): {
  correct: boolean;
  accuracy: number;
  correctAnswers: { [key: number]: string };
  pointsEarned: number;
} {
  const totalBlanks = processedQuestion.blanks.length;
  let correctCount = 0;
  
  processedQuestion.blanks.forEach((blank) => {
    const userAnswer = userAnswers[blank.index];
    if (userAnswer && userAnswer.toLowerCase() === blank.correctAnswer.toLowerCase()) {
      correctCount++;
    }
  });
  
  const accuracy = totalBlanks > 0 ? (correctCount / totalBlanks) * 100 : 0;
  const correct = correctCount === totalBlanks;
  
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
    correct,
    accuracy,
    correctAnswers: processedQuestion.correctAnswers,
    pointsEarned,
  };
}
