import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Heart, MessageCircle, UserPlus, Check, Trash2, X } from 'lucide-react';
import { Notification } from '../types';
import { formatDate, cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications/all');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like': return <Heart size={16} className="text-red-500" fill="currentColor" />;
      case 'comment': return <MessageCircle size={16} className="text-blue-500" />;
      case 'follow': return <UserPlus size={16} className="text-purple-500" />;
      case 'friend_request': return <UserPlus size={16} className="text-green-500" />;
      default: return <Bell size={16} />;
    }
  };

  const getMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'like': return 'liked your post';
      case 'comment': return `commented: "${notification.content}"`;
      case 'follow': return 'started following you';
      case 'friend_request': return 'sent you a friend request';
      default: return 'interacted with you';
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading notifications...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Notifications</h2>
          <p className="text-[var(--text-secondary)]">Stay updated with your interactions.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--accent-main)] hover:bg-[var(--accent-main)]/10 rounded-xl transition-all"
          >
            <Check size={16} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <motion.div
              layout
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all",
                notification.isRead 
                  ? "bg-[var(--bg-surface)] border-[var(--bg-panel)] opacity-80" 
                  : "bg-[var(--bg-surface)] border-[var(--accent-main)] shadow-sm shadow-[var(--accent-glow)]/10"
              )}
            >
              <div className="relative">
                <img
                  src={notification.senderAvatar || `https://ui-avatars.com/api/?name=${notification.senderName}`}
                  alt={notification.senderName}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="absolute -bottom-1 -right-1 p-1 bg-[var(--bg-surface)] rounded-full shadow-sm border border-[var(--bg-panel)]">
                  {getIcon(notification.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] leading-tight">
                  <span className="font-bold">{notification.senderName}</span>
                  {' '}
                  <span className="text-[var(--text-secondary)]">{getMessage(notification)}</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-1">
                  {formatDate(notification.timestamp)}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.isRead && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
                    title="Mark as read"
                  >
                    <Check size={18} />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notification.id)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-[var(--bg-surface)] rounded-3xl p-12 text-center border border-[var(--bg-panel)]">
            <Bell size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-20" />
            <p className="text-[var(--text-muted)] font-medium">No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
