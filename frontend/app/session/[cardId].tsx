import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api.service';

export default function SessionScreen() {
  const { cardId, moduleId } = useLocalSearchParams();
  const [currentStage, setCurrentStage] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  const startSessionMutation = useMutation({
    mutationFn: () => apiService.startSession(cardId as string, 'fill_blank', currentStage),
    onSuccess: (data) => {
      setSessionId(data.id);
      setQuestion(data.question);
      setUserAnswers({});
      setShowResult(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start session');
    },
  });

  const checkAnswerMutation = useMutation({
    mutationFn: (answers: any) => apiService.checkAnswer(sessionId!, answers),
    onSuccess: (data) => {
      setIsCorrect(data.correct);
      setFeedback(data);
      setShowResult(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to check answer');
    },
  });

  const completeStageMutation = useMutation({
    mutationFn: () =>
      apiService.completeStage(sessionId!, cardId as string, 'fill_blank', currentStage),
    onSuccess: (data) => {
      if (currentStage < 9) {
        setCurrentStage(currentStage + 1);
        startSessionMutation.mutate();
      } else {
        Alert.alert('Congratulations!', 'You completed all stages!', [
          {
            text: 'Back to Module',
            onPress: () => router.back(),
          },
        ]);
      }
    },
  });

  useEffect(() => {
    startSessionMutation.mutate();
  }, []);

  const handleSubmit = () => {
    if (!sessionId) return;

    // Check if all blanks are filled
    const blankCount = question?.blanks?.length || 0;
    const answeredCount = Object.keys(userAnswers).length;

    if (answeredCount < blankCount) {
      Alert.alert('Incomplete', 'Please fill in all blanks before submitting.');
      return;
    }

    checkAnswerMutation.mutate({ answers: userAnswers });
  };

  const handleNext = () => {
    if (isCorrect) {
      completeStageMutation.mutate();
    } else {
      setShowResult(false);
      setUserAnswers({});
    }
  };

  const renderQuestion = () => {
    if (!question) return null;

    // Split text by blanks
    const parts = question.text?.split('___') || [];
    const blanks = question.blanks || [];

    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          {parts.map((part: string, index: number) => (
            <React.Fragment key={index}>
              {part}
              {index < blanks.length && (
                <View style={styles.inlineBlank}>
                  <TextInput
                    style={styles.blankInput}
                    value={userAnswers[index] || ''}
                    onChangeText={(text) =>
                      setUserAnswers({ ...userAnswers, [index]: text })
                    }
                    placeholder="___"
                    placeholderTextColor="#64748b"
                    editable={!showResult}
                    autoCapitalize="none"
                  />
                </View>
              )}
            </React.Fragment>
          ))}
        </Text>
      </View>
    );
  };

  if (startSessionMutation.isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          headerTitle: `Stage ${currentStage}/9`,
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentStage / 9) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>Stage {currentStage} of 9</Text>
          </View>

          {/* Question Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fill in the Blanks</Text>
            {renderQuestion()}
          </View>

          {/* Result Feedback */}
          {showResult && (
            <View
              style={[
                styles.resultCard,
                isCorrect ? styles.correctCard : styles.incorrectCard,
              ]}
            >
              <View style={styles.resultHeader}>
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={isCorrect ? '#10b981' : '#ef4444'}
                />
                <Text style={styles.resultTitle}>
                  {isCorrect ? 'Correct!' : 'Not Quite'}
                </Text>
              </View>
              {feedback?.correctAnswers && (
                <View style={styles.correctAnswers}>
                  <Text style={styles.correctAnswersTitle}>Correct answers:</Text>
                  {Object.entries(feedback.correctAnswers).map(([key, value]: any) => (
                    <Text key={key} style={styles.correctAnswer}>
                      • {value}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {!showResult ? (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={checkAnswerMutation.isPending}
            >
              {checkAnswerMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Check Answer</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isCorrect && styles.retryButton,
              ]}
              onPress={handleNext}
              disabled={completeStageMutation.isPending}
            >
              {completeStageMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isCorrect ? 'Next Stage' : 'Try Again'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  progressText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 16,
  },
  questionContainer: {
    minHeight: 100,
  },
  questionText: {
    fontSize: 18,
    color: '#e2e8f0',
    lineHeight: 28,
  },
  inlineBlank: {
    minWidth: 100,
  },
  blankInput: {
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#fff',
    minWidth: 100,
  },
  resultCard: {
    borderRadius: 16,
    padding: 24,
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
  correctAnswers: {
    marginTop: 16,
  },
  correctAnswersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  correctAnswer: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  actionContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButton: {
    backgroundColor: '#ef4444',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
