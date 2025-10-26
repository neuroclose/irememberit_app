export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  organization?: Organization;
  tier: string;
  totalPoints: number;
  rank?: string;
  profileImageUrl?: string;
  trialEndsAt?: string;
  promoExpiresAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  theme?: OrganizationTheme;
}

export interface OrganizationTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  coverPhoto?: string;
  totalStages: number;
  createdById: string;
  isPrivate: boolean;
  isArchived: boolean;
  cards?: Card[];
}

export interface Card {
  id: string;
  moduleId: string;
  content: string;
  words: string[];
  orderIndex: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'skill' | 'streak' | 'milestone' | 'secret';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  color: string;
  progress?: number;
  earned?: boolean;
  earnedAt?: string;
}

export interface Session {
  id: string;
  cardId: string;
  learningType: string;
  stage: number;
  question: any;
  startedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  points: number;
  badgeCount: number;
  rank: number;
}
