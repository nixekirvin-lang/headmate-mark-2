export interface ThemeConfig {
  background: string;
  accent: string;
  text: string;
  alterTextColor?: string;
  isDark: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  dyslexiaFont: boolean;
  useAlterTheme: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  systemName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  themeConfig?: ThemeConfig;
  savedThemes?: Record<string, ThemeConfig>;
  isPrivate?: boolean;
  followingIds?: string[];
  followerIds?: string[];
  friendIds?: string[];
  friendsCount?: number;
  isSinglet?: boolean;
  // Current fronting state (separate from history)
  currentFrontIds?: string[];
  mainFrontId?: string;
  frontStatuses?: Record<string, string>; // Custom status for each fronting alter
  createdAt?: string;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted' | 'blocked';
  timestamp: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  participants?: string[];
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Alter {
  id: string;
  systemId: string;
  name: string;
  description?: string;
  pronouns?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  avatarShape?: 'square' | 'circle' | 'heart' | 'rounded' | 'hexagon';
  tags?: string[];
  customFields?: Record<string, string>;
  isPrivate?: boolean;
  themeConfig?: ThemeConfig;
  folderId?: string;
  createdAt: string;
}

export interface AlterFolder {
  id: string;
  systemId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  alterId: string;
  systemId: string;
  content: string;
  mood?: string;
  mediaUrls?: string[];
  timestamp: string;
}

export interface SwitchLog {
  id: string;
  systemId: string;
  alterIds: string[];
  timestamp: string;
  notes?: string;
  triggers?: string[];
  frontStatuses?: Record<string, string>;
  mainFrontId?: string;
  alterTimestamps?: Record<string, string>; // When each alter was added to front
  alterEndTimestamps?: Record<string, string>; // When each alter was removed from front
}

export interface FrontHistoryEntry {
  id: string;
  userId: string;
  alterId: string;
  action: 'added' | 'removed' | 'status_changed';
  timestamp: string;
  previousTimestamp?: string; // For removals, when they were added
  frontStatus?: string; // Custom status at time of fronting
}

export interface InternalMessage {
  id: string;
  systemId: string;
  authorAlterId: string;
  content: string;
  timestamp: string;
  isPinned?: boolean;
}

export interface Post {
  id: string;
  systemId: string;
  authorAlterId: string;
  content: string;
  visibility: 'public' | 'friends' | 'private';
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  triggerWarnings?: string[];
  likedBy?: string[];
  imageUrls?: string[];
  mood?: string;
}

export interface Comment {
  id: string;
  postId: string;
  systemId: string;
  authorName: string;
  authorAvatar?: string;
  authorAlterId?: string;
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'follow' | 'friend_request' | 'friend_accepted' | 'comment' | 'like';
  postId?: string;
  commentId?: string;
  content?: string;
  timestamp: string;
  isRead: boolean;
}

export type PetType = 'blob' | 'cat' | 'slime' | 'plant' | 'robot';
export type PetMood = 'happy' | 'content' | 'neutral' | 'sad' | 'upset' | 'sleeping' | 'excited' | 'playful';

export interface Pet {
  id: string;
  userId: string;
  name: string;
  type: PetType;
  hunger: number; // 0-100 (0 = starving, 100 = full)
  happiness: number; // 0-100 (0 = sad, 100 = happy)
  cleanliness: number; // 0-100 (0 = dirty, 100 = clean)
  energy: number; // 0-100 (0 = exhausted, 100 = rested)
  level: number;
  experience: number;
  lastUpdated: string; // ISO timestamp
}

export const PET_EMOJIS: Record<PetType, { base: string; happy: string; sleeping: string }> = {
  blob: { base: '🟢', happy: '🥳', sleeping: '💤' },
  cat: { base: '🐱', happy: '😸', sleeping: '😴' },
  slime: { base: '🟣', happy: '🤩', sleeping: '💤' },
  plant: { base: '🌱', happy: '🌿', sleeping: '😴' },
  robot: { base: '🤖', happy: '⚡', sleeping: '🔋' },
};

export const PET_TYPE_NAMES: Record<PetType, string> = {
  blob: 'Blob',
  cat: 'Cat',
  slime: 'Slime',
  plant: 'Plant',
  robot: 'Robot',
};

export const ACTION_COOLDOWNS: Record<string, number> = {
  feed: 60, // seconds
  play: 120,
  clean: 180,
  rest: 90,
};

// ===== Enhanced Pet System Types =====

export interface PetAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export interface PetQuest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'special' | 'achievement';
  requirement: number;
  progress: number;
  reward: number;
  icon: string;
  completed: boolean;
  expiresAt?: string;
}

