import React, { useState, useEffect } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Users, Clock, Plus, BarChart3, Book, X, User, Heart } from 'lucide-react';
import { formatDate } from '../lib/utils';
import SwitchAnalytics from './SwitchAnalytics';
import { Alter, UserProfile } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

// Random welcome messages
const welcomeMessages = [
  "Welcome back! Hope you're having a great day.",
  "Good to see you again! Take care of yourself.",
  "Welcome back! Your system is here for you.",
  "Hello! Remember to stay hydrated and take breaks.",
  "Welcome back! Every day is a fresh start.",
  "Hey there! Your alters appreciate you checking in.",
  "Welcome! Self-care is important - don't forget it.",
  "Good to have you back! Your system journey matters.",
  "Welcome back! Today is another opportunity to grow.",
  "Hello! Be kind to yourself today.",
];

const Dashboard: React.FC = () => {
  const { currentFronters, switches, alters } = useSystem();
  const { profile, user } = useAuth();
  const [selectedAlter, setSelectedAlter] = useState<Alter | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
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
                  <span className="font-semibold text-[var(--text-primary)]">{alter.name}</span>
                </div>
              ))
            ) : (
              <p className="text-[var(--text-muted)] italic">No one is currently logged as fronting.</p>
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
              <p className="text-2xl font-bold text-[var(--text-primary)]">{switches.length}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--bg-panel)]">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-[var(--text-primary)]">
              <BarChart3 size={16} className="text-[var(--accent-main)]" />
              Top Fronters
            </h4>
            <SwitchAnalytics />
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
                  {log.alterIds.map((id) => {
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
                    {log.alterIds.map(id => alters.find(a => a.id === id)?.name).join(' & ')}
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
                <h4 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{selectedAlter.name}</h4>
                {selectedAlter.description && (
                  <p className="text-[var(--text-secondary)] mb-4">{selectedAlter.description}</p>
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
