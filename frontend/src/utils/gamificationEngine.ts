/**
 * Gamification Engine for iRememberIt
 * Based on the official GAMIFICATION_DESIGN_STRATEGY.md
 * 
 * Implements:
 * - Points calculation with bonuses
 * - Badge progress tracking
 * - Streak mechanics
 * - Leaderboard ranking
 * - Progress metrics
 */

export interface PointsCalculation {
  basePoints: number;
  firstPassBonus: number;
  speedBonus: number;
  onTimeBonus: number;
  totalPoints: number;
  breakdown: string[];
}

export interface StageCompletion {
  stage: number;
  moduleId: string;
  cardId: string;
  learningType: 'fill_blank' | 'word_cloud' | 'verbal';
  accuracy: number;
  timeSpent: number; // in seconds
  isFirstPass: boolean;
  isOnTime?: boolean;
  completedAt: Date;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPracticeDate: string; // ISO date string
  streakActive: boolean;
}

export interface BadgeProgress {
  badgeId: string;
  category: 'skill' | 'streak' | 'milestone' | 'secret';
  progress: number;
  requirement: number;
  earned: boolean;
  earnedAt?: Date;
}

/**
 * Calculate points for completing a stage
 * Formula: Total Points = Base Points + First Pass Bonus + Speed Bonus + On-Time Bonus
 */
export function calculatePoints(completion: StageCompletion): PointsCalculation {
  const { stage, timeSpent, isFirstPass, isOnTime } = completion;
  
  // Base Points = stage × 50
  const basePoints = stage * 50;
  
  // First Pass Bonus = stage × 25 (only once per stage)
  const firstPassBonus = isFirstPass ? stage * 25 : 0;
  
  // Speed Bonus = 50 points (if time < stage × 120 seconds)
  const expectedTime = stage * 120; // 2 minutes per stage
  const speedBonus = timeSpent < expectedTime ? 50 : 0;
  
  // On-Time Bonus = 100 points (if completed before due date)
  const onTimeBonus = isOnTime ? 100 : 0;
  
  // Calculate total
  const totalPoints = basePoints + firstPassBonus + speedBonus + onTimeBonus;
  
  // Create breakdown for display
  const breakdown: string[] = [
    `Base: ${basePoints} pts (Stage ${stage})`,
  ];
  
  if (firstPassBonus > 0) {
    breakdown.push(`First Pass: +${firstPassBonus} pts`);
  }
  
  if (speedBonus > 0) {
    breakdown.push(`Speed: +${speedBonus} pts (under ${Math.floor(expectedTime / 60)}m)`);
  }
  
  if (onTimeBonus > 0) {
    breakdown.push(`On-Time: +${onTimeBonus} pts`);
  }
  
  return {
    basePoints,
    firstPassBonus,
    speedBonus,
    onTimeBonus,
    totalPoints,
    breakdown,
  };
}

/**
 * Update streak based on practice activity
 * Returns updated streak data and whether a badge was unlocked
 */
export function updateStreak(
  currentStreak: StreakData,
  practiceDate: Date = new Date()
): { streakData: StreakData; streakIncreased: boolean; streakBroken: boolean } {
  const today = practiceDate.toISOString().split('T')[0];
  const lastPractice = currentStreak.lastPracticeDate;
  
  // Calculate days difference
  const lastDate = new Date(lastPractice);
  const todayDate = new Date(today);
  const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let newStreak = currentStreak.currentStreak;
  let streakIncreased = false;
  let streakBroken = false;
  
  if (daysDiff === 0) {
    // Same day, no change
    return { 
      streakData: currentStreak, 
      streakIncreased: false, 
      streakBroken: false 
    };
  } else if (daysDiff === 1) {
    // Consecutive day, increase streak
    newStreak += 1;
    streakIncreased = true;
  } else if (daysDiff > 1) {
    // Streak broken, reset to 1
    newStreak = 1;
    streakBroken = currentStreak.currentStreak > 0;
  }
  
  // Update best streak if needed
  const bestStreak = Math.max(currentStreak.bestStreak, newStreak);
  
  return {
    streakData: {
      currentStreak: newStreak,
      bestStreak,
      lastPracticeDate: today,
      streakActive: true,
    },
    streakIncreased,
    streakBroken,
  };
}

/**
 * Check if streak is at risk (within 2 hours of breaking)
 */
export function isStreakAtRisk(lastPracticeDate: string): boolean {
  const lastDate = new Date(lastPracticeDate);
  const now = new Date();
  const hoursSinceLastPractice = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastPractice > 22; // Within 2 hours of 24-hour deadline
}

/**
 * Calculate badge progress based on user stats
 */
