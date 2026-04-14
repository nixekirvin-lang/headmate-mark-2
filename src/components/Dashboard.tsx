import React, { useState, useEffect } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Clock, Plus, BarChart3, Book, X, User, Heart } from 'lucide-react';
import { formatDate } from '../lib/utils';

import { Alter, UserProfile, Post } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';

// Random welcome messages
const welcomeMessages = [
  "what's cookin' good lookin'!",
  "Remember! There's no WiFi in jail :(",
  "*Picks up crown* U dropped this queen.",
  "HeadM8! Just like those other apps kinda!",
  "No ur so hot babe, pls don't go bald",
  "Everything will be ok, Frogs love you",
  "Remember to go all out! Don't just take a slice, take the whole cake. don't let anyone else have any- hey- HEY! THATS MINE!! STOP RUNNING!! THIEF!! CAKE THIEF!!!",
  "you is smart, You is kind, You is important",
  "I big, I baev, I boobooful 🥺",
  "Lemme see what you have! A KNIFE!! NO!!!! (omg why does he have a knife-)",
  "It says gullible on the ceiling",
  "james nonds having a stronk, call the bondulance",
  "U LOOK AMAZING BABE!!!!!!!!!",
  "Omg slay… Slay! SLAY YOUR ENEMIES-",
  "Ooh piece of candy! Ooh piece of candy! Ooh piece of candy!",
  "rabbit or habit?",
  "Hey Jay! You forgot your flashlight!",
  "Alex kralies worst crime was being a film student.",
  "I'm thinking Miku Miku ooeeoo",
  "pissing all by yourself handsome?",
  "abolish twink masky",
  "Free Palestine",
  "Abolish ICE",
  "Fuck Donald trump",
  "So who're you fighting now?? Gandalf!?",
  "road work ahead!? uh- yeah. i sure hope it does!",
  "hurricane katrina?? More like hurricane tortillaaa!",
  "elon musk is a stinky diaper baby",
  "YES! IT'S OK TO PUNCH NAZIS!!!",
  "ACAB means ACAB",
  "a good nazi is a dead nazi!",
  "ABAB, assigned baby at birth.",
];

