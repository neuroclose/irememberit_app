import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

interface VerbalSessionProps {
  question: any;
  onSubmit: (answer: string) => void;
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

export const VerbalSession: React.FC<VerbalSessionProps> = ({
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
  moduleId,
  learningMode = 'verbal',
  highestUnlockedStage = 1,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Debug: Log question data
    console.log('[VerbalSession] Question received:', JSON.stringify(question, null, 2));
    
    // Cleanup on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [question]);

  const handlePlayText = () => {
    if (question?.displayText) {
      setIsSpeaking(true);
      Speech.speak(question.displayText, {
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleStartRecording = async () => {
    try {
      console.log('[VerbalSession] Starting recording... Platform:', Platform.OS);
      
      // Web: Use browser MediaRecorder API
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        console.log('[VerbalSession] Using Web MediaRecorder API');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new (window as any).MediaRecorder(stream);
          
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event: any) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordingUri(audioUrl);
            // Simulate transcript for web
            setSpokenText(question?.fullText || question?.displayText || 'Your recorded answer');
            console.log('[VerbalSession] Web recording completed');
          };
          
          mediaRecorder.start();
          mediaRecorderRef.current = mediaRecorder;
          setIsRecording(true);
          console.log('[VerbalSession] Web recording started');
        } catch (webError) {
          console.error('[VerbalSession] Web recording failed:', webError);
          Alert.alert('Permission Required', 'Please allow microphone access to record your answer.');
        }
        return;
      }
      
      // Native: Use expo-av
      console.log('[VerbalSession] Using expo-av for native recording');
      const permission = await Audio.requestPermissionsAsync();
      console.log('[VerbalSession] Permission result:', permission);
      
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow microphone access to record your answer.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      console.log('[VerbalSession] Native recording created successfully');
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error: any) {
      console.error('[VerbalSession] Failed to start recording:', error);
      Alert.alert('Error', `Failed to start recording: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      
      // Web: Stop MediaRecorder
      if (Platform.OS === 'web' && mediaRecorderRef.current) {
        console.log('[VerbalSession] Stopping web recording');
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track: any) => track.stop());
        mediaRecorderRef.current = null;
        return;
      }
      
      // Native: Stop expo-av recording
      if (!recording) return;
      
      console.log('[VerbalSession] Stopping native recording');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);

      // For demo, simulate transcript
      const simulatedTranscript = question?.fullText || question?.displayText || 'Your recorded answer';
      setSpokenText(simulatedTranscript);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('[VerbalSession] Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording.');
    }
  };

  const handlePlayRecording = async () => {
    if (!recordingUri) return;

    try {
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Load and play
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingRecording(false);
          }
        }
      );
      setSound(newSound);
      setIsPlayingRecording(true);
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };

  const handleSubmit = () => {
    if (!spokenText) {
      Alert.alert('No Recording', 'Please record your answer first.');
      return;
    }
    onSubmit(spokenText);
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
        
        <Text style={styles.stageIndicator}>Stage {currentStage} of 9</Text>
        
        <TouchableOpacity 
          style={[
            styles.stageNavButton, 
            (currentStage === 9 || currentStage >= highestUnlockedStage) && styles.stageNavButtonDisabled
          ]}
          onPress={() => {
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

      {/* Text to Read */}
      <View style={styles.textCard}>
        <View style={styles.stageInfo}>
          <Text style={styles.stageText}>Stage {currentStage}</Text>
          <Text style={styles.removalText}>
            {(currentStage * 10)}% words removed
          </Text>
        </View>
        <Text style={styles.instruction}>Speak the complete phrase (including missing words):</Text>
        <View style={styles.textContainer}>
          <Text style={styles.textToRead}>{question?.displayText || 'Loading...'}</Text>
        </View>
      </View>

      {/* Recording Area */}
      {!showResult && (
        <View style={styles.recordingArea}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={64}
              color={isRecording ? '#fff' : '#6366f1'}
            />
          </TouchableOpacity>
          <Text style={styles.recordingText}>
            {isRecording
              ? 'Recording... Tap to stop'
              : spokenText
              ? 'Recording complete'
              : 'Tap to record your answer'}
          </Text>
        </View>
      )}

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
              {isCorrect ? 'Great pronunciation!' : 'Try again'}
            </Text>
          </View>

          {/* Points Earned (for correct answers) */}
          {isCorrect && feedback?.pointsEarned && (
            <View style={styles.pointsBox}>
              <Ionicons name="trophy" size={24} color="#f59e0b" />
              <Text style={styles.pointsText}>+{feedback.pointsEarned} points!</Text>
            </View>
          )}

          {/* Your Transcript */}
          {feedback?.userAnswer && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Your Transcript:</Text>
              <Text style={[
                styles.transcriptText,
                !isCorrect && styles.wrongTranscriptText
              ]}>
                {feedback.userAnswer}
              </Text>
              {recordingUri && (
                <TouchableOpacity
                  style={styles.playRecordingButtonSmall}
                  onPress={handlePlayRecording}
                  disabled={isPlayingRecording}
                >
                  <Ionicons
                    name={isPlayingRecording ? 'volume-high' : 'play-circle'}
                    size={18}
                    color="#6366f1"
                  />
                  <Text style={styles.playRecordingTextSmall}>
                    {isPlayingRecording ? 'Playing...' : 'Listen to recording'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Correct Answer */}
          {feedback?.correctAnswer && (
            <View style={styles.correctAnswerBox}>
              <Text style={styles.correctAnswerLabel}>
                {isCorrect ? 'Correct Phrase:' : 'The Correct Phrase Was:'}
              </Text>
              <Text style={styles.correctAnswerText}>{feedback.correctAnswer}</Text>
            </View>
          )}

          {/* Accuracy */}
          {feedback?.accuracy !== undefined && (
            <View style={styles.accuracyBox}>
              <Text style={styles.accuracyLabel}>Pronunciation Accuracy:</Text>
              <View style={styles.accuracyBarContainer}>
                <View style={styles.accuracyBar}>
                  <View 
                    style={[
                      styles.accuracyFill, 
                      { width: `${feedback.accuracy}%` },
                      { backgroundColor: feedback.accuracy >= 70 ? '#10b981' : '#ef4444' }
                    ]} 
                  />
                </View>
                <Text style={styles.accuracyText}>{Math.round(feedback.accuracy)}%</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Action Button */}
      {!showResult ? (
        <TouchableOpacity
          style={[
            styles.submitButton,
            !spokenText && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!spokenText || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Check Pronunciation</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.submitButton} onPress={onNext}>
          <Text style={styles.submitButtonText}>
            {isCorrect ? 'Next Stage' : 'Try Again'}
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
  textCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  stageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  instruction: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    textAlign: 'center',
  },
  textContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  textToRead: {
    fontSize: 20,
    color: '#e2e8f0',
    lineHeight: 32,
    textAlign: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  playButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  recordingArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6366f1',
    marginBottom: 16,
  },
  micButtonActive: {
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d',
  },
  recordingText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  playRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  playRecordingText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  playRecordingButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  playRecordingTextSmall: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
  },
  transcriptBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  wrongTranscriptText: {
    color: '#ef4444',
  },
  correctAnswerBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  correctAnswerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#10b981',
    lineHeight: 24,
  },
  accuracyBox: {
    marginTop: 12,
  },
  accuracyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  accuracyBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accuracyBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  accuracyFill: {
    height: '100%',
  },
  accuracyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    width: 50,
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
});