export function calculateBadgeProgress(
  badgeId: string,
  userStats: {
    fillInBlanksCompleted: number;
    wordCloudsCompleted: number;
    verbalExercisesCompleted: number;
    currentStreak: number;
    totalPoints: number;
    modulesCompleted: number;
    retentionRate?: number;
    modulesCreated?: number;
    speedRecords?: number;
  }
): BadgeProgress {
  // Badge definitions based on the strategy document
  const badgeDefinitions: Record<string, { category: string; requirement: number; metric: keyof typeof userStats }> = {
    // Skill Badges - Fill-in-the-Blank
    'word_whisperer_bronze': { category: 'skill', requirement: 1, metric: 'fillInBlanksCompleted' },
    'word_whisperer_silver': { category: 'skill', requirement: 10, metric: 'fillInBlanksCompleted' },
    'word_whisperer_gold': { category: 'skill', requirement: 50, metric: 'fillInBlanksCompleted' },
    'word_whisperer_platinum': { category: 'skill', requirement: 100, metric: 'fillInBlanksCompleted' },
    
    // Skill Badges - Word Cloud
    'cloud_master_bronze': { category: 'skill', requirement: 1, metric: 'wordCloudsCompleted' },
    'cloud_master_silver': { category: 'skill', requirement: 10, metric: 'wordCloudsCompleted' },
    'cloud_master_gold': { category: 'skill', requirement: 50, metric: 'wordCloudsCompleted' },
    'cloud_master_platinum': { category: 'skill', requirement: 100, metric: 'wordCloudsCompleted' },
    
    // Skill Badges - Verbal Speaking
    'verbal_virtuoso_bronze': { category: 'skill', requirement: 1, metric: 'verbalExercisesCompleted' },
    'verbal_virtuoso_silver': { category: 'skill', requirement: 10, metric: 'verbalExercisesCompleted' },
    'verbal_virtuoso_gold': { category: 'skill', requirement: 50, metric: 'verbalExercisesCompleted' },
    'verbal_virtuoso_platinum': { category: 'skill', requirement: 100, metric: 'verbalExercisesCompleted' },
    
    // Streak Badges
    'habit_hero_bronze': { category: 'streak', requirement: 3, metric: 'currentStreak' },
    'habit_hero_silver': { category: 'streak', requirement: 7, metric: 'currentStreak' },
    'habit_hero_gold': { category: 'streak', requirement: 30, metric: 'currentStreak' },
    
    // Milestone Badges
    'completionist_bronze': { category: 'milestone', requirement: 1, metric: 'modulesCompleted' },
    'completionist_silver': { category: 'milestone', requirement: 5, metric: 'modulesCompleted' },
    'completionist_gold': { category: 'milestone', requirement: 10, metric: 'modulesCompleted' },
    
    'point_master_bronze': { category: 'milestone', requirement: 1000, metric: 'totalPoints' },
    'point_master_silver': { category: 'milestone', requirement: 5000, metric: 'totalPoints' },
    'point_master_gold': { category: 'milestone', requirement: 10000, metric: 'totalPoints' },
    'point_master_diamond': { category: 'milestone', requirement: 50000, metric: 'totalPoints' },
  };
  
  const definition = badgeDefinitions[badgeId];
  if (!definition) {
    return {
      badgeId,
      category: 'skill',
      progress: 0,
      requirement: 0,
      earned: false,
    };
  }
  
  const progress = userStats[definition.metric] as number || 0;
  const earned = progress >= definition.requirement;
  
  return {
    badgeId,
    category: definition.category as any,
    progress,
    requirement: definition.requirement,
    earned,
    earnedAt: earned ? new Date() : undefined,
  };
}

/**
 * Calculate leaderboard ranking for a team
 */
export function calculateLeaderboardRank(
  userPoints: number,
  teamPoints: { userId: string; points: number }[]
): { rank: number; total: number; isTopTen: boolean } {
  const sorted = teamPoints.sort((a, b) => b.points - a.points);
  const rank = sorted.findIndex(entry => entry.points <= userPoints) + 1 || sorted.length + 1;
  
  return {
    rank,
    total: sorted.length,
    isTopTen: rank <= 10,
  };
}

/**
 * Get expected time for a stage (for speed bonus calculation)
 */
export function getExpectedTime(stage: number): number {
  return stage * 120; // 2 minutes per stage
}

/**
 * Format points breakdown for display
 */
export function formatPointsBreakdown(calculation: PointsCalculation): string {
  return calculation.breakdown.join('\n');
}

/**
 * Get streak emoji based on streak length
 */
export function getStreakEmoji(streak: number): string {
  if (streak === 0) return '💤';
  if (streak < 3) return '🔥';
  if (streak < 7) return '🔥🔥';
  if (streak < 30) return '🔥🔥🔥';
  return '🔥🔥🔥💎';
}

/**
 * Get badge tier color
 */
export function getBadgeTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier.toLowerCase()] || '#6366f1';
}

/**
 * Check if user should receive a notification
 */
export function shouldNotifyStreak(streakData: StreakData): {
  shouldNotify: boolean;
  message: string;
} {
  if (isStreakAtRisk(streakData.lastPracticeDate)) {
    return {
      shouldNotify: true,
      message: `🔥 Don't lose your ${streakData.currentStreak} day streak! Practice now!`,
    };
  }
  
  return { shouldNotify: false, message: '' };
}

/**
 * Calculate weekly points (for leaderboard)
 */
export function calculateWeeklyPoints(
  completions: StageCompletion[],
  weekStartDate: Date = new Date()
): number {
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  
  return completions
    .filter(completion => new Date(completion.completedAt) >= weekStart)
    .reduce((total, completion) => {
      const points = calculatePoints(completion);
      return total + points.totalPoints;
    }, 0);
}

/**
 * Get retention rate for a module
 */
export function calculateRetentionRate(
  correctAnswers: number,
  totalAttempts: number
): number {
  if (totalAttempts === 0) return 0;
  return Math.round((correctAnswers / totalAttempts) * 100);
}