const Dashboard: React.FC = () => {
  const { currentFronters, switches, alters, loading, frontHistory } = useSystem();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [selectedAlter, setSelectedAlter] = useState<Alter | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [communityProfiles, setCommunityProfiles] = useState<Record<string, UserProfile>>({});
  const [communityAlters, setCommunityAlters] = useState<Record<string, Alter[]>>({});
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  // Set random welcome message on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    setWelcomeMessage(welcomeMessages[randomIndex]);
  }, []);
  
  // Fetch friends
  useEffect(() => {
    if (!profile?.friendIds || profile.friendIds.length === 0) {
      setFriends([]);
      return;
    }
    
    const fetchFriends = async () => {
      try {
        const friendProfiles = await Promise.all(
          profile.friendIds.slice(0, 20).map(async (friendId) => {
            const snap = await getDoc(doc(db, 'users', friendId));
            if (snap.exists()) {
              return { uid: snap.id, ...snap.data() } as UserProfile;
            }
            return null;
          })
        );
        setFriends(friendProfiles.filter(Boolean) as UserProfile[]);
      } catch (error) {
        console.warn('Error fetching friends:', error);
      }
    };
    
    fetchFriends();
  }, [profile?.friendIds]);

  // Fetch community posts (from all users)
  useEffect(() => {
    const fetchCommunityPosts = async () => {
      try {
        // Get all posts from all users (similar to SocialFeed)
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(postsQuery);
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));
        
        // Take top 10
        const sortedPosts = posts.slice(0, 10);
        
        setCommunityPosts(sortedPosts);
        
        console.log('[Dashboard] Fetched posts:', sortedPosts.length);
        
        // Fetch author profiles for all posts
        const authorIds = [...new Set(sortedPosts.map(p => p.systemId))];
        console.log('[Dashboard] Author IDs:', authorIds);
        
        const profilesMap: Record<string, UserProfile> = {};
        const altersMap: Record<string, Alter[]> = {};
        
        await Promise.all(
          authorIds.map(async (authorId) => {
            try {
              const snap = await getDoc(doc(db, 'users', authorId));
              if (snap.exists()) {
                const profileData = snap.data();
                console.log('[Dashboard] Profile for', authorId, ':', profileData);
                profilesMap[authorId] = { uid: snap.id, ...profileData } as UserProfile;
              } else {
                console.log('[Dashboard] No profile found for', authorId);
              }
            } catch (e) {
              console.warn('[Dashboard] Error fetching profile:', authorId, e);
            }
            
            // Also fetch alters for this system
            try {
              const altersQuery = query(collection(db, 'alters'), where('systemId', '==', authorId));
              const altersSnap = await getDocs(altersQuery);
              altersMap[authorId] = altersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Alter));
            } catch (e) {
              console.warn('[Dashboard] Error fetching alters:', authorId, e);
              altersMap[authorId] = [];
            }
          })
        );
        
        setCommunityProfiles(profilesMap);
        setCommunityAlters(altersMap);
      } catch (error) {
        console.warn('Error fetching community posts:', error);
      }
    };
    
    fetchCommunityPosts();
  }, []);

  if (profile?.isSinglet) {
    return (
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Hello, {profile?.displayName}</h2>
            <p className="text-[var(--text-secondary)]">{welcomeMessage}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
          >
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-4">
              <Book className="text-[var(--accent-main)]" />
              Your Diary
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">Keep track of your thoughts and feelings in your private diary.</p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('setTab', { detail: 'diary' }))}
              className="px-6 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all"
            >
              Open Diary
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
          >
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-4">
              <Users className="text-[var(--accent-main)]" />
              Community
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">Connect with others and share your journey in the community feed.</p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('setTab', { detail: 'social' }))}
              className="px-6 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all"
            >
              Explore Feed
            </button>
          </motion.div>
        </div>

        {/* Friends List for Singlets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
        >
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-6">
            <Heart className="text-pink-500" />
            Your Friends
          </h3>
          
          {friends.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {friends.map((friend) => (
                <div 
                  key={friend.uid} 
                  className="flex items-center gap-4 p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('setViewProfile', { detail: friend.uid }))}
                >
                  <img
                    src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName || friend.username || 'User'}`}
                    alt={friend.displayName || friend.username}
                    className="w-10 h-10 rounded-full object-cover border border-[var(--bg-panel)]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      {friend.displayName || friend.systemName || friend.username || 'User'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">@{friend.username || 'user'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] italic text-center py-4">No friends yet. Add some from the community!</p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Hello, {profile?.systemName}</h2>
          <p className="text-[var(--text-secondary)]">{welcomeMessage}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Fronters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <Users className="text-[var(--accent-main)]" />
              Currently Fronting
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
              Live
            </span>
          </div>

          <div className="flex flex-wrap gap-6">
            {currentFronters.length > 0 ? (
              currentFronters.map((alter) => (
                <div key={alter.id} className="flex flex-col items-center gap-3 cursor-pointer" onClick={() => setSelectedAlter(alter)}>
                  <img
                    src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                    alt={alter.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--accent-main)] p-1 shadow-lg shadow-[var(--accent-glow)] hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-semibold" style={{ color: 'var(--alter-text-color)' }}>{alter.name}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-[var(--text-muted)] italic mb-4">No one is currently logged as fronting.</p>
                <button 
                  onClick={() => navigate('/switch')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold text-sm hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
                >
                  <Activity size={16} />
                  Log a switch
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm space-y-6"
        >
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="text-[var(--accent-main)]" />
            System Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Alters</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{alters.length}</p>
            </div>
            <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Switches</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{frontHistory.filter(h => h.action === 'added').length}</p>
            </div>
          </div>
          <div className="pt-6 border-t border-[var(--bg-panel)]">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-[var(--text-primary)]">
              <BarChart3 size={16} className="text-[var(--accent-main)]" />
              System Analytics
            </h4>
            {/* Loading state */}
            {loading && (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--text-muted)]">Loading analytics...</p>
              </div>
            )}
            {/* System Analytics - Using frontHistory directly */}
            {!loading && (() => {
              console.log('[Dashboard] Rendering analytics, frontHistory:', frontHistory.length, 'alters:', alters.length);
              
              const addedEntries = frontHistory.filter(entry => entry.action === 'added');
              
              // Calculate days tracked
              let trackingDays = 0;
              if (addedEntries.length > 0) {
                const sortedByTime = [...addedEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const firstEntry = sortedByTime[0];
                const lastEntry = sortedByTime[sortedByTime.length - 1];
                const daysMs = new Date(lastEntry.timestamp).getTime() - new Date(firstEntry.timestamp).getTime();
                trackingDays = Math.max(1, Math.floor(daysMs / (1000 * 60 * 60 * 24)));
              }
              
              const frontData: Record<string, { count: number; totalDuration: number }> = {};
              
              addedEntries.forEach((entry, index) => {
                const alterId = entry.alterId;
                
                // Calculate duration: time until next 'added' entry (or assume 1 hour if last)
                let duration = 60 * 60 * 1000; // Default 1 hour in ms
                
                // Find the next 'added' entry after this one in chronological order
                const sortedEntries = [...addedEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const currentIndex = sortedEntries.findIndex(e => e.id === entry.id);
                const nextEntry = sortedEntries[currentIndex + 1];
                
                if (nextEntry) {
                  const currentTime = new Date(entry.timestamp).getTime();
                  const nextTime = new Date(nextEntry.timestamp).getTime();
                  duration = Math.max(nextTime - currentTime, 60000); // At least 1 minute
                }
                
                if (!frontData[alterId]) {
                  frontData[alterId] = { count: 0, totalDuration: 0 };
                }
                frontData[alterId].count += 1;
                frontData[alterId].totalDuration += duration;
              });
              
              const sortedFronters = Object.entries(frontData)
                .map(([alterId, data]) => ({
                  alter: alters.find(a => a.id === alterId),
                  count: data.count,
                  totalDuration: data.totalDuration
                }))
                .filter(item => item.alter)
                .sort((a, b) => b.totalDuration - a.totalDuration)
                .slice(0, 5);

              // Format duration helper
              const formatDuration = (ms: number) => {
                const hours = Math.floor(ms / (1000 * 60 * 60));
                const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                if (hours > 0) {
                  return `${hours}h ${minutes}m`;
                }
                return `${minutes}m`;
              };

              if (sortedFronters.length === 0) {
                return (
                  <div className="text-center py-4">
                    <p className="text-sm text-[var(--text-muted)] italic">No fronting data yet</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Start tracking fronting in the Front History tab to see analytics</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {sortedFronters.map(({ alter, count, totalDuration }) => (
                    <div key={alter!.id} className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--bg-panel)]">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={alter!.avatarUrl || `https://ui-avatars.com/api/?name=${alter!.name}`}
                          alt={alter!.name}
                          className="w-10 h-10 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{alter!.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {count} {count === 1 ? 'switch' : 'switches'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-[var(--bg-surface)] rounded-lg p-2 text-center">
                          <p className="text-xs text-[var(--text-muted)] uppercase">Est. Time Fronting</p>
                          <p className="text-sm font-bold text-[var(--accent-main)]">{formatDuration(totalDuration)}</p>
                        </div>
                        <div className="bg-[var(--bg-surface)] rounded-lg p-2 text-center">
                          <p className="text-xs text-[var(--text-muted)] uppercase">Avg per Switch</p>
                          <p className="text-sm font-bold text-[var(--accent-main)]">{formatDuration(totalDuration / count)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* Friends List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
        >
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-6">
            <Heart className="text-pink-500" />
            Your Friends
          </h3>
          
          {friends.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {friends.map((friend) => (
                <div 
                  key={friend.uid} 
                  className="flex items-center gap-4 p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('setViewProfile', { detail: friend.uid }))}
                >
                  <img
                    src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName || friend.username || 'User'}`}
                    alt={friend.displayName || friend.username}
                    className="w-10 h-10 rounded-full object-cover border border-[var(--bg-panel)]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      {friend.displayName || friend.systemName || friend.username || 'User'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">@{friend.username || 'user'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] italic text-center py-4">No friends yet. Add some from the community!</p>
          )}
        </motion.div>

        {/* Community Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
        >
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-6">
            <Users className="text-blue-500" />
            Community Posts
          </h3>
          
          {communityPosts.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {communityPosts.map((post) => {
                const authorProfile = communityProfiles[post.systemId];
                const systemAlters = communityAlters[post.systemId] || [];
                const authorAlter = post.authorAlterId ? systemAlters.find(a => a.id === post.authorAlterId) : null;
                
                console.log('[Dashboard] Rendering post:', post.id, 'systemId:', post.systemId, 'authorAlterId:', post.authorAlterId);
                console.log('[Dashboard] Profile:', authorProfile);
                console.log('[Dashboard] Alters:', systemAlters);
                
                // Determine display name and avatar
                const displayName = authorAlter 
                  ? authorAlter.name 
                  : (authorProfile?.displayName || authorProfile?.systemName || authorProfile?.username || 'User');
                const displayAvatar = authorAlter?.avatarUrl || authorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${displayName}`;
                
                return (
                  <div 
                    key={post.id} 
                    className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all cursor-pointer"
                    onClick={() => window.dispatchEvent(new CustomEvent('setViewProfile', { detail: post.systemId }))}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover border border-[var(--bg-panel)]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                          {displayName}
                          {authorAlter && <span className="text-xs text-[var(--text-muted)] ml-1">@{authorProfile?.systemName || authorProfile?.username || 'system'}</span>}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{formatDate(post.timestamp)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{post.content}</p>
                    {post.imageUrls && post.imageUrls.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {post.imageUrls.slice(0, 2).map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="Post image" 
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ))}
                        {post.imageUrls.length > 2 && (
                          <div className="w-12 h-12 rounded-lg bg-[var(--bg-panel)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                            +{post.imageUrls.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] italic text-center py-4">No community posts yet.</p>
          )}
        </motion.div>
      </div>

      {/* Recent Switches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Clock className="text-orange-500" />
            Recent Switches
          </h3>
        </div>

        <div className="space-y-4">
          {switches.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {(log.alterIds || []).map((id) => {
                    const alter = alters.find(a => a.id === id);
                    return (
                      <img
                        key={id}
                        src={alter?.avatarUrl || `https://ui-avatars.com/api/?name=${alter?.name || '?'}`}
                        alt={alter?.name}
                        className="w-8 h-8 rounded-full border-2 border-[var(--bg-surface)]"
                        referrerPolicy="no-referrer"
                      />
                    );
                  })}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {(log.alterIds || []).map(id => alters.find(a => a.id === id)?.name).join(' & ')}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{formatDate(log.timestamp)}</p>
                </div>
              </div>
              {log.notes && (
                <p className="text-sm text-[var(--text-secondary)] max-w-xs truncate italic">
                  "{log.notes}"
                </p>
              )}
            </div>
          ))}
          {switches.length === 0 && (
            <p className="text-center py-8 text-[var(--text-muted)] italic">No switch logs found.</p>
          )}
        </div>
      </motion.div>

      {/* Alter Preview Modal */}
      <AnimatePresence>
        {selectedAlter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAlter(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--bg-surface)] rounded-3xl p-8 max-w-md w-full border border-[var(--bg-panel)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Alter Profile</h3>
                <button
                  onClick={() => setSelectedAlter(null)}
                  className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="text-center">
                <img
                  src={selectedAlter.avatarUrl || `https://ui-avatars.com/api/?name=${selectedAlter.name}`}
                  alt={selectedAlter.name}
                  className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 border-4 border-[var(--accent-main)]"
                  referrerPolicy="no-referrer"
                />
                <h4 className="text-2xl font-bold mb-1" style={{ color: 'var(--alter-text-color)' }}>{selectedAlter.name}</h4>
                {selectedAlter.pronouns && (
                  <p className="text-sm mb-3 text-[var(--accent-main)]">{selectedAlter.pronouns}</p>
                )}
                {selectedAlter.description && (
                  <p className="mb-4" style={{ color: 'var(--alter-text-color)', opacity: 0.7 }}>{selectedAlter.description}</p>
                )}
                {selectedAlter.tags && selectedAlter.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {selectedAlter.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-[var(--accent-main)] text-white text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  Created {formatDate(selectedAlter.createdAt)}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