export interface PetItem {
  id: string;
  name: string;
  description: string;
  type: 'food' | 'toy' | 'bed' | 'deco';
  effect: number;
  statAffected: 'hunger' | 'happiness' | 'cleanliness' | 'energy' | 'all';
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
}

export interface MinigameScore {
  gameId: string;
  score: number;
  timestamp: string;
  expEarned: number;
}

export interface PetMinigame {
  id: string;
  name: string;
  description: string;
  icon: string;
  highScore: number;
  timesPlayed: number;
}

export interface PetParticleEffect {
  id: string;
  type: 'hearts' | 'stars' | 'sparkles' | 'food' | 'energy' | 'confetti';
  x: number;
  y: number;
  createdAt: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  type: 'feed' | 'play' | 'clean' | 'rest' | 'minigame' | 'interaction';
  target: number;
  progress: number;
  completed: boolean;
  expiresAt: string;
}

interface StatHistoryPoint {
  timestamp: string;
  value: number;
}

export interface PetStatHistory {
  hunger: StatHistoryPoint[];
  happiness: StatHistoryPoint[];
  cleanliness: StatHistoryPoint[];
  energy: StatHistoryPoint[];
}

export interface EnhancedPet extends Pet {
  achievements: string[];
  quests: string[];
  inventory: PetItem[];
  minigameScores: Record<string, MinigameScore>;
  totalPlayTime: number;
  totalActionsPerformed: number;
  dailyQuests: DailyQuest[];
  lastDailyReset?: string;
  statHistory?: PetStatHistory;
  favoriteItem?: string;
  petCustomization?: {
    background?: string;
    accessories?: string[];
  };
}

export const PET_ACHIEVEMENTS: Record<string, PetAchievement> = {
  first_steps: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Perform your first action with your pet',
    icon: '👣',
  },
  level_5: {
    id: 'level_5',
    name: 'Growing Up',
    description: 'Reach level 5 with your pet',
    icon: '⭐',
    progress: 0,
    target: 5,
  },
  level_10: {
    id: 'level_10',
    name: 'Best Friends',
    description: 'Reach level 10 with your pet',
    icon: '🌟',
    progress: 0,
    target: 10,
  },
  care_taker: {
    id: 'care_taker',
    name: 'Care Taker',
    description: 'Perform 50 actions',
    icon: '💝',
    progress: 0,
    target: 50,
  },
  minigame_master: {
    id: 'minigame_master',
    name: 'Minigame Master',
    description: 'Play 20 minigames',
    icon: '🎮',
    progress: 0,
    target: 20,
  },
  perfect_day: {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Complete all daily quests in one day',
    icon: '🏆',
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Collect 10 different items',
    icon: '📦',
    progress: 0,
    target: 10,
  },
  fully_leveled: {
    id: 'fully_leveled',
    name: 'Fully Leveled',
    description: 'Reach max level (50)',
    icon: '👑',
    progress: 0,
    target: 50,
  },
};

