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
  avatarUrl?: string;
  bannerUrl?: string;
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
  type: 'follow' | 'friend_request' | 'comment' | 'like';
  postId?: string;
  commentId?: string;
  content?: string;
  timestamp: string;
  isRead: boolean;
}
