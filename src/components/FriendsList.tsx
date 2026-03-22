import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, getDocs, or, and, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserMinus, Shield, ShieldOff, Search, User, Check, X, Users } from 'lucide-react';
import { UserProfile, Friendship } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface FriendsListProps {
  onViewProfile: (userId: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onViewProfile }) => {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { sender?: UserProfile })[]>([]);
  const [sentRequests, setSentRequests] = useState<(Friendship & { receiver?: UserProfile })[]>([]);
  const [peopleYouMayKnow, setPeopleYouMayKnow] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover'>('friends');

  // Fetch all data
  useEffect(() => {
    if (!user) return;

    // Fetch friends
    const unsubFriends = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      try {
        const data = snap.data() as UserProfile;
        if (data.friendIds && data.friendIds.length > 0) {
          const friendPromises = data.friendIds.map(id => getDoc(doc(db, 'users', id)));
          const friendSnaps = await Promise.all(friendPromises);
          setFriends(friendSnaps.map(s => ({ uid: s.id, ...s.data() } as UserProfile)));
        } else {
          setFriends([]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Fetch received pending requests (where user is user2Id)
    const pendingQ = query(
      collection(db, 'friendships'),
      where('user2Id', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubPending = onSnapshot(pendingQ, async (snap) => {
      try {
        const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
        const requestsWithSender = await Promise.all(requests.map(async (req) => {
          const senderSnap = await getDoc(doc(db, 'users', req.user1Id));
          return { ...req, sender: { uid: senderSnap.id, ...senderSnap.data() } as UserProfile };
        }));
        setPendingRequests(requestsWithSender);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'friendships');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendships');
    });

    // Fetch sent pending requests (where user is user1Id)
    const sentQ = query(
      collection(db, 'friendships'),
      where('user1Id', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubSent = onSnapshot(sentQ, async (snap) => {
      try {
        const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
        const requestsWithReceiver = await Promise.all(requests.map(async (req) => {
          const receiverSnap = await getDoc(doc(db, 'users', req.user2Id));
          return { ...req, receiver: { uid: receiverSnap.id, ...receiverSnap.data() } as UserProfile };
        }));
        setSentRequests(requestsWithReceiver);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'friendships');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendships');
    });

    // Fetch people you may know (all users who are not friends and not self)
    const fetchPeopleYouMayKnow = async () => {
      try {
        const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        const currentUserData = currentUserDoc.data() as UserProfile;
        const friendIds = currentUserData?.friendIds || [];
        friendIds.push(user.uid); // Also exclude self

        const potentialFriends = allUsersSnap.docs
          .filter(doc => !friendIds.includes(doc.id))
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        
        setPeopleYouMayKnow(potentialFriends);
      } catch (error) {
        console.error('Error fetching people you may know:', error);
      }
    };
    fetchPeopleYouMayKnow();

    return () => {
      unsubFriends();
      unsubPending();
      unsubSent();
    };
  }, [user]);

  const handleAccept = async (request: Friendship) => {
    if (!user || !profile) return;
    try {
      // Get current friend counts
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      const targetUserDoc = await getDoc(doc(db, 'users', request.user1Id));
      const currentUserData = currentUserDoc.data() as UserProfile;
      const targetUserData = targetUserDoc.data() as UserProfile;
      
      const currentFriendsCount = (currentUserData?.friendIds?.length || 0) + 1;
      const targetFriendsCount = (targetUserData?.friendIds?.length || 0) + 1;

      await updateDoc(doc(db, 'friendships', request.id), { status: 'accepted' });
      await updateDoc(doc(db, 'users', user.uid), { 
        friendIds: arrayUnion(request.user1Id),
        friendsCount: currentFriendsCount
      });
      await updateDoc(doc(db, 'users', request.user1Id), { 
        friendIds: arrayUnion(user.uid),
        friendsCount: targetFriendsCount
      });

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

  const handleAddFriend = async (targetUserId: string) => {
    if (!user || !profile) return;
    try {
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
      handleFirestoreError(err, OperationType.CREATE, 'friendships');
    }
  };

  const handleDecline = async (request: Friendship) => {
    try {
      await deleteDoc(doc(db, 'friendships', request.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendships/${request.id}`);
    }
  };

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

  const handleCancelRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'friendships', requestId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendships/${requestId}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    // Search by username (case-insensitive partial match)
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

      await updateDoc(doc(db, 'users', user.uid), {
        friendIds: arrayRemove(friendId),
        friendsCount: currentFriendsCount
      });
      await updateDoc(doc(db, 'users', friendId), {
        friendIds: arrayRemove(user.uid),
        friendsCount: targetFriendsCount
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

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
          onClick={() => setActiveTab('discover')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'discover' ? 'bg-[var(--accent-main)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
        >
          People You May Know
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
            {searchResults.map(res => (
              <div key={res.uid} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                <div className="flex items-center gap-4">
                  <img src={res.avatarUrl || `https://ui-avatars.com/api/?name=${res.displayName}`} className="w-12 h-12 rounded-2xl object-cover" />
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{res.displayName || res.systemName}</p>
                    <p className="text-xs text-[var(--text-muted)]">@{res.username}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onViewProfile(res.uid)}
                  className="px-6 py-2 bg-[var(--bg-panel)] text-[var(--text-primary)] rounded-xl font-bold hover:bg-[var(--bg-surface)] transition-all"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Your Friends</h3>
              {friends.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(friend => (
                    <div key={friend.uid} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                      <div className="flex items-center gap-3">
                        <img src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.displayName}`} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">{friend.displayName || friend.systemName}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">@{friend.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
                  <p className="text-[var(--text-muted)]">No friends added yet.</p>
                </div>
              )}
            </section>
          )}

          {/* Discover Tab - People You May Know */}
          {activeTab === 'discover' && (
            <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)] flex items-center gap-2">
                <Users className="text-[var(--accent-main)]" />
                People You May Know
              </h3>
              {peopleYouMayKnow.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {peopleYouMayKnow.map(person => {
                    const isSent = sentRequests.some(r => r.user2Id === person.uid);
                    return (
                      <div key={person.uid} className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                        <div className="flex items-center gap-3">
                          <img src={person.avatarUrl || `https://ui-avatars.com/api/?name=${person.displayName}`} className="w-10 h-10 rounded-xl object-cover" />
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
                          <button 
                            onClick={() => isSent ? handleCancelRequest(sentRequests.find(r => r.user2Id === person.uid)?.id!) : handleSendFriendRequest(person.uid)}
                            disabled={isSent}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${isSent ? 'bg-orange-500 text-white' : 'bg-[var(--accent-main)] text-white hover:bg-[var(--accent-hover)]'}`}
                          >
                            {isSent ? 'Sent' : 'Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--bg-main)] rounded-3xl border border-dashed border-[var(--bg-panel)]">
                  <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-20" />
                  <p className="text-[var(--text-muted)]">No new people to discover.</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Requests Tab Content */}
        <div className="space-y-8">
          {activeTab === 'requests' && (
            <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Friend Requests</h3>
              
              {/* Received Requests */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Received</h4>
                {pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                        <div className="flex items-center gap-3 mb-4">
                          <img src={req.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${req.sender?.displayName}`} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <p className="font-bold text-sm text-[var(--text-primary)]">{req.sender?.displayName || req.sender?.systemName}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">@{req.sender?.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAccept(req)}
                            className="flex-1 py-2 bg-green-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button 
                            onClick={() => handleDecline(req)}
                            className="flex-1 py-2 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <X size={14} /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-[var(--text-muted)] text-sm">No pending requests.</p>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Sent</h4>
                {sentRequests.length > 0 ? (
                  <div className="space-y-4">
                    {sentRequests.map(req => (
                      <div key={req.id} className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                        <div className="flex items-center gap-3 mb-4">
                          <img src={req.receiver?.avatarUrl || `https://ui-avatars.com/api/?name=${req.receiver?.displayName}`} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <p className="font-bold text-sm text-[var(--text-primary)]">{req.receiver?.displayName || req.receiver?.systemName}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">@{req.receiver?.username}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleCancelRequest(req.id)}
                          className="w-full py-2 bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <X size={14} /> Cancel Request
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-[var(--text-muted)] text-sm">No sent requests.</p>
                )}
              </div>
              
              {/* People You May Know - shown in requests tab */}
              {peopleYouMayKnow.length > 0 && (
                <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm">
                  <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">People You May Know</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {peopleYouMayKnow.slice(0, 6).map(person => (
                      <div key={person.uid} className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={person.avatarUrl || `https://ui-avatars.com/api/?name=${person.displayName || person.systemName}`} 
                            className="w-12 h-12 rounded-xl object-cover" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[var(--text-primary)] truncate">{person.displayName || person.systemName}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">@{person.username}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAddFriend(person.uid)}
                          className="w-full py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                        >
                          <UserPlus size={14} /> Add Friend
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsList;
