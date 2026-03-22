import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Send, MessageSquare, User, Trash2 } from 'lucide-react';
import { InternalMessage } from '../types';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const InternalChat: React.FC = () => {
  const { alters } = useSystem();
  const { user } = useAuth();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [content, setContent] = useState('');
  const [selectedAlterId, setSelectedAlterId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'internal_messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/internal_messages`);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDelete = async (messageId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'internal_messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/internal_messages/${messageId}`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAlterId || !content.trim()) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'internal_messages'), {
        systemId: user.uid,
        authorAlterId: selectedAlterId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
      });
      setContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/internal_messages`);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-[var(--bg-surface)] rounded-3xl border border-[var(--bg-panel)] overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[var(--bg-panel)] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <MessageSquare className="text-[var(--accent-main)]" />
            Internal System Chat
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Communicate between alters in your system.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => {
          const alter = alters.find(a => a.id === msg.authorAlterId);
          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={msg.id}
              className="flex gap-4"
            >
              <img
                src={alter?.avatarUrl || `https://ui-avatars.com/api/?name=${alter?.name || '?'}`}
                alt={alter?.name}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--text-primary)]">{alter?.name || 'Unknown'}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{formatDate(msg.timestamp)}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl rounded-tl-none text-sm text-[var(--text-secondary)] border border-[var(--bg-panel)]">
                  {msg.content}
                </div>
              </div>
            </motion.div>
          );
        })}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] italic">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-[var(--bg-panel)] bg-[var(--bg-main)]/50">
        <form onSubmit={handleSend} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--bg-panel)]">
              <User size={16} className="text-[var(--text-muted)]" />
              <select
                required
                value={selectedAlterId}
                onChange={e => setSelectedAlterId(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)]"
              >
                <option value="">Send as...</option>
                {alters.map(alter => (
                  <option key={alter.id} value={alter.id}>{alter.name}</option>
                ))}
              </select>
            </div>

          </div>
          <div className="flex gap-4">
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 px-6 py-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-panel)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              disabled={!content.trim() || !selectedAlterId}
              className="px-6 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)] disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InternalChat;