export const PET_ITEMS: Record<string, Omit<PetItem, 'quantity'>> = {
  apple: {
    id: 'apple',
    name: 'Apple',
    description: 'A crisp, juicy apple',
    type: 'food',
    effect: 15,
    statAffected: 'hunger',
    icon: '🍎',
    rarity: 'common',
  },
  pizza: {
    id: 'pizza',
    name: 'Pizza',
    description: 'Delicious cheese pizza',
    type: 'food',
    effect: 25,
    statAffected: 'hunger',
    icon: '🍕',
    rarity: 'uncommon',
  },
  cake: {
    id: 'cake',
    name: 'Birthday Cake',
    description: 'A special celebration cake',
    type: 'food',
    effect: 40,
    statAffected: 'hunger',
    icon: '🎂',
    rarity: 'rare',
  },
  sushi: {
    id: 'sushi',
    name: 'Sushi Platter',
    description: 'Exquisite sushi selection',
    type: 'food',
    effect: 35,
    statAffected: 'hunger',
    icon: '🍣',
    rarity: 'rare',
  },
  golden_apple: {
    id: 'golden_apple',
    name: 'Golden Apple',
    description: 'A magical golden apple',
    type: 'food',
    effect: 50,
    statAffected: 'all',
    icon: '🌟',
    rarity: 'legendary',
  },
  ball: {
    id: 'ball',
    name: 'Bouncy Ball',
    description: 'A fun bouncy ball to play with',
    type: 'toy',
    effect: 20,
    statAffected: 'happiness',
    icon: '⚽',
    rarity: 'common',
  },
  teddy: {
    id: 'teddy',
    name: 'Teddy Bear',
    description: 'A soft and cuddly friend',
    type: 'toy',
    effect: 30,
    statAffected: 'happiness',
    icon: '🧸',
    rarity: 'uncommon',
  },
  rainbow_toy: {
    id: 'rainbow_toy',
    name: 'Rainbow Toy',
    description: 'A mesmerizing rainbow toy',
    type: 'toy',
    effect: 45,
    statAffected: 'happiness',
    icon: '🌈',
    rarity: 'epic',
  },
  bubble_bath: {
    id: 'bubble_bath',
    name: 'Bubble Bath',
    description: 'Relaxing bubble bath',
    type: 'bed',
    effect: 35,
    statAffected: 'cleanliness',
    icon: '🛁',
    rarity: 'uncommon',
  },
  cozy_blanket: {
    id: 'cozy_blanket',
    name: 'Cozy Blanket',
    description: 'A warm and soft blanket',
    type: 'bed',
    effect: 40,
    statAffected: 'energy',
    icon: '🛏️',
    rarity: 'uncommon',
  },
  premium_bed: {
    id: 'premium_bed',
    name: 'Premium Pet Bed',
    description: 'The ultimate in pet comfort',
    type: 'bed',
    effect: 60,
    statAffected: 'all',
    icon: '💤',
    rarity: 'legendary',
  },
};

export const DAILY_QUEST_TEMPLATES: Omit<DailyQuest, 'progress' | 'completed' | 'expiresAt'>[] = [
  {
    id: 'daily_feed',
    title: 'Well Fed',
    description: 'Feed your pet 3 times',
    type: 'feed',
    target: 3,
  },
  {
    id: 'daily_play',
    title: 'Fun Time',
    description: 'Play with your pet 3 times',
    type: 'play',
    target: 3,
  },
  {
    id: 'daily_clean',
    title: 'Sparkling Clean',
    description: 'Clean your pet 2 times',
    type: 'clean',
    target: 2,
  },
  {
    id: 'daily_rest',
    title: 'Rest & Relax',
    description: 'Let your pet rest 2 times',
    type: 'rest',
    target: 2,
  },
  {
    id: 'daily_minigame',
    title: 'Game Time',
    description: 'Play 2 minigames',
    type: 'minigame',
    target: 2,
  },
];

export const PET_MINIGAMES: PetMinigame[] = [
  {
    id: 'tap_game',
    name: 'Tap Dash',
    description: 'Tap as fast as you can!',
    icon: '👆',
    highScore: 0,
    timesPlayed: 0,
  },
  {
    id: 'reaction_game',
    name: 'Quick Reflex',
    description: 'Test your reaction time!',
    icon: '⚡',
    highScore: 0,
    timesPlayed: 0,
  },
];
