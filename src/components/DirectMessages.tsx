import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, limit, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, ChevronLeft, MoreVertical, Shield, ShieldOff, Tag, MessageCircle } from 'lucide-react';
import { UserProfile, DirectMessage } from '../types';
import { formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface DirectMessagesProps {
  initialUserId?: string;
  onBack?: () => void;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({ initialUserId, onBack }) => {
  const { user, profile } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(initialUserId || null);
  const [activeChatProfile, setActiveChatProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (initialUserId) {
      setActiveChatId(initialUserId);
    }
  }, [initialUserId]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatList, setChatList] = useState<UserProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch chat list (based on friendIds for now)
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      try {
        const data = snap.data() as UserProfile;
        if (data.friendIds && data.friendIds.length > 0) {
          const friendPromises = data.friendIds.map(id => getDoc(doc(db, 'users', id)));
          const friendSnaps = await Promise.all(friendPromises);
          setChatList(friendSnaps.map(s => ({ uid: s.id, ...s.data() } as UserProfile)));
        } else {
          setChatList([]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !activeChatId) return;

    // Fetch active chat profile
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', activeChatId));
        if (snap.exists()) {
          setActiveChatProfile({ uid: snap.id, ...snap.data() } as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${activeChatId}`);
      }
    };
    fetchProfile();

    // Fetch messages - simplest approach
    const conversationId = [user.uid, activeChatId].sort().join('_');
    const q = query(
      collection(db, 'direct_messages'),
      limit(100)
    );

    const unsubMessages = onSnapshot(q, (snap) => {
      const allMessages = snap.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage));
      // Filter in app
      const filteredMessages = allMessages
        .filter(d => d.conversationId === conversationId && d.participants?.includes(user.uid))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(filteredMessages);
      scrollToBottom();
    }, (error) => {
      console.error('Error loading messages:', error);
      handleFirestoreError(error, OperationType.LIST, 'direct_messages');
    });

    return () => unsubMessages();
  }, [user, activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    try {
      const conversationId = [user.uid, activeChatId].sort().join('_');
      await addDoc(collection(db, 'direct_messages'), {
        conversationId,
        participants: [user.uid, activeChatId],
        senderId: user.uid,
        receiverId: activeChatId,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'direct_messages');
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--bg-panel)] overflow-hidden shadow-xl">
      {/* Chat List Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r border-[var(--bg-panel)] flex flex-col bg-[var(--bg-surface)]",
        activeChatId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-[var(--bg-panel)]">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chatList.map(chat => (
            <button
              key={chat.uid}
              onClick={() => setActiveChatId(chat.uid)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl transition-all",
                activeChatId === chat.uid ? "bg-[var(--accent-main)] text-white" : "hover:bg-[var(--bg-panel)] text-[var(--text-primary)]"
              )}
            >
              <img src={chat.avatarUrl || `https://ui-avatars.com/api/?name=${chat.displayName}`} className="w-12 h-12 rounded-2xl object-cover" />
              <div className="text-left overflow-hidden">
                <p className="font-bold truncate">{chat.displayName || chat.systemName}</p>
                <p className={cn("text-xs truncate", activeChatId === chat.uid ? "text-white/70" : "text-[var(--text-muted)]")}>
                  @{chat.username}
                </p>
              </div>
            </button>
          ))}
          {chatList.length === 0 && (
            <p className="text-center py-8 text-[var(--text-muted)] text-sm">No chats yet.</p>
          )}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[var(--bg-main)]/30",
        !activeChatId ? "hidden md:flex items-center justify-center" : "flex"
      )}>
        {activeChatId ? (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-[var(--bg-surface)] border-b border-[var(--bg-panel)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 hover:bg-[var(--bg-panel)] rounded-xl text-[var(--text-secondary)]">
                  <ChevronLeft size={24} />
                </button>
                <img src={activeChatProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${activeChatProfile?.displayName}`} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">{activeChatProfile?.displayName || activeChatProfile?.systemName}</h4>
                  <p className="text-xs text-[var(--accent-main)] font-bold">Online</p>
                </div>
              </div>
              <button className="p-2 hover:bg-[var(--bg-panel)] rounded-xl text-[var(--text-muted)]">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                const showDate = idx === 0 || messages[idx-1].timestamp.split('T')[0] !== msg.timestamp.split('T')[0];
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-[var(--bg-panel)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider rounded-full">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[70%] p-4 rounded-2xl shadow-sm",
                        isMe ? "bg-[var(--accent-main)] text-white rounded-tr-none" : "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--bg-panel)] rounded-tl-none"
                      )}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={cn("text-[10px] mt-2 font-medium opacity-60", isMe ? "text-right" : "text-left")}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 bg-[var(--bg-surface)] border-t border-[var(--bg-panel)]">
              <div className="flex gap-4">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-6 py-3 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-[var(--accent-main)] text-white rounded-2xl hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)] disabled:opacity-50"
                >
                  <Send size={24} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-[var(--bg-panel)] rounded-[2rem] flex items-center justify-center mx-auto text-[var(--accent-main)]">
              <MessageCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Select a chat to start messaging</h3>
            <p className="text-[var(--text-muted)] max-w-xs mx-auto">Connect with your friends and share your journey in a private space.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessages;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
