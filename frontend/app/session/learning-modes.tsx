import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api.service';
import { FillBlankSession } from '../../src/components/FillBlankSession';
import { WordCloudSession } from '../../src/components/WordCloudSession';
import { VerbalSession } from '../../src/components/VerbalSession';
import { processFillBlankQuestion, checkFillBlankAnswers } from '../../src/utils/fillBlankProcessor';
import { processWordCloudQuestion, checkWordCloudAnswer } from '../../src/utils/wordCloudProcessor';
import { processVerbalQuestion, checkVerbalAnswer } from '../../src/utils/verbalProcessor';
import { calculatePoints, StageCompletion } from '../../src/utils/gamificationEngine';
import { useAuthStore } from '../../src/store/auth.store';

type LearningMode = 'fill_blank' | 'word_cloud' | 'verbal';

export default function LearningModesScreen() {
  const { cardId, moduleId, moduleDataJson } = useLocalSearchParams<{ cardId: string; moduleId: string; moduleDataJson?: string }>();
  const { user } = useAuthStore();
  
  // Parse module data immediately from params if available
  const initialModuleData = useMemo(() => {
    if (moduleDataJson) {
      try {
        const parsed = JSON.parse(decodeURIComponent(moduleDataJson as string));
        console.log('[INIT] Module data parsed from params:', parsed);
        console.log('[INIT] Cards available:', parsed?.cards?.length);
        return parsed;
      } catch (error) {
        console.error('[INIT] Failed to parse moduleDataJson:', error);
        return null;
      }
    }
    return null;
  }, [moduleDataJson]);
  
  const [selectedMode, setSelectedMode] = useState<LearningMode | null>(null);
  const [currentStage, setCurrentStage] = useState(1);
  const [sessionData, setSessionData] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [pointsAwarded, setPointsAwarded] = useState<Map<string, number>>(new Map());
  const [highestUnlockedStage, setHighestUnlockedStage] = useState(1);
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [moduleData, setModuleData] = useState<any>(initialModuleData);
  const [modeProgress, setModeProgress] = useState({
    fill_blank: { completed: 0, total: 9 },
    word_cloud: { completed: 0, total: 4 },
    verbal: { completed: 0, total: 9 },
  });
  
  // Fetch card data directly from API
  const { data: cardData } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => apiService.getCardById(cardId as string),
    enabled: !!cardId,
  });
  
  // Fetch user stats for header
  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => user ? apiService.getUserStats(user.id) : null,
    enabled: !!user?.id,
  });

  const totalPoints = userStats?.totalPoints || user?.totalPoints || 0;
  const rank = userStats?.rank || user?.rank || 'N/A';
  const hasOrganization = !!user?.organizationId;
  
  useEffect(() => {
    if (cardData) {
      console.log('[API] Card data loaded:', cardData);
      // Set moduleData with the card as a single-card array for compatibility
      setModuleData({
        id: moduleId,
        cards: [cardData],
      });
    }
  }, [cardData, moduleId]);

  // Load progress from backend on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const user = useAuthStore.getState().user;
        if (user && moduleId) {
          const progress = await apiService.getProgress(user.id, moduleId as string);
          console.log('Loaded progress from backend:', progress);
          
          // Load completed stages
          const completed = new Set(Object.keys(progress.completedStages || {}));
          setCompletedStages(completed);
          
          // Load points awarded map
          const pointsMap = new Map();
          Object.entries(progress.completedStages || {}).forEach(([key, data]: [string, any]) => {
            pointsMap.set(key, data.pointsEarned);
          });
          setPointsAwarded(pointsMap);
          
          // Calculate progress per mode
          const fillBlankCompleted = new Set<number>();
          const wordCloudCompleted = new Set<number>();
          const verbalCompleted = new Set<number>();
          
          completed.forEach((stageKey) => {
            const [stage, mode] = stageKey.split('-');
            const stageNum = parseInt(stage, 10);
            if (mode === 'fill_blank') fillBlankCompleted.add(stageNum);
            else if (mode === 'word_cloud') wordCloudCompleted.add(stageNum);
            else if (mode === 'verbal') verbalCompleted.add(stageNum);
          });
          
          setModeProgress({
            fill_blank: { completed: fillBlankCompleted.size, total: 9 },
            word_cloud: { completed: wordCloudCompleted.size, total: 4 },
            verbal: { completed: verbalCompleted.size, total: 9 },
          });
          
          console.log('Progress loaded successfully');
          console.log('Completed stages:', Object.keys(progress.completedStages || {}));
          console.log('Mode progress:', {
            fill_blank: fillBlankCompleted.size,
            word_cloud: wordCloudCompleted.size,
            verbal: verbalCompleted.size,
          });
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setProgressLoaded(true);
      }
    };
    
    loadProgress();
  }, [moduleId]);

  const startSessionMutation = useMutation({
    mutationFn: async ({ mode }: { mode: LearningMode }) => {
      try {
        const response = await apiService.startSession(moduleId as string, mode, currentStage);
        return response;
      } catch (error) {
        console.log('API startSession failed, using mock data:', error);
        // Mock data for testing
        return {
          moduleId: moduleId as string,
          content: {
            text: 'Do you have a food allergy?',
            words: ['Do', 'you', 'have', 'a', 'food', 'allergy'],
          },
          stage: currentStage,
          learningType: mode,
        };
      }
    },
    onSuccess: (data) => {
      console.log('Session started - Full data:', JSON.stringify(data, null, 2));
      setSessionData(data);
      setSessionStartTime(Date.now());
      
      // Get the module data from moduleData to extract original text
      const module = moduleData;
      let originalText = '';
      
      console.log('[DEBUG] Looking for card with cardId:', cardId);
      console.log('[DEBUG] Module has cards:', module?.cards?.length);
      if (module?.cards) {
        console.log('[DEBUG] Card IDs in module:', module.cards.map((c: any) => ({ id: c.id, _id: c._id })));
      }
      
      // Try to get original text from the specific card
      if (module && cardId) {
        // First, try to find the specific card in the module's cards array
        const card = module.cards?.find((c: any) => c.id === cardId || c._id === cardId);
        
        if (card) {
          console.log('[DEBUG] Found card:', card);
          // Extract text from the card
          if (typeof card.content === 'string') {
            originalText = card.content;
          } else if (card.content?.text) {
            originalText = card.content.text;
          } else if (card.text) {
            originalText = card.text;
          }
        } else {
          console.warn('[DEBUG] Card not found in module.cards, falling back to module content');
          console.warn('[DEBUG] Searched for cardId:', cardId);
          console.warn('[DEBUG] Available cards:', module.cards);
          // Fallback to module content if card not found
          if (typeof module.content === 'string') {
            originalText = module.content;
          } else if (module.content?.text) {
            originalText = module.content.text;
          } else if (module.text) {
            originalText = module.text;
          }
        }
      }
      
      console.log('Original text from card:', originalText);
      
      // Fallback: try to extract from session data
      if (!originalText) {
        if (typeof data.content === 'string') {
          originalText = data.content;
        } else if (data.content?.text) {
          originalText = data.content.text;
        } else if (data.content?.content) {
          originalText = data.content.content;
        } else if (data.text) {
          originalText = data.text;
        }
      }
      
      console.log('Extracted text to process:', originalText);
      
      // Process the content based on learning mode
      if (selectedMode === 'fill_blank') {
        let textToProcess = originalText;
        const moduleWords = module?.words || data.content?.words || data.words || [];
        console.log('Module words:', moduleWords);
        
        if (!textToProcess) {
          console.error('No text found to process!', data);
          // Set a default question for testing
          textToProcess = 'Do you have a food allergy?';
        }
        
        // Process the text into a fill-in-blank question
        const processedQuestion = processFillBlankQuestion(
          textToProcess,
          currentStage,
          moduleWords
        );
        
        console.log('Processed fill-blank question:', JSON.stringify(processedQuestion, null, 2));
        setQuestion(processedQuestion);
      } else if (selectedMode === 'word_cloud') {
        let textToProcess = originalText;
        const moduleWords = module?.words || data.content?.words || [];
        
        console.log('Raw API data for word cloud:', JSON.stringify(data, null, 2));
        console.log('Extracted text for word cloud:', textToProcess);
        console.log('Module words:', moduleWords);
        
        if (!textToProcess) {
          console.error('No text found to process for word cloud!', data);
          // Set a default question for testing
          textToProcess = 'Do you have a food allergy?';
        }
        
        // Process the text into a word cloud question
        const processedQuestion = processWordCloudQuestion(
          textToProcess,
          currentStage,
          moduleWords
        );
        
        console.log('Processed word cloud question:', JSON.stringify(processedQuestion, null, 2));
        setQuestion(processedQuestion);
      } else if (selectedMode === 'verbal') {
        // For verbal mode, process with word removal
        let textToProcess = originalText;
        
        if (!textToProcess) {
          console.error('No text found to process for verbal!', data);
          // Set a default question for testing
          textToProcess = 'Do you have a food allergy?';
        }
        
        // Process the text into a verbal speaking question
        const processedQuestion = processVerbalQuestion(textToProcess, currentStage);
        
        console.log('Processed verbal question:', JSON.stringify(processedQuestion, null, 2));
        setQuestion(processedQuestion);
      } else {
        // For other modes, use content as-is
        setQuestion(data.content);
      }
      
      setShowResult(false);
    },
    onError: (error: any) => {
      console.error('Start session error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start session');
    },
  });

  const checkAnswerMutation = useMutation({
    mutationFn: async (answers: any) => {
      // Calculate time spent
      const timeSpent = sessionStartTime > 0 ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
      
      // For fill-in-blank, use local checking with the processed question
      if (selectedMode === 'fill_blank' && question?.blanks) {
        const result = checkFillBlankAnswers(question, answers.answers);
        
        // Calculate proper points using gamification engine
        const stageKey = `${currentStage}-fill_blank`;
        const isFirstPass = !completedStages.has(stageKey);
        const hasBeenAwarded = pointsAwarded.has(stageKey);
        
        // Only award points if this is the first time completing this stage
        // Pass threshold is 70% accuracy
        const passed = result.accuracy >= 70;
        let finalPoints = 0;
        let pointsCalc = null;
        
        if (passed && !hasBeenAwarded) {
          pointsCalc = calculatePoints({
            stage: currentStage,
            moduleId: moduleId as string,
            cardId: cardId as string || 'unknown',
            learningType: 'fill_blank',
            accuracy: result.accuracy,
            timeSpent,
            isFirstPass,
            isOnTime: false, // TODO: Check if module has deadline
            completedAt: new Date(),
          });
          
          finalPoints = pointsCalc.totalPoints;
          
          console.log('Points calculation:', pointsCalc);
          console.log('Points awarded for first completion');
          
          // Mark stage as completed and points awarded
          setCompletedStages(prev => new Set([...prev, stageKey]));
          setPointsAwarded(prev => new Map(prev).set(stageKey, finalPoints));
          
          // Update highest unlocked stage (unlock next stage)
          if (currentStage < 9) {
            setHighestUnlockedStage(Math.max(highestUnlockedStage, currentStage + 1));
          }
          
          // Save to backend
          const user = useAuthStore.getState().user;
          if (user) {
            try {
              await apiService.saveProgress({
                userId: user.id,
                moduleId: moduleId as string,
                cardId: cardId as string || 'unknown',
                stage: currentStage,
                learningType: 'fill_blank',
                pointsEarned: finalPoints,
                timeSpent,
                accuracy: result.accuracy,
                completedAt: new Date().toISOString(),
                pointsBreakdown: pointsCalc
              });
              console.log('Progress saved to backend successfully');
            } catch (error) {
              console.error('Failed to save progress to backend:', error);
            }
          }
        } else if (result.correct && hasBeenAwarded) {
          console.log('Stage already completed - no points awarded');
          finalPoints = 0;
          pointsCalc = {
            totalPoints: 0,
            breakdown: ['Already completed - no additional points'],
            basePoints: 0,
            firstPassBonus: 0,
            speedBonus: 0,
            onTimeBonus: 0,
          };
        } else if (!result.correct) {
          console.log('Incorrect answer - no points awarded, recording failed attempt');
          // Still save the failed attempt with actual accuracy to track performance
          const user = useAuthStore.getState().user;
          if (user) {
            try {
              await apiService.saveProgress({
                userId: user.id,
                moduleId: moduleId as string,
                cardId: cardId as string || 'unknown',
                stage: currentStage,
                learningType: 'fill_blank',
                pointsEarned: 0,
                timeSpent,
                accuracy: result.accuracy,  // Save actual accuracy (not 100%)
                completedAt: new Date().toISOString(),
                pointsBreakdown: { totalPoints: 0, breakdown: ['Failed attempt - no points'] }
              });
              console.log(`Failed attempt saved: ${result.accuracy}% accuracy`);
            } catch (error) {
              console.error('Failed to save failed attempt:', error);
            }
          }
        }
        
        return {
          ...result,
          pointsEarned: finalPoints,
          pointsBreakdown: pointsCalc?.breakdown || [],
          basePoints: pointsCalc?.basePoints || 0,
          bonuses: {
            firstPass: pointsCalc?.firstPassBonus || 0,
            speed: pointsCalc?.speedBonus || 0,
            onTime: pointsCalc?.onTimeBonus || 0,
          },
        };
      }
      
      // For word cloud, use local checking
      if (selectedMode === 'word_cloud' && question?.correctOrder) {
        const result = checkWordCloudAnswer(question, answers);
        
        // Calculate proper points
        const stageKey = `${currentStage}-word_cloud`;
        const isFirstPass = !completedStages.has(stageKey);
        const hasBeenAwarded = completedStages.has(stageKey);
        
        let finalPoints = 0;
        let pointsCalc: any = null;
        
        // Pass threshold is 70% accuracy
        const passed = result.accuracy >= 70;
        
        if (passed && isFirstPass) {
          // Award points only on first successful completion
          pointsCalc = calculatePoints({
            stage: currentStage,
            moduleId: moduleId as string,
            cardId: cardId as string || 'unknown',
            learningType: 'word_cloud',
            accuracy: result.accuracy,
            timeSpent,
            isFirstPass,
            isOnTime: false,
            completedAt: new Date(),
          });
          
          finalPoints = pointsCalc.totalPoints;
          setCompletedStages(prev => new Set([...prev, stageKey]));
          
          // Update highest unlocked stage (unlock next stage)
          if (currentStage < 9) {
            setHighestUnlockedStage(Math.max(highestUnlockedStage, currentStage + 1));
          }
          
          // Save to backend
          const user = useAuthStore.getState().user;
          if (user) {
            try {
              await apiService.saveProgress({
                userId: user.id,
                moduleId: moduleId as string,
                cardId: cardId as string || 'unknown',
                stage: currentStage,
                learningType: 'word_cloud',
                pointsEarned: finalPoints,
                timeSpent,
                accuracy: result.accuracy,
                completedAt: new Date().toISOString(),
                pointsBreakdown: pointsCalc
              });
              console.log('Word cloud progress saved to backend');
            } catch (error) {
              console.error('Failed to save word cloud progress:', error);
            }
          }
        } else if (result.correct && hasBeenAwarded) {
          console.log('Word cloud stage already completed - no points awarded');
          finalPoints = 0;
          pointsCalc = {
            totalPoints: 0,
            breakdown: ['Already completed - no additional points'],
            basePoints: 0,
            firstPassBonus: 0,
            speedBonus: 0,
            onTimeBonus: 0,
          };
        } else if (!result.correct) {
          console.log('Word cloud incorrect - no points awarded, recording failed attempt');
          // Still save the failed attempt with actual accuracy to track performance
          const user = useAuthStore.getState().user;
          if (user) {
            try {
              await apiService.saveProgress({
                userId: user.id,
                moduleId: moduleId as string,
                cardId: cardId as string || 'unknown',
                stage: currentStage,
                learningType: 'word_cloud',
                pointsEarned: 0,
                timeSpent,
                accuracy: result.accuracy,  // Save actual accuracy (not 100%)
                completedAt: new Date().toISOString(),
                pointsBreakdown: { totalPoints: 0, breakdown: ['Failed attempt - no points'] }
              });
              console.log(`Word cloud failed attempt saved: ${result.accuracy}% accuracy`);
            } catch (error) {
              console.error('Failed to save word cloud failed attempt:', error);
            }
          }
        }
        
        return {
          ...result,
          pointsEarned: finalPoints,
          pointsBreakdown: pointsCalc?.breakdown || [],
        };
      }
      
      // For verbal mode, use local checking
      if (selectedMode === 'verbal' && question?.fullText) {
        const result = checkVerbalAnswer(question, answers.spokenText || answers.answer || '');
        
        // Calculate proper points
        const stageKey = `${currentStage}-verbal`;
        const isFirstPass = !completedStages.has(stageKey);
        const hasBeenAwarded = completedStages.has(stageKey);
        
        let finalPoints = 0;
        let pointsCalc: any = null;
        
        // Pass threshold is 70% accuracy
        const passed = result.accuracy >= 70;
        
        if (passed && !hasBeenAwarded) {
          pointsCalc = calculatePoints({
            stage: currentStage,
            moduleId: moduleId as string,
            cardId: cardId as string || 'unknown',
            learningType: 'verbal',
            accuracy: result.accuracy,
            timeSpent,
            isFirstPass,
            isOnTime: false,
            completedAt: new Date(),
          });
          
          finalPoints = pointsCalc.totalPoints;
          
          console.log('Verbal points calculation:', pointsCalc);
          
          // Mark stage as completed
          setCompletedStages(prev => new Set([...prev, stageKey]));
          setPointsAwarded(prev => new Map(prev).set(stageKey, finalPoints));
          
          // Update highest unlocked stage (unlock next stage)
          if (currentStage < 9) {
            setHighestUnlockedStage(Math.max(highestUnlockedStage, currentStage + 1));
          }
          
          // Save to backend
          const user = useAuthStore.getState().user;
          if (user) {
            try {
              await apiService.saveProgress({
                userId: user.id,
                moduleId: moduleId as string,
                cardId: cardId as string || 'unknown',
                stage: currentStage,
                learningType: 'verbal',
                pointsEarned: finalPoints,
                timeSpent,
                accuracy: result.accuracy,
                completedAt: new Date().toISOString(),
                pointsBreakdown: pointsCalc
              });
              console.log('Verbal progress saved to backend successfully');
            } catch (error) {
              console.error('Failed to save verbal progress:', error);
            }
          }
        } else if (passed && hasBeenAwarded) {
          console.log('Verbal stage already completed - no points awarded');
          finalPoints = 0;
        } else if (!passed) {
          console.log('Verbal incorrect answer - recording failed attempt');
          // Save failed attempt
          const user = useAuthStore.getState().user;
          if (user) {
            try {
              await apiService.saveProgress({
                userId: user.id,
                moduleId: moduleId as string,
                cardId: cardId as string || 'unknown',
                stage: currentStage,
                learningType: 'verbal',
                pointsEarned: 0,
                timeSpent,
                accuracy: result.accuracy,
                completedAt: new Date().toISOString(),
                pointsBreakdown: { totalPoints: 0, breakdown: ['Failed attempt - no points'] }
              });
              console.log(`Verbal failed attempt saved: ${result.accuracy}% accuracy`);
            } catch (error) {
              console.error('Failed to save verbal failed attempt:', error);
            }
          }
        }
        
        return {
          correct: result.isCorrect,
          isCorrect: result.isCorrect,
          accuracy: result.accuracy,
          correctAnswer: result.correctAnswer,
          userAnswer: result.userAnswer,
          pointsEarned: finalPoints,
          pointsBreakdown: pointsCalc?.breakdown || [],
        };
      }
      
      // Try to call backend for other modes, fallback to simulation
      try {
        const response = await apiService.checkAnswer(sessionData.moduleId, {
          ...answers,
          moduleId: sessionData.moduleId,
          stage: currentStage,
          learningType: selectedMode,
        });
        return response;
      } catch (error) {
        console.log('Backend check failed, simulating locally:', error);
        // Simulate answer checking with proper feedback structure
        const isCorrect = Math.random() > 0.3; // 70% success rate for demo
        return {
          correct: isCorrect,
          pointsEarned: isCorrect ? 10 : 0,
          accuracy: isCorrect ? 95 : 45,
          correctAnswer: question?.text || question?.displayText || question?.originalText || 'Sample text',
          userAnswer: answers.answer || answers.spokenText || 'User response',
          feedback: isCorrect ? 'Great job!' : 'Try again!',
        };
      }
    },
    onSuccess: (data) => {
      setIsCorrect(data.correct);
      setFeedback(data);
      setShowResult(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', 'Failed to check answer');
    },
  });

  const completeStageMutation = useMutation({
    mutationFn: () => {
      // Simulate completing stage
      return Promise.resolve({ success: true, pointsEarned: 10 });
    },
    onSuccess: (data) => {
      if (currentStage < 9) {
        Alert.alert('Stage Complete!', `You earned ${data.pointsEarned} points!`, [
          {
            text: 'Continue',
            onPress: () => {
              setCurrentStage(currentStage + 1);
              setSelectedMode(null);
            },
          },
        ]);
      } else {
        Alert.alert('Congratulations!', 'You completed all 9 stages!', [
          {
            text: 'Back to Module',
            onPress: () => router.back(),
          },
        ]);
      }
    },
  });

  const handleModeSelect = (mode: LearningMode) => {
    // Calculate highest stage for this specific mode
    let highestStageForMode = 0;
    completedStages.forEach((stageKey) => {
      // stageKey format: "1-fill_blank", "2-word_cloud", etc.
      const [stage, modeType] = stageKey.split('-');
      if (modeType === mode) {
        const stageNum = parseInt(stage, 10);
        if (stageNum > highestStageForMode) {
          highestStageForMode = stageNum;
        }
      }
    });
    
    // Auto-resume at next uncompleted stage for THIS mode
    const maxStage = mode === 'word_cloud' ? 4 : 9;
    const resumeStage = Math.min(highestStageForMode + 1, maxStage);
    setCurrentStage(resumeStage);
    setHighestUnlockedStage(resumeStage); // Set highest unlocked stage
    console.log(`Selected ${mode}: Auto-resuming at stage ${resumeStage} (highest completed: ${highestStageForMode}, max: ${maxStage})`);
    
    setSelectedMode(mode);
    startSessionMutation.mutate({ mode });
  };

  const handleSubmit = (answers: any) => {
    checkAnswerMutation.mutate(answers);
  };

  const handleNext = () => {
    if (isCorrect) {
      completeStageMutation.mutate();
    } else {
      setShowResult(false);
      startSessionMutation.mutate({ mode: selectedMode! });
    }
  };

  const handlePlayAgain = () => {
    setShowResult(false);
    startSessionMutation.mutate({ mode: selectedMode! });
  };

  const handleNextStage = () => {
    const maxStage = selectedMode === 'word_cloud' ? 4 : 9;
    
    if (currentStage < maxStage) {
      const newStage = currentStage + 1;
      setCurrentStage(newStage);
      setShowResult(false);
      // Stay in the same mode and load the next stage
      startSessionMutation.mutate({ mode: selectedMode! });
    } else {
      // Completed all stages
      const stageText = maxStage === 4 ? '4 stages' : '9 stages';
      Alert.alert('Congratulations!', `You completed all ${stageText}!`, [
        { text: 'Back to Module', onPress: () => router.back() }
      ]);
    }
  };

  const handleGoHome = () => {
    router.push('/(tabs)/home');
  };

  const handleReturnToGames = () => {
    setSelectedMode(null);
    setShowResult(false);
  };

  const handlePrevStage = () => {
    if (currentStage > 1) {
      const newStage = currentStage - 1;
      setCurrentStage(newStage);
      console.log(`[Navigation] Moving to previous stage ${newStage}, highestUnlocked: ${highestUnlockedStage}`);
      setShowResult(false);
      // Reload the session with the new stage
      startSessionMutation.mutate({ mode: selectedMode! });
    }
  };

  const handleNextStageNav = () => {
    if (currentStage < 9) {
      const newStage = currentStage + 1;
      console.log(`[Navigation] Attempting to move to next stage ${newStage}, highestUnlocked: ${highestUnlockedStage}`);
      // Allow navigation up to the highest unlocked stage
      if (newStage <= highestUnlockedStage) {
        setCurrentStage(newStage);
        setShowResult(false);
        // Reload the session with the new stage
        startSessionMutation.mutate({ mode: selectedMode! });
      } else {
        console.log(`[Navigation] Blocked - stage ${newStage} is locked`);
      }
    }
  };

  // Mode selection screen
  if (!selectedMode) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#fff',
            headerTitle: cardId ? `Card Learning` : 'Choose Learning Mode',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View style={styles.headerRight}>
                <View style={styles.headerStatItem}>
                  <Ionicons name="trophy" size={16} color="#f59e0b" />
                  <Text style={styles.headerStatText}>{totalPoints}</Text>
                </View>
                {hasOrganization && rank && (
                  <View style={styles.headerStatItem}>
                    <Ionicons name="ribbon" size={16} color="#8b5cf6" />
                    <Text style={styles.headerStatText}>#{rank}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <View style={styles.modeSelectionContainer}>

          <Text style={styles.modeTitle}>Choose Learning Mode</Text>
          <Text style={styles.modeSubtitle}>Select how you want to learn this card</Text>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleModeSelect('fill_blank')}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#6366f120' }]}>
              <Ionicons name="create" size={32} color="#6366f1" />
            </View>
            <View style={styles.modeInfo}>
              <Text style={styles.modeName}>Fill in the Blanks</Text>
              <Text style={styles.modeDescription}>
                Type the complete text
              </Text>
              <Text style={styles.modeProgress}>
                Progress: {modeProgress.fill_blank.completed}/{modeProgress.fill_blank.total} stages
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${(modeProgress.fill_blank.completed / modeProgress.fill_blank.total) * 100}%`,
                      backgroundColor: '#6366f1'
                    }
                  ]} 
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleModeSelect('word_cloud')}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="swap-horizontal" size={32} color="#10b981" />
            </View>
            <View style={styles.modeInfo}>
              <Text style={styles.modeName}>Word Cloud</Text>
              <Text style={styles.modeDescription}>
                Arrange words in the correct order
              </Text>
              <Text style={styles.modeProgress}>
                Progress: {modeProgress.word_cloud.completed}/{modeProgress.word_cloud.total} stages
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${(modeProgress.word_cloud.completed / modeProgress.word_cloud.total) * 100}%`,
                      backgroundColor: '#10b981'
                    }
                  ]} 
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleModeSelect('verbal')}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="mic" size={32} color="#f59e0b" />
            </View>
            <View style={styles.modeInfo}>
              <Text style={styles.modeName}>Verbal Speaking</Text>
              <Text style={styles.modeDescription}>
                Speak the sentence aloud
              </Text>
              <Text style={styles.modeProgress}>
                Progress: {modeProgress.verbal.completed}/{modeProgress.verbal.total} stages
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${(modeProgress.verbal.completed / modeProgress.verbal.total) * 100}%`,
                      backgroundColor: '#f59e0b'
                    }
                  ]} 
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Learning session screen
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          headerTitle: selectedMode === 'fill_blank' ? 'Fill in the Blanks' : 
                       selectedMode === 'word_cloud' ? 'Word Cloud' : 
                       'Verbal Speaking',
          headerLeft: () => (
            <TouchableOpacity onPress={() => setSelectedMode(null)} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={styles.headerStatItem}>
                <Ionicons name="trophy" size={16} color="#f59e0b" />
                <Text style={styles.headerStatText}>{totalPoints}</Text>
              </View>
              {hasOrganization && rank && (
                <View style={styles.headerStatItem}>
                  <Ionicons name="ribbon" size={16} color="#8b5cf6" />
                  <Text style={styles.headerStatText}>#{rank}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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

          {startSessionMutation.isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading session...</Text>
            </View>
          ) : selectedMode === 'fill_blank' ? (
            <FillBlankSession
              question={question}
              onSubmit={handleSubmit}
              onNext={handleNext}
              showResult={showResult}
              isCorrect={isCorrect}
              feedback={feedback}
              isLoading={checkAnswerMutation.isPending || completeStageMutation.isPending}
              onPlayAgain={handlePlayAgain}
              onNextStage={handleNextStage}
              onGoHome={handleGoHome}
              onReturnToGames={handleReturnToGames}
              onPrevStage={handlePrevStage}
              onNextStageNav={handleNextStageNav}
              currentStage={currentStage}
              completedStages={completedStages}
              moduleId={moduleId as string}
              learningMode={selectedMode}
              highestUnlockedStage={highestUnlockedStage}
            />
          ) : selectedMode === 'word_cloud' ? (
            <WordCloudSession
              question={question}
              onSubmit={handleSubmit}
              onNext={handleNext}
              showResult={showResult}
              isCorrect={isCorrect}
              feedback={feedback}
              isLoading={checkAnswerMutation.isPending || completeStageMutation.isPending}
              onPlayAgain={handlePlayAgain}
              onNextStage={handleNextStage}
              onGoHome={handleGoHome}
              onReturnToGames={handleReturnToGames}
              onPrevStage={handlePrevStage}
              onNextStageNav={handleNextStageNav}
              currentStage={currentStage}
              completedStages={completedStages}
              moduleId={moduleId as string}
              learningMode={selectedMode}
              highestUnlockedStage={highestUnlockedStage}
            />
          ) : selectedMode === 'verbal' ? (
            <VerbalSession
              question={question}
              onSubmit={(text) => handleSubmit({ spokenText: text })}
              onNext={isCorrect ? handleNextStage : handlePlayAgain}
              showResult={showResult}
              isCorrect={isCorrect}
              feedback={feedback}
              isLoading={checkAnswerMutation.isPending || completeStageMutation.isPending}
              onPlayAgain={handlePlayAgain}
              onNextStage={handleNextStage}
              onGoHome={handleGoHome}
              onReturnToGames={handleReturnToGames}
              onPrevStage={handlePrevStage}
              onNextStageNav={handleNextStageNav}
              currentStage={currentStage}
              completedStages={completedStages}
              moduleId={moduleId as string}
              learningMode={selectedMode}
              highestUnlockedStage={highestUnlockedStage}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modeSelectionContainer: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  progressContainer: {
    marginBottom: 32,
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
  modeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modeSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
    textAlign: 'center',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  modeProgress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 16,
  },
  headerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
