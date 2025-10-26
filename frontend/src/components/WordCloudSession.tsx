import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WordCloudSessionProps {
  question: any;
  onSubmit: (answers: string[]) => void;
  onNext: () => void;
  showResult: boolean;
  isCorrect: boolean;
  feedback: any;
  isLoading: boolean;
  onPlayAgain?: () => void;
  onNextStage?: () => void;
  onGoHome?: () => void;
  onReturnToGames?: () => void;
  onPrevStage?: () => void;
  onNextStageNav?: () => void;
  currentStage?: number;
  completedStages?: Set<string>;
  moduleId?: string;
  learningMode?: string;
  highestUnlockedStage?: number;
}

export const WordCloudSession: React.FC<WordCloudSessionProps> = ({
  question,
  onSubmit,
  onNext,
  showResult,
  isCorrect,
  feedback,
  isLoading,
  onPlayAgain,
  onNextStage,
  onGoHome,
  onReturnToGames,
  onPrevStage,
  onNextStageNav,
  currentStage = 1,
  completedStages = new Set(),
  moduleId = '',
  learningMode = 'word_cloud',
  highestUnlockedStage = 1,
}) => {
  const [selectedWords, setSelectedWords] = useState<any[]>([]);
  const [availableWords, setAvailableWords] = useState<any[]>([]);
  const questionIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    console.log('[WordCloudSession] Question received:', JSON.stringify(question, null, 2));
    
    // Create a unique ID for this question based on its content
    const questionId = question ? JSON.stringify(question.words) + question.stage : null;
    
    // Only reset words if this is a NEW question (different from the previous one)
    if (questionId && questionId !== questionIdRef.current) {
      questionIdRef.current = questionId;
      
      if (question?.words && question?.decoys) {
        // Combine real words with decoys and shuffle
        const allWords = [...question.words, ...question.decoys];
        console.log('[WordCloudSession] ========== NEW QUESTION INITIALIZED ==========');
        console.log('[WordCloudSession] Original text:', question.originalText);
        console.log('[WordCloudSession] Correct words (count:', question.words.length, '):', question.words);
        console.log('[WordCloudSession] Decoy words (count:', question.decoys.length, '):', question.decoys);
        console.log('[WordCloudSession] Total available words (count:', allWords.length, '):', allWords);
        console.log('[WordCloudSession] ===================================================');
        const shuffled = allWords.sort(() => Math.random() - 0.5);
        setAvailableWords(shuffled);
        setSelectedWords([]);
      } else {
        console.warn('[WordCloudSession] Missing words or decoys!', { 
          hasWords: !!question?.words, 
          hasDecoys: !!question?.decoys,
          question
        });
      }
    } else {
      console.log('[WordCloudSession] Same question, preserving word state. Available:', availableWords.length, 'Selected:', selectedWords.length);
    }
  }, [question]);

  const handleWordPress = (wordItem: any) => {
    if (showResult) return;

    // Add word to selected
    setSelectedWords([...selectedWords, wordItem]);
    
    // Remove this specific word instance by ID
    const wordIndex = availableWords.findIndex(w => w.id === wordItem.id);
    if (wordIndex !== -1) {
      const newAvailableWords = [...availableWords];
      newAvailableWords.splice(wordIndex, 1);
      setAvailableWords(newAvailableWords);
    }
  };

  const handleRemoveWord = (index: number) => {
    if (showResult) return;

    const wordItem = selectedWords[index];
    setSelectedWords(selectedWords.filter((_, i) => i !== index));
    setAvailableWords([...availableWords, wordItem]);
  };

  const handleSubmit = () => {
    onSubmit(selectedWords);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Stage Navigation */}
      <View style={styles.stageNavigation}>
        <TouchableOpacity 
          style={[styles.stageNavButton, currentStage === 1 && styles.stageNavButtonDisabled]}
          onPress={() => {
            if (currentStage > 1 && onPrevStage) {
              onPrevStage();
            }
          }}
          disabled={currentStage === 1}
        >
          <Ionicons name="chevron-back" size={20} color={currentStage === 1 ? '#475569' : '#fff'} />
          <Text style={[styles.stageNavText, currentStage === 1 && styles.stageNavTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.stageIndicator}>Stage {currentStage} of 4</Text>
        
        <TouchableOpacity 
          style={[
            styles.stageNavButton, 
            (currentStage === 4 || currentStage >= highestUnlockedStage) && styles.stageNavButtonDisabled
          ]}
          onPress={() => {
            if (currentStage < 4 && currentStage < highestUnlockedStage && onNextStageNav) {
              onNextStageNav();
            }
          }}
          disabled={currentStage === 4 || currentStage >= highestUnlockedStage}
        >
          <Text style={[
            styles.stageNavText, 
            (currentStage === 9 || currentStage >= highestUnlockedStage) && styles.stageNavTextDisabled
          ]}>
            Next
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={(currentStage === 4 || currentStage >= highestUnlockedStage) ? '#475569' : '#fff'} 
          />
        </TouchableOpacity>
      </View>

      {/* Target Sentence Area */}
      <View style={styles.targetArea}>
        <Text style={styles.instruction}>Arrange the words in order:</Text>
        <View style={styles.sentenceContainer}>
          {selectedWords.length === 0 ? (
            <Text style={styles.placeholder}>Tap words below to build the sentence</Text>
          ) : (
            selectedWords.map((wordItem, index) => (
              <TouchableOpacity
                key={wordItem.id || `${wordItem.word}-${index}`}
                style={styles.selectedWord}
                onPress={() => handleRemoveWord(index)}
              >
                <Text style={styles.selectedWordText}>{wordItem.word}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Word Cloud */}
      {!showResult && (
        <View style={styles.cloudContainer}>
          <Text style={styles.cloudTitle}>Available Words:</Text>
          <View style={styles.wordCloud}>
            {availableWords.map((wordItem, index) => (
              <TouchableOpacity
                key={wordItem.id || `${wordItem.word}-${index}`}
                style={styles.cloudWord}
                onPress={() => handleWordPress(wordItem)}
              >
                <Text style={styles.cloudWordText}>{wordItem.word}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Result Feedback */}
      {showResult && (
        <>
          <View style={styles.resultCard}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={64}
              color={isCorrect ? '#10b981' : '#ef4444'}
            />
            <Text style={styles.resultText}>
              {isCorrect ? '✅ Perfect!' : (feedback?.accuracy >= 70 ? '✅ Passed!' : '❌ Try Again!')}
            </Text>
            {feedback?.accuracy !== undefined && (
              <Text style={styles.accuracyText}>
                Accuracy: {Math.round(feedback.accuracy)}%
              </Text>
            )}
            {isCorrect && feedback?.pointsEarned !== undefined && (
              <View style={styles.pointsBox}>
                <Ionicons name="trophy" size={24} color="#f59e0b" />
                <Text style={styles.pointsText}>+{feedback.pointsEarned} points!</Text>
              </View>
            )}
            {!isCorrect && question?.originalText && (
              <View style={styles.correctAnswerBox}>
                <Text style={styles.correctAnswerTitle}>Correct Answer:</Text>
                <Text style={styles.correctAnswerText}>{question.originalText}</Text>
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity 
              style={[styles.navButton, styles.homeButton]}
              onPress={onGoHome}
            >
              <Ionicons name="home" size={18} color="#fff" />
              <Text style={styles.navButtonText}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, styles.gamesButton]}
              onPress={onReturnToGames}
            >
              <Ionicons name="game-controller" size={18} color="#fff" />
              <Text style={styles.navButtonText}>Games</Text>
            </TouchableOpacity>
            
            {isCorrect ? (
              currentStage < 9 && (
                <TouchableOpacity 
                  style={[styles.navButton, styles.nextButton]}
                  onPress={onNextStage}
                >
                  <Text style={styles.navButtonText}>Next Stage</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity 
                style={[styles.navButton, styles.retryButton]}
                onPress={onPlayAgain}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.navButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Action Button */}
      {!showResult && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            selectedWords.length === 0 && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={selectedWords.length === 0 || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Checking...' : 'Check Answer'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  targetArea: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  instruction: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
    textAlign: 'center',
  },
  sentenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  selectedWord: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectedWordText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  cloudContainer: {
    flex: 1,
    marginBottom: 20,
  },
  cloudTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  wordCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  cloudWord: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cloudWordText: {
    fontSize: 16,
    color: '#e2e8f0',
  },
  resultCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  correctCard: {
    backgroundColor: '#10b98120',
    borderColor: '#10b981',
  },
  incorrectCard: {
    backgroundColor: '#ef444420',
    borderColor: '#ef4444',
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 8,
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 12,
  },
  correctAnswer: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stageNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  stageNavButtonDisabled: {
    backgroundColor: '#334155',
  },
  stageNavText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stageNavTextDisabled: {
    color: '#475569',
  },
  stageIndicator: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  correctAnswerBox: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  correctAnswerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  correctAnswerText: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 8,
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  homeButton: {
    backgroundColor: '#64748b',
  },
  gamesButton: {
    backgroundColor: '#f59e0b',
  },
  nextButton: {
    backgroundColor: '#10b981',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
