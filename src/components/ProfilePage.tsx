import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useSystem } from '../SystemContext';
import { db, storage } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserMinus, Shield, ShieldOff, Tag, AlertTriangle, Heart, MessageSquare, Plus, X, Edit2, Trash2, Upload, Camera, Image as ImageIcon, AlertTriangle as WarningIcon } from 'lucide-react';
import { UserProfile, Post, Alter, SwitchLog } from '../types';
import { formatDate, cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import PostCard from './PostCard';

interface ProfilePageProps {
  userId: string;
  onBack?: () => void;
  onAuthorClick?: (uid: string) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, onBack, onAuthorClick }) => {
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { alters } = useSystem();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentFronters, setCurrentFronters] = useState<Alter[]>([]);
  const [systemMembers, setSystemMembers] = useState<Alter[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [listType, setListType] = useState<'friends' | 'followers' | 'following'>('friends');
  const [listUsers, setListUsers] = useState<UserProfile[]>([]);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editBannerPreview, setEditBannerPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Post creation state
  const [postContent, setPostContent] = useState('');
  const [postAlterId, setPostAlterId] = useState('');
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [postTw, setPostTw] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    const unsubProfile = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      setLoading(false);
    });

    return unsubProfile;
  }, [userId]);

  // Fetch friends when profile loads
  useEffect(() => {
    if (!profile?.friendIds || profile.friendIds.length === 0) {
      setFriends([]);
      return;
    }

    const fetchFriends = async () => {
      const friendPromises = profile.friendIds.map(id => getDoc(doc(db, 'users', id)));
      const friendSnaps = await Promise.all(friendPromises);
      setFriends(friendSnaps.map(s => ({ uid: s.id, ...s.data() } as UserProfile)));
    };
    fetchFriends();
  }, [profile?.friendIds]);

  useEffect(() => {
    if (!currentProfile || !userId) return;
    setIsFollowing(currentProfile.followingIds?.includes(userId) || false);
    if (currentProfile.friendIds?.includes(userId)) {
      setFriendshipStatus('accepted');
    }
  }, [currentProfile, userId]);

  useEffect(() => {
    if (!currentUser || !userId || friendshipStatus === 'accepted') return;

    // Query for pending friend requests in both directions
    const friendQ = query(
      collection(db, 'friendships'),
      where('user1Id', 'in', [currentUser.uid, userId]),
      where('status', '==', 'pending')
    );
    
    const unsubFriend = onSnapshot(friendQ, (snap) => {
      const hasPending = snap.docs.some(doc => {
        const data = doc.data();
        // Check if the other user is user2Id (for requests sent by currentUser)
        // or user1Id (for requests received by currentUser)
        return (data.user1Id === currentUser.uid && data.user2Id === userId) ||
               (data.user1Id === userId && data.user2Id === currentUser.uid);
      });
      if (hasPending) {
        setFriendshipStatus('pending');
      } else {
        setFriendshipStatus('none');
      }
    }, (error) => {
      console.warn('Error fetching friendship status:', error);
    });

    return unsubFriend;
  }, [currentUser, userId, friendshipStatus]);

  useEffect(() => {
    if (!userId) return;
    // Fetch all posts for this user (public, friends, and private visible on profile)
    // Note: This query requires a composite index on systemId + timestamp
    const postsQ = query(
      collection(db, 'posts'),
      where('systemId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubPosts = onSnapshot(postsQ, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (error) => {
      console.warn('Error fetching posts (may need composite index):', error);
      // Don't crash - just show empty posts
      setPosts([]);
    });

    return unsubPosts;
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUser || !currentProfile) return;
    // Fetch current fronters - only if owner or friend
    let unsubSwitches = () => {};
    const isOwner = currentUser.uid === userId;
    // Check if current user is in the viewed user's friend list (they added you)
    const isFriend = profile?.friendIds?.includes(currentUser.uid);
    // Also check if you have them in your friend list (mutual or you added them)
    const isFriendOfViewed = currentProfile.friendIds?.includes(userId);
    const canViewFronters = isFriend || isFriendOfViewed;
    
    if (isOwner || canViewFronters) {
      const switchQ = query(
        collection(db, 'users', userId, 'switches'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      unsubSwitches = onSnapshot(switchQ, async (snap) => {
        try {
          if (!snap.empty) {
            const lastSwitch = snap.docs[0].data() as SwitchLog;
            // Safe check for alterIds - skip if missing or empty
            if (!lastSwitch.alterIds || lastSwitch.alterIds.length === 0) {
              setCurrentFronters([]);
              return;
            }
            const alterPromises = lastSwitch.alterIds.map(id => getDoc(doc(db, 'users', userId, 'alters', id)));
            const alterSnaps = await Promise.all(alterPromises);
            setCurrentFronters(alterSnaps.map(s => ({ id: s.id, ...s.data() } as Alter)));
          } else {
            setCurrentFronters([]);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${userId}/switches`);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${userId}/switches`);
      });
    } else {
      setCurrentFronters([]);
    }
    return unsubSwitches;
  }, [userId, currentUser, currentProfile]);

  // Fetch all system members (alters) for non-singlet profiles
  useEffect(() => {
    if (!userId || !profile?.isSinglet) {
      const altersQ = query(collection(db, 'users', userId, 'alters'));
      const unsubAlters = onSnapshot(altersQ, (snap) => {
        setSystemMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alter)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${userId}/alters`);
      });
      return unsubAlters;
    } else {
      setSystemMembers([]);
    }
  }, [userId, profile?.isSinglet]);

  const handleFollow = async () => {
    if (!currentUser || !currentProfile) return;
    const isNowFollowing = !isFollowing;
    setIsFollowing(isNowFollowing);

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        followingIds: isNowFollowing ? arrayUnion(userId) : arrayRemove(userId)
      });
      await updateDoc(doc(db, 'users', userId), {
        followerIds: isNowFollowing ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid)
      });

      if (isNowFollowing) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: userId,
          senderId: currentUser.uid,
          senderName: currentProfile.displayName || currentProfile.systemName || 'User',
          senderAvatar: currentProfile.avatarUrl || null,
          type: 'follow',
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    } catch (err) {
      console.error('Error following:', err);
      setIsFollowing(!isNowFollowing);
    }
  };

  const handleAddFriend = async () => {
    if (!currentUser || friendshipStatus !== 'none') return;
    try {
      await addDoc(collection(db, 'friendships'), {
        user1Id: currentUser.uid,
        user2Id: userId,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
      await addDoc(collection(db, 'notifications'), {
        recipientId: userId,
        senderId: currentUser.uid,
        senderName: currentProfile.displayName || currentProfile.systemName || 'User',
        senderAvatar: currentProfile.avatarUrl || null,
        type: 'friend_request',
        timestamp: new Date().toISOString(),
        isRead: false
      });

      setFriendshipStatus('pending');
    } catch (err) {
      console.error('Error adding friend:', err);
    }
  };

  const handleUnfriend = async () => {
    if (!currentUser || friendshipStatus !== 'accepted') return;
    if (!window.confirm('Are you sure you want to unfriend this user?')) return;
    
    try {
      // Get current friend counts
      const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const targetUserDoc = await getDoc(doc(db, 'users', userId));
      const currentUserData = currentUserDoc.data() as UserProfile;
      const targetUserData = targetUserDoc.data() as UserProfile;
      
      const currentFriendsCount = Math.max(0, (currentUserData?.friendIds?.length || 1) - 1);
      const targetFriendsCount = Math.max(0, (targetUserData?.friendIds?.length || 1) - 1);

      // Remove from current user's friendIds
      await updateDoc(doc(db, 'users', currentUser.uid), {
        friendIds: arrayRemove(userId),
        friendsCount: currentFriendsCount
      });
      
      // Remove from the other user's friendIds
      await updateDoc(doc(db, 'users', userId), {
        friendIds: arrayRemove(currentUser.uid),
        friendsCount: targetFriendsCount
      });
      
      // Delete the friendship document
      const friendQ = query(
        collection(db, 'friendships'),
        where('user1Id', 'in', [currentUser.uid, userId]),
        where('status', '==', 'accepted')
      );
      
      setFriendshipStatus('none');
    } catch (err) {
      console.error('Error unfriending:', err);
    }
  };

  const handleLike = async (post: Post) => {
    if (!currentUser || !currentProfile) return;
    const isLiked = post.likedBy?.includes(currentUser.uid);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likesCount: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });

      if (!isLiked && post.systemId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.systemId,
          senderId: currentUser.uid,
          senderName: currentProfile.displayName || currentProfile.systemName || 'User',
          senderAvatar: currentProfile.avatarUrl || null,
          type: 'like',
          postId: post.id,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (postImages.length + selectedFiles.length > 4) {
        alert('Maximum 4 images allowed');
        return;
      }
      setPostImages(prev => [...prev, ...selectedFiles]);
    }
  };

  const removePostImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !postContent.trim()) return;

    setPosting(true);
    try {
      const imageUrls: string[] = [];
      for (const image of postImages) {
        const imageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      await addDoc(collection(db, 'posts'), {
        systemId: currentUser.uid,
        authorAlterId: profile?.isSinglet ? null : (postAlterId || null),
        content: postContent.trim(),
        visibility: postVisibility,
        timestamp: new Date().toISOString(),
        likesCount: 0,
        commentsCount: 0,
        triggerWarnings: postTw.split(',').map(t => t.trim()).filter(t => t),
        likedBy: [],
        imageUrls,
      });

      setPostContent('');
      setPostAlterId('');
      setPostVisibility('public');
      setPostTw('');
      setPostImages([]);
      setShowCreatePost(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (post: Post) => {
    // For now, redirect to social feed to edit
    window.dispatchEvent(new CustomEvent('setTab', { detail: 'social' }));
    // We could pass the post to be edited via state or event
  };

  const openEditProfile = () => {
    if (profile) {
      setEditDisplayName(profile.displayName || '');
      setEditBio(profile.bio || '');
      setEditAvatarPreview(profile.avatarUrl || '');
      setEditBannerPreview(profile.bannerUrl || '');
      setUploadError(null);
      setShowEditProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setUploadError(null);
    setUploading(true);
    try {
      const updates: any = {
        displayName: editDisplayName,
        bio: editBio
      };
      
      // Handle avatar - use URL if provided
      if (editAvatarPreview && editAvatarPreview.startsWith('http')) {
        updates.avatarUrl = editAvatarPreview;
      }
      
      // Handle banner - use URL if provided
      if (editBannerPreview && editBannerPreview.startsWith('http')) {
        updates.bannerUrl = editBannerPreview;
      }
      
      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      
      setShowEditProfile(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setUploadError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openListModal = async (type: 'friends' | 'followers' | 'following') => {
    if (!profile) return;
    setListType(type);
    const ids = type === 'friends' ? profile.friendIds : type === 'followers' ? profile.followerIds : profile.followingIds;
    if (!ids || ids.length === 0) {
      setListUsers([]);
      setShowListModal(true);
      return;
    }
    try {
      const users = await Promise.all(
        ids.slice(0, 100).map(id => getDoc(doc(db, 'users', id)))
      );
      setListUsers(users.map(u => ({ uid: u.id, ...u.data() } as UserProfile)).filter(u => u));
      setShowListModal(true);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-[var(--text-muted)]">Profile not found.</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Header / Banner */}
      <div className="relative h-64 rounded-[2.5rem] overflow-hidden bg-[var(--bg-panel)] border border-[var(--bg-panel)]">
        {profile.bannerUrl && (
          <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute bottom-8 left-8 flex items-end gap-6">
          <img
            src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.displayName || profile.username || 'User'}`}
            alt="Avatar"
            className="w-32 h-32 rounded-3xl border-4 border-[var(--bg-surface)] object-cover shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">{profile.displayName || profile.systemName}</h2>
            <p className="text-white/80 font-medium">@{profile.username || 'user'}</p>
            {/* Only show current fronters to owner or friends (either mutual or viewed user added you) */}
            {!profile?.isSinglet && currentFronters.length > 0 && (currentUser?.uid === userId || currentProfile?.friendIds?.includes(userId) || profile?.friendIds?.includes(currentUser?.uid)) && (
              <p className="text-[var(--accent-main)] font-bold text-sm mt-1">
                Currently Fronting: {currentFronters.map(f => f.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 right-8 flex gap-3">
          {currentUser?.uid === userId ? (
            <>
              <button
                onClick={() => setShowCreatePost(true)}
                className="px-6 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-[var(--accent-glow)]"
              >
                <Plus size={18} />
                Create Post
              </button>
              <button
                onClick={openEditProfile}
                className="px-6 py-2 bg-[var(--accent-alt)] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-[var(--accent-glow)]"
              >
                <Edit2 size={18} />
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollow}
                className={cn(
                  "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
                  isFollowing ? "bg-white/20 text-white backdrop-blur-md" : "bg-[var(--accent-main)] text-white"
                )}
              >
                {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              {friendshipStatus === 'accepted' ? (
                <button
                  onClick={handleUnfriend}
                  className="px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 bg-red-500 text-white hover:bg-red-600"
                >
                  <UserMinus size={18} />
                  Unfriend
                </button>
              ) : (
                <button
                  onClick={handleAddFriend}
                  disabled={friendshipStatus !== 'none'}
                  className={cn(
                    "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
                    friendshipStatus === 'pending' ? "bg-orange-500 text-white" : "bg-white text-black"
                  )}
                >
                  <UserPlus size={18} />
                  {friendshipStatus === 'pending' ? 'Pending' : 'Add Friend'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showEditProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl bg-[var(--bg-surface)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--bg-panel)] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">Edit Profile</h3>
                <button onClick={() => setShowEditProfile(false)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Banner Upload */}
                <div>
                  <label className="text-sm font-bold text-[var(--text-primary)] mb-2 block">Banner URL</label>
                  <div className="relative h-32 rounded-2xl bg-[var(--bg-main)] border-2 border-dashed border-[var(--accent-main)] overflow-hidden group">
                    {editBannerPreview && (
                      <img src={editBannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                    )}
                    <input 
                      type="text" 
                      placeholder="Paste image URL here"
                      value={editBannerPreview}
                      onChange={(e) => {
                        setEditBannerPreview(e.target.value);
                      }}
                      className="absolute inset-0 w-full h-full px-2 py-2 bg-transparent text-[var(--text-primary)] text-sm focus:outline-none z-10"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Paste an image URL</p>
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="text-sm font-bold text-[var(--text-primary)] mb-2 block">Avatar URL</label>
                  <div className="relative w-32 h-32 rounded-2xl bg-[var(--bg-main)] border-2 border-dashed border-[var(--accent-main)] overflow-hidden group mx-auto">
                    {editAvatarPreview && (
                      <img src={editAvatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    )}
                    <input 
                      type="text" 
                      placeholder="Paste URL"
                      value={editAvatarPreview}
                      onChange={(e) => {
                        setEditAvatarPreview(e.target.value);
                      }}
                      className="absolute inset-0 w-full h-full px-2 py-2 bg-transparent text-[var(--text-primary)] text-sm focus:outline-none z-10"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 text-center">Paste an image URL</p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="text-sm font-bold text-[var(--text-primary)] mb-2 block">Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-main)] border border-[var(--bg-panel)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-main)]"
                    placeholder="Your display name"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-sm font-bold text-[var(--text-primary)] mb-2 block">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-main)] border border-[var(--bg-panel)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-main)] resize-none"
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={uploading}
                    className="flex-1 py-3 bg-[var(--accent-main)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50"
                  >
                    {uploading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setShowEditProfile(false)}
                    className="px-8 py-3 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                </div>
                {uploadError && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-xl text-red-500 text-sm">
                    {uploadError}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {showListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[var(--bg-surface)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--bg-panel)] max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] capitalize">{listType}</h3>
                <button onClick={() => setShowListModal(false)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-3">
                {listUsers.length > 0 ? (
                  listUsers.map((user) => (
                    <motion.button
                      key={user.uid}
                      onClick={() => {
                        onAuthorClick?.(user.uid);
                        setShowListModal(false);
                      }}
                      whileHover={{ x: 4 }}
                      className="w-full flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all text-left"
                    >
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName || user.username || 'User'}`}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user.displayName || user.systemName}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">@{user.username || 'user'}</p>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <p className="text-center text-[var(--text-muted)] py-8">No {listType} yet.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {showCreatePost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl bg-[var(--bg-surface)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--bg-panel)] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">Create New Post</h3>
                <button onClick={() => setShowCreatePost(false)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleCreatePost} className="space-y-6">
                {/* Alter Selection */}
                {!profile?.isSinglet && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Posting as</label>
                    <select
                      value={postAlterId}
                      onChange={e => setPostAlterId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                    >
                      <option value="">System ({profile?.displayName || profile?.systemName})</option>
                      {alters.map(alter => (
                        <option key={alter.id} value={alter.id}>{alter.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Visibility */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Visibility</label>
                  <div className="flex gap-2">
                    {(['public', 'friends', 'private'] as const).map((vis) => (
                      <button
                        key={vis}
                        type="button"
                        onClick={() => setPostVisibility(vis)}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl text-sm font-bold capitalize transition-all",
                          postVisibility === vis 
                            ? "bg-[var(--accent-main)] text-white" 
                            : "bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--bg-panel)]"
                        )}
                      >
                        {vis}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-2">
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[150px]"
                    placeholder="What's on your mind?"
                    required
                  />
                </div>
                
                {/* Trigger Warnings */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Trigger Warnings (comma separated)</label>
                  <div className="flex items-center gap-2">
                    <WarningIcon size={20} className="text-[var(--text-muted)]" />
                    <input
                      value={postTw}
                      onChange={e => setPostTw(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                      placeholder="e.g. violence, self-harm"
                    />
                  </div>
                </div>
                
                {/* Images */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Add Images</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-panel)] transition-all">
                      <ImageIcon size={20} />
                      <span className="text-sm">Add Images ({postImages.length}/4)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePostImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {postImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {postImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePostImage(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={posting || !postContent.trim()}
                    className="flex-1 py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="px-8 py-4 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-2xl font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">
              {profile.isSinglet ? 'About' : 'About System'}
            </h3>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {profile.bio || "No bio provided."}
            </p>
            
            <div className="mt-8 pt-6 border-t border-[var(--bg-panel)] grid grid-cols-3 gap-4">
              <motion.button
                onClick={() => openListModal('followers')}
                whileHover={{ scale: 1.05 }}
                className="text-center hover:bg-[var(--bg-panel)] p-3 rounded-xl transition-colors"
              >
                <p className="text-2xl font-bold text-[var(--text-primary)]">{profile.followerIds?.length || 0}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)].">Followers</p>
              </motion.button>
              <motion.button
                onClick={() => openListModal('following')}
                whileHover={{ scale: 1.05 }}
                className="text-center hover:bg-[var(--bg-panel)] p-3 rounded-xl transition-colors"
              >
                <p className="text-2xl font-bold text-[var(--text-primary)]">{profile.followingIds?.length || 0}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)].">Following</p>
              </motion.button>
              <motion.button
                onClick={() => openListModal('friends')}
                whileHover={{ scale: 1.05 }}
                className="text-center hover:bg-[var(--bg-panel)] p-3 rounded-xl transition-colors"
              >
                <p className="text-2xl font-bold text-[var(--text-primary)]">{profile.friendsCount || profile.friendIds?.length || 0}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)].">Friends</p>
              </motion.button>
            </div>
          </section>

          {/* Friends List */}
          {friends.length > 0 && (
            <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Friends ({friends.length})</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {friends.map((friend) => (
                  <motion.button
                    key={friend.uid}
                    onClick={() => onAuthorClick?.(friend.uid)}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all text-left"
                  >
                    <img src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName || friend.systemName}`} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{friend.displayName || friend.systemName}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">@{friend.username}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {/* Show system members to owner or friends (either mutual or viewed user added you) */}
          {!profile?.isSinglet && (currentUser?.uid === userId || currentProfile?.friendIds?.includes(userId) || profile?.friendIds?.includes(currentUser?.uid)) && (
            <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">System Members ({systemMembers.length})</h3>
              <div className="space-y-3">
                {systemMembers.map(alter => (
                  <div key={alter.id} className="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                    <img src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--alter-text-color)' }}>{alter.name}</p>
                      {alter.description && (
                        <p className="text-[10px] line-clamp-1" style={{ color: 'var(--alter-text-color)', opacity: 0.7 }}>{alter.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {systemMembers.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] italic">No system members yet.</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Main Content: Posts */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-[var(--text-primary)] px-2">Posts</h3>
          {posts.length > 0 ? (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post)}
                onAuthorClick={onAuthorClick}
                onEdit={() => startEdit(post)}
                onDelete={() => handleDelete(post.id)}
              />
            ))
          ) : (
            <div className="bg-[var(--bg-surface)] rounded-3xl p-12 text-center border border-[var(--bg-panel)]">
              <p className="text-[var(--text-muted)]">No public posts yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

