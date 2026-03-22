import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Bookmark, AlertTriangle, Edit2, Trash2, Send } from 'lucide-react';
import { Post, UserProfile, Alter, Comment } from '../types';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onAuthorClick?: (uid: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onAuthorClick, onEdit, onDelete }) => {
  const { user, profile } = useAuth();
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [authorAlter, setAuthorAlter] = useState<Alter | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const profileSnap = await getDoc(doc(db, 'users', post.systemId));
        if (profileSnap.exists()) {
          setAuthorProfile(profileSnap.data() as UserProfile);
          if (post.authorAlterId) {
            const alterSnap = await getDoc(doc(db, 'users', post.systemId, 'alters', post.authorAlterId));
            if (alterSnap.exists()) {
              setAuthorAlter({ id: alterSnap.id, ...alterSnap.data() } as Alter);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${post.systemId}`);
      }
    };
    fetchAuthor();
  }, [post]);

  useEffect(() => {
    if (!showComments) return;
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${post.id}/comments`);
    });
    return unsub;
  }, [post.id, showComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newComment.trim()) return;
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        postId: post.id,
        systemId: user.uid,
        authorName: profile.displayName || profile.systemName || 'User',
        authorAvatar: profile.avatarUrl || null,
        content: newComment.trim(),
        timestamp: new Date().toISOString()
      });
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      if (post.systemId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.systemId,
          senderId: user.uid,
          senderName: profile.displayName || profile.systemName || 'User',
          senderAvatar: profile.avatarUrl || null,
          type: 'comment',
          postId: post.id,
          content: newComment.trim().substring(0, 50) + (newComment.length > 50 ? '...' : ''),
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }

      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${post.id}/comments`);
    }
  };

  const isLiked = user && post.likedBy?.includes(user.uid);

  return (
    <motion.div
      layout
      className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => onAuthorClick?.(post.systemId)}
          className="flex items-center gap-4 text-left hover:opacity-80 transition-opacity"
        >
          <img
            src={authorAlter?.avatarUrl || authorProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${authorAlter?.name || authorProfile?.displayName || 'System'}`}
            alt="Author"
            className="w-12 h-12 rounded-2xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h4 className="font-bold text-[var(--text-primary)]">
              {authorAlter?.name || authorProfile?.displayName || authorProfile?.systemName || 'System Profile'}
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--text-muted)]">{formatDate(post.timestamp)}</p>
              {post.mood && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-[var(--accent-main)]/10 text-[var(--accent-main)] rounded-full">
                  {post.mood}
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {post.triggerWarnings?.map(t => (
              <span key={t} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full">
                <AlertTriangle size={10} />
                {t}
              </span>
            ))}
          </div>
          {user?.uid === post.systemId && (
            <div className="flex gap-2">
              <button onClick={onEdit} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={onDelete} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[var(--text-secondary)] mb-6 whitespace-pre-wrap leading-relaxed">
        {post.content}
      </p>

      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className={cn(
          "grid gap-4 mb-6",
          post.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
        )}>
          {post.imageUrls.map((url, i) => (
            <img key={i} src={url} className="w-full h-64 object-cover rounded-2xl" referrerPolicy="no-referrer" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 pt-6 border-t border-[var(--bg-panel)]">
        <button 
          onClick={onLike} 
          className={cn(
            "flex items-center gap-2 transition-colors",
            isLiked ? "text-red-500" : "text-[var(--text-muted)] hover:text-red-500"
          )}
        >
          <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
          <span className="text-sm font-bold">{post.likesCount}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className={cn(
            "flex items-center gap-2 transition-colors",
            showComments ? "text-[var(--accent-main)]" : "text-[var(--text-muted)] hover:text-[var(--accent-main)]"
          )}
        >
          <MessageCircle size={20} />
          <span className="text-sm font-bold">{post.commentsCount}</span>
        </button>
        <button className="flex items-center gap-2 text-[var(--text-muted)] hover:text-green-500 transition-colors ml-auto">
          <Share2 size={20} />
        </button>
        <button className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors">
          <Bookmark size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-8 pt-8 border-t border-[var(--bg-panel)] space-y-6">
              <form onSubmit={handleAddComment} className="flex gap-4">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
                />
                <button type="submit" className="p-2 bg-[var(--accent-main)] text-white rounded-xl hover:bg-[var(--accent-hover)] transition-all">
                  <Send size={20} />
                </button>
              </form>

              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <img 
                      src={comment.authorAvatar || `https://ui-avatars.com/api/?name=${comment.authorName}`} 
                      className="w-8 h-8 rounded-lg object-cover mt-1" 
                    />
                    <div className="flex-1 bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--bg-panel)]">
                      <p className="text-xs font-bold text-[var(--text-primary)] mb-1">{comment.authorName}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{comment.content}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-2">{formatDate(comment.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;
