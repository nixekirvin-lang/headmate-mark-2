import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, getDocs, or, and } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserMinus, Search, User, Check, X, Users, MessageSquare } from 'lucide-react';
import { UserProfile, Friendship } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface FriendsListProps {
  onViewProfile: (userId: string) => void;
  onMessageUser?: (userId: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onViewProfile, onMessageUser }) => {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'people'>('friends');
  
  // Pre-fetch profiles for requests
  const [requestProfiles, setRequestProfiles] = useState<{ [key: string]: UserProfile }>({});

  // Fetch friends - use friendIds from profile
  useEffect(() => {
    if (!user || !profile?.friendIds) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const fetchFriends = async () => {
      try {
        if (profile.friendIds.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }
        
        const friendPromises = profile.friendIds.map(id => getDoc(doc(db, 'users', id)));
        const friendSnaps = await Promise.all(friendPromises);
        const friendProfiles = friendSnaps
          .filter(s => s.exists())
          .map(s => ({ uid: s.id, ...s.data() } as UserProfile));
        setFriends(friendProfiles);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user, profile?.friendIds]);

  // Fetch pending friend requests (where user is user2Id and status is pending)
  useEffect(() => {
    if (!user) return;

    const pendingQ = query(
      collection(db, 'friendships'),
      where('user2Id', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubPending = onSnapshot(pendingQ, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
      setPendingRequests(requests);
      
      // Fetch profiles for pending requests
      requests.forEach(async (req) => {
        const sender = await getSenderProfile(req.user1Id);
        if (sender) {
          setRequestProfiles(prev => ({ ...prev, [req.user1Id]: sender }));
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendships');
    });

    return unsubPending;
  }, [user]);

  // Fetch sent friend requests (where user is user1Id and status is pending)
  useEffect(() => {
    if (!user) return;

    const sentQ = query(
      collection(db, 'friendships'),
      where('user1Id', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubSent = onSnapshot(sentQ, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
      setSentRequests(requests);
      
      // Fetch profiles for sent requests
      requests.forEach(async (req) => {
        const receiver = await getReceiverProfile(req.user2Id);
        if (receiver) {
          setRequestProfiles(prev => ({ ...prev, [req.user2Id]: receiver }));
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendships');
    });

    return unsubSent;
  }, [user]);

  // Fetch all users for "People You May Know"
  useEffect(() => {
    if (!user) return;

    const fetchAllUsers = async () => {
      try {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        const users = allUsersSnap.docs
          .filter(d => d.id !== user.uid)
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        setAllUsers(users);
      } catch (error) {
        console.error('Error fetching all users:', error);
      }
    };

    fetchAllUsers();
  }, [user]);

  // Accept friend request
  const handleAccept = async (request: Friendship) => {
    if (!user || !profile) return;
    try {
      // Get current friend counts
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      const targetUserDoc = await getDoc(doc(db, 'users', request.user1Id));
      const currentUserData = currentUserDoc.data() as UserProfile;
      const targetUserData = targetUserDoc.data() as UserProfile;
      
      const currentFriendsCount = (currentUserData?.friendIds?.length || 0);
      const targetFriendsCount = (targetUserData?.friendIds?.length || 0);

      // Update friendship status to accepted
      await updateDoc(doc(db, 'friendships', request.id), { status: 'accepted' });
      
      // Add each other to friendIds
      await updateDoc(doc(db, 'users', user.uid), { 
        friendIds: arrayUnion(request.user1Id),
        friendsCount: currentFriendsCount + 1
      });
      await updateDoc(doc(db, 'users', request.user1Id), { 
        friendIds: arrayUnion(user.uid),
        friendsCount: targetFriendsCount + 1
      });

      // Send notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: request.user1Id,
        senderId: user.uid,
        senderName: profile.displayName || profile.systemName || 'User',
        senderAvatar: profile.avatarUrl || null,
        type: 'friend_request',
        content: 'accepted your friend request',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `friendships/${request.id}`);
    }
  };

  // Decline friend request
  const handleDecline = async (request: Friendship) => {
    try {
      await deleteDoc(doc(db, 'friendships', request.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendships/${request.id}`);
    }
  };

  // Send friend request
  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user || !profile) return;
    try {
      // Check if request already exists
      const existingQ = query(
        collection(db, 'friendships'),
        or(
          and(where('user1Id', '==', user.uid), where('user2Id', '==', targetUserId)),
          and(where('user1Id', '==', targetUserId), where('user2Id', '==', user.uid))
        )
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        console.log('Friend request already exists');
        return;
      }

      await addDoc(collection(db, 'friendships'), {
        user1Id: user.uid,
        user2Id: targetUserId,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        recipientId: targetUserId,
        senderId: user.uid,
        senderName: profile.displayName || profile.systemName || 'User',
        senderAvatar: profile.avatarUrl || null,
        type: 'friend_request',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  // Cancel friend request
  const handleCancelRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'friendships', requestId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendships/${requestId}`);
    }
  };

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!user || !window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      // Get current friend counts
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      const targetUserDoc = await getDoc(doc(db, 'users', friendId));
      const currentUserData = currentUserDoc.data() as UserProfile;
      const targetUserData = targetUserDoc.data() as UserProfile;
      
      const currentFriendsCount = Math.max(0, (currentUserData?.friendIds?.length || 1) - 1);
      const targetFriendsCount = Math.max(0, (targetUserData?.friendIds?.length || 1) - 1);

      // Remove from both users
      await updateDoc(doc(db, 'users', user.uid), {
        friendIds: arrayRemove(friendId),
        friendsCount: currentFriendsCount
      });
      await updateDoc(doc(db, 'users', friendId), {
        friendIds: arrayRemove(user.uid),
        friendsCount: targetFriendsCount
      });

      // Delete friendship document
      const friendQ = query(
        collection(db, 'friendships'),
        or(
          and(where('user1Id', '==', user.uid), where('user2Id', '==', friendId)),
          and(where('user1Id', '==', friendId), where('user2Id', '==', user.uid))
        )
      );
      const friendSnap = await getDocs(friendQ);
      if (!friendSnap.empty) {
        await deleteDoc(doc(db, 'friendships', friendSnap.docs[0].id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const filtered = allUsersSnap.docs
        .filter(d => {
          const data = d.data() as UserProfile;
          const username = (data.username || '').toLowerCase();
          const displayName = (data.displayName || data.systemName || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          return (d.id !== user?.uid) && (username.includes(query) || displayName.includes(query));
        })
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  // Check if a user has sent a request
  const hasSentRequest = (userId: string) => {
    return sentRequests.some(r => r.user2Id === userId);
  };

  // Get sender profile for pending requests
  const getSenderProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return { uid: snap.id, ...snap.data() } as UserProfile;
      }
    } catch (error) {
      console.error('Error fetching sender:', error);
    }
    return null;
  };

  // Get receiver profile for sent requests
  const getReceiverProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return { uid: snap.id, ...snap.data() } as UserProfile;
      }
    } catch (error) {
      console.error('Error fetching receiver:', error);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-main)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Friends & Social</h2>
        <p className="text-[var(--text-secondary)]">Manage your connections and find new systems.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--bg-panel)] pb-4">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'friends' ? 'bg-[var(--accent-main)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'requests' ? 'bg-[var(--accent-main)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
        >
          Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'people' ? 'bg-[var(--accent-main)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
        >
          People You May Know ({allUsers.length})
        </button>
      </div>

      {/* Search */}
      <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
        <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Find Systems</h3>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
              placeholder="Search by username or display name..."
            />
          </div>
          <button 
            onClick={handleSearch}
            className="px-8 py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)]"
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-8 space-y-4">
            {searchResults.map(res => {
              const isAlreadyFriend = profile?.friendIds?.includes(res.uid);
              const requestSent = hasSentRequest(res.uid);
              
              return (
                <div key={res.uid} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                  <div className="flex items-center gap-4">
                    <img src={res.avatarUrl || `https://ui-avatars.com/api/?name=${res.displayName || res.systemName}`} className="w-12 h-12 rounded-2xl object-cover" />
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{res.displayName || res.systemName}</p>
                      <p className="text-xs text-[var(--text-muted)]">@{res.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onViewProfile(res.uid)}
                      className="p-2 bg-[var(--bg-panel)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition-all"
                    >
                      <User size={18} />
                    </button>
                    {isAlreadyFriend ? (
                      <button 
                        onClick={() => handleRemoveFriend(res.uid)}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-all"
                      >
                        Remove
                      </button>
                    ) : requestSent ? (
                      <button 
                        onClick={() => handleCancelRequest(sentRequests.find(r => r.user2Id === res.uid)?.id!)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs"
                        disabled
                      >
                        Sent
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSendFriendRequest(res.uid)}
                        className="px-4 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold text-xs hover:bg-[var(--accent-hover)]"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tab Content */}
      {activeTab === 'friends' && (
        <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Your Friends</h3>
          {friends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map(friend => (
                <div key={friend.uid} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                  <div className="flex items-center gap-3">
                    <img src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName || friend.systemName}`} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <p className="font-bold text-sm text-[var(--text-primary)]">{friend.displayName || friend.systemName}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">@{friend.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onMessageUser && (
                      <button 
                        onClick={() => onMessageUser(friend.uid)}
                        className="p-2 bg-[var(--bg-panel)] text-[var(--accent-main)] rounded-xl hover:bg-[var(--bg-surface)] transition-all"
                        title="Message"
                      >
                        <MessageSquare size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => onViewProfile(friend.uid)}
                      className="p-2 bg-[var(--bg-panel)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition-all"
                    >
                      <User size={18} />
                    </button>
                    <button 
                      onClick={() => handleRemoveFriend(friend.uid)}
                      className="p-2 bg-[var(--bg-panel)] text-red-500 rounded-xl hover:bg-[var(--bg-surface)] transition-all"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[var(--bg-main)] rounded-3xl border border-dashed border-[var(--bg-panel)]">
              <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-20" />
              <p className="text-[var(--text-muted)]">No friends added yet. Search for users above to add friends!</p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-8">
          {/* Received Requests */}
          <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Friend Requests</h3>
            
            {pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((req) => {
                  const sender = requestProfiles[req.user1Id];
                  if (!sender) return null;
                  
                  return (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                      <div className="flex items-center gap-3">
                        <img src={sender.avatarUrl || `https://ui-avatars.com/api/?name=${sender.displayName || sender.systemName}`} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">{sender.displayName || sender.systemName}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">@{sender.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAccept(req)}
                          className="py-2 px-4 bg-green-500 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button 
                          onClick={() => handleDecline(req)}
                          className="py-2 px-4 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-xl font-bold text-xs flex items-center gap-1"
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-4 text-[var(--text-muted)]">No pending requests.</p>
            )}
          </section>

          {/* Sent Requests */}
          <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Sent Requests</h3>
            
            {sentRequests.length > 0 ? (
              <div className="space-y-4">
                {sentRequests.map((req) => {
                  const receiver = requestProfiles[req.user2Id];
                  if (!receiver) return null;
                  
                  return (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                      <div className="flex items-center gap-3">
                        <img src={receiver.avatarUrl || `https://ui-avatars.com/api/?name=${receiver.displayName || receiver.systemName}`} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">{receiver.displayName || receiver.systemName}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">@{receiver.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelRequest(req.id)}
                        className="py-2 px-4 bg-orange-500 text-white rounded-xl font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-4 text-[var(--text-muted)]">No sent requests.</p>
            )}
          </section>
        </div>
      )}

      {activeTab === 'people' && (
        <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">People You May Know</h3>
          {allUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allUsers.map(person => {
                const isAlreadyFriend = profile?.friendIds?.includes(person.uid);
                const requestSent = hasSentRequest(person.uid);
                
                return (
                  <div key={person.uid} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                    <div className="flex items-center gap-3">
                      <img src={person.avatarUrl || `https://ui-avatars.com/api/?name=${person.displayName || person.systemName}`} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <p className="font-bold text-sm text-[var(--text-primary)]">{person.displayName || person.systemName}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">@{person.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onViewProfile(person.uid)}
                        className="p-2 bg-[var(--bg-panel)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition-all"
                      >
                        <User size={18} />
                      </button>
                      {isAlreadyFriend ? (
                        <span className="px-4 py-2 bg-green-500/20 text-green-500 rounded-xl font-bold text-xs">
                          Friend
                        </span>
                      ) : requestSent ? (
                        <span className="px-4 py-2 bg-orange-500/20 text-orange-500 rounded-xl font-bold text-xs">
                          Sent
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleSendFriendRequest(person.uid)}
                          className="px-4 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold text-xs hover:bg-[var(--accent-hover)]"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-[var(--bg-main)] rounded-3xl border border-dashed border-[var(--bg-panel)]">
              <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-20" />
              <p className="text-[var(--text-muted)]">No other users found.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default FriendsList;
