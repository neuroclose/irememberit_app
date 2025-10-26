import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FillBlankSessionProps {
  question: any;
  onSubmit: (answers: any) => void;
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

export const FillBlankSession: React.FC<FillBlankSessionProps> = ({
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
  learningMode = 'fill_blank',
  highestUnlockedStage = 1,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [currentBlankIndex, setCurrentBlankIndex] = useState(0);
  const [blanks, setBlanks] = useState<any[]>([]);

  useEffect(() => {
    console.log('[FillBlankSession] Question received:', JSON.stringify(question, null, 2));
    if (question?.blanks) {
      console.log('[FillBlankSession] Setting blanks:', question.blanks.length);
      setBlanks(question.blanks);
      setSelectedAnswers({});
      setCurrentBlankIndex(0);
    } else {
      console.warn('[FillBlankSession] No blanks found in question!');
    }
  }, [question]);

  const handleChoicePress = (blankIndex: number, choice: string) => {
    if (showResult) return;
    
    const newAnswers = { ...selectedAnswers, [blankIndex]: choice };
    setSelectedAnswers(newAnswers);
    
    // Auto-advance to next blank if not the last one
    if (blankIndex < blanks.length - 1) {
      setCurrentBlankIndex(blankIndex + 1);
    }
  };

  const handleBlankPress = (index: number) => {
    if (showResult) return;
    setCurrentBlankIndex(index);
  };

  const handleSubmit = () => {
    // Check if all blanks are filled
    if (Object.keys(selectedAnswers).length < blanks.length) {
      return;
    }
    onSubmit({ answers: selectedAnswers });
  };

  const renderPhrase = () => {
    if (!question?.displayText) {
      console.log('[FillBlankSession] No displayText found, question:', question);
      return (
        <View style={styles.phraseContainer}>
          <Text style={styles.errorText}>
            Error: No question text available. Question data: {JSON.stringify(question)}
          </Text>
        </View>
      );
    }

    const parts = question.displayText.split('___');
    
    return (
      <View style={styles.phraseContainer}>
        {parts.map((part: string, index: number) => (
          <React.Fragment key={index}>
            <Text style={styles.phraseText}>{part}</Text>
            {index < blanks.length && (
              <TouchableOpacity
                style={[
                  styles.blankBox,
                  currentBlankIndex === index && !showResult && styles.blankBoxActive,
                  selectedAnswers[index] && styles.blankBoxFilled,
                ]}
                onPress={() => handleBlankPress(index)}
                disabled={showResult}
              >
                <Text style={[
                  styles.blankText,
                  selectedAnswers[index] && styles.blankTextFilled,
                ]}>
                  {selectedAnswers[index] || `Blank ${index + 1}`}
                </Text>
              </TouchableOpacity>
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const currentBlank = blanks[currentBlankIndex];

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
        
        <Text style={styles.stageIndicator}>Stage {currentStage} of 9</Text>
        
        <TouchableOpacity 
          style={[
            styles.stageNavButton, 
            (currentStage === 9 || currentStage >= highestUnlockedStage) && styles.stageNavButtonDisabled
          ]}
          onPress={() => {
            console.log(`[FillBlank Nav] Current: ${currentStage}, Highest: ${highestUnlockedStage}, Disabled: ${currentStage >= highestUnlockedStage}`);
            if (currentStage < 9 && currentStage < highestUnlockedStage && onNextStageNav) {
              onNextStageNav();
            }
          }}
          disabled={currentStage === 9 || currentStage >= highestUnlockedStage}
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
            color={(currentStage === 9 || currentStage >= highestUnlockedStage) ? '#475569' : '#fff'} 
          />
        </TouchableOpacity>
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <View style={styles.stageInfo}>
          <Text style={styles.stageText}>Stage {question?.stage || 1}</Text>
          <Text style={styles.removalText}>
            {((question?.stage || 1) * 10)}% words removed
          </Text>
        </View>
        {renderPhrase()}
      </View>

      {/* Current Blank Indicator */}
      {!showResult && blanks.length > 0 && (
        <View style={styles.currentBlankCard}>
          <Text style={styles.currentBlankLabel}>
            Selecting for: Blank {currentBlankIndex + 1} of {blanks.length}
          </Text>
          <View style={styles.progressDots}>
            {blanks.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentBlankIndex && styles.progressDotActive,
                  selectedAnswers[index] && styles.progressDotFilled,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Choices */}
      {!showResult && currentBlank && (
        <View style={styles.choicesContainer}>
          <Text style={styles.choicesLabel}>Choose the correct word:</Text>
          <View style={styles.choicesGrid}>
            {currentBlank.choices?.map((choice: string, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.choiceButton,
                  selectedAnswers[currentBlankIndex] === choice && styles.choiceButtonSelected,
                ]}
                onPress={() => handleChoicePress(currentBlankIndex, choice)}
              >
                <Text style={[
                  styles.choiceText,
                  selectedAnswers[currentBlankIndex] === choice && styles.choiceTextSelected,
                ]}>
                  {choice}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Result Feedback */}
      {showResult && (
        <>
          <View
            style={[
              styles.resultCard,
              isCorrect ? styles.correctCard : styles.incorrectCard,
            ]}
          >
            <View style={styles.resultHeader}>
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : (feedback?.accuracy >= 70 ? 'checkmark-circle' : 'close-circle')}
                size={48}
                color={isCorrect ? '#10b981' : (feedback?.accuracy >= 70 ? '#10b981' : '#ef4444')}
              />
              <Text style={styles.resultTitle}>
                {isCorrect ? 'Perfect!' : (feedback?.accuracy >= 70 ? 'Passed!' : 'Try Again')}
              </Text>
            </View>

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
            
            {/* Correct Answer Display - Only show when WRONG */}
            {!isCorrect && question?.originalText && (
              <View style={styles.correctAnswerBox}>
                <Text style={styles.correctAnswerTitle}>Correct Answer:</Text>
                <View style={styles.correctAnswerText}>
                  {question.originalText.split(' ').map((word: string, idx: number) => {
                    const isBlankWord = question.blanks.some((blank: any) => 
                      blank.correctAnswer.toLowerCase() === word.toLowerCase()
                    );
                    return (
                      <Text
                        key={idx}
                        style={[
                          styles.answerWord,
                          isBlankWord && styles.highlightedWord
                        ]}
                      >
                        {word}{' '}
                      </Text>
                    );
                  })}
                </View>
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

      {/* Action Button - Only show when not showing results */}
      {!showResult && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            Object.keys(selectedAnswers).length < blanks.length && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={Object.keys(selectedAnswers).length < blanks.length || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Checking...' : 'Check Answers'}
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
  questionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  stageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  removalText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  phraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  phraseText: {
    fontSize: 18,
    color: '#e2e8f0',
    lineHeight: 32,
  },
  blankBox: {
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
  },
  blankBoxActive: {
    borderColor: '#6366f1',
    backgroundColor: '#312e81',
  },
  blankBoxFilled: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  blankText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  blankTextFilled: {
    color: '#10b981',
    fontWeight: '600',
  },
  currentBlankCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  currentBlankLabel: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#475569',
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  progressDotFilled: {
    backgroundColor: '#10b981',
  },
  choicesContainer: {
    marginBottom: 20,
  },
  choicesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#475569',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  choiceButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#312e81',
  },
  choiceText: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  choiceTextSelected: {
    color: '#6366f1',
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
  },
  correctCard: {
    backgroundColor: '#10b98120',
    borderColor: '#10b981',
  },
  incorrectCard: {
    backgroundColor: '#ef444420',
    borderColor: '#ef4444',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 12,
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b20',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  answerWord: {
    fontSize: 18,
    color: '#e2e8f0',
    lineHeight: 28,
  },
  highlightedWord: {
    color: '#10b981',
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 4,
    borderRadius: 4,
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
  stageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
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
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    padding: 16,
  },
});
