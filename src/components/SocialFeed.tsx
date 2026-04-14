import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useSystem } from '../SystemContext';
import { db, storage } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, where, doc, updateDoc, increment, getDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Plus, Shield, ShieldOff, AlertTriangle, Image as ImageIcon, X, Edit2, Trash2, Send } from 'lucide-react';
import { Post, UserProfile, Alter, Comment } from '../types';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

import PostCard from './PostCard';

interface SocialFeedProps {
  onAuthorClick?: (uid: string) => void;
}

const SocialFeed: React.FC<SocialFeedProps> = ({ onAuthorClick }) => {
  const { user, profile } = useAuth();
  const { alters } = useSystem();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [selectedAlterId, setSelectedAlterId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [isAdding, setIsAdding] = useState(false);
  const [tw, setTw] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'posts'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      // Show all posts from all users regardless of visibility
      const filteredPosts = allPosts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
      setPosts(filteredPosts);
    }, (error) => {
      console.error('Error loading posts:', error);
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
    return unsub;
  }, [user]);

  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (images.length + selectedFiles.length > 4) {
        alert('Maximum 4 images allowed');
        return;
      }
      setImages(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const image of images) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      if (editingPost) {
        await updateDoc(doc(db, 'posts', editingPost.id), {
          content: content.trim(),
          visibility,
          triggerWarnings: tw.split(',').map(t => t.trim()).filter(t => t),
          imageUrls: [...(editingPost.imageUrls || []).filter(url => !removedImageUrls.includes(url)), ...imageUrls],
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          systemId: user.uid,
          authorAlterId: profile?.isSinglet ? null : (selectedAlterId || null),
          content: content.trim(),
          visibility,
          timestamp: new Date().toISOString(),
          likesCount: 0,
          commentsCount: 0,
          triggerWarnings: tw.split(',').map(t => t.trim()).filter(t => t),
          likedBy: [],
          imageUrls,
        });
      }
      setContent('');
      setTw('');
      setImages([]);
      setIsAdding(false);
      setEditingPost(null);
      setRemovedImageUrls([]);
    } catch (error) {
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, 'posts');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!user || !profile) return;
    const isLiked = post.likedBy?.includes(user.uid);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likesCount: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      if (!isLiked && post.systemId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.systemId,
          senderId: user.uid,
          senderName: profile.displayName || profile.systemName || 'User',
          senderAvatar: profile.avatarUrl || null,
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

  const startEdit = (post: Post) => {
    setEditingPost(post);
    setContent(post.content);
    setTw(post.triggerWarnings?.join(', ') || '');
    setVisibility(post.visibility);
    setIsAdding(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Community Feed</h2>
          <p className="text-[var(--text-secondary)]">Connect with other systems and share your journey.</p>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-xl"
          >
            <form onSubmit={handlePost} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!profile?.isSinglet && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Post as...</label>
                    <select
                      value={selectedAlterId}
                      onChange={e => setSelectedAlterId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                    >
                      <option value="">System Profile</option>
                      {alters.map(alter => (
                        <option key={alter.id} value={alter.id}>{alter.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={cn("space-y-2", profile?.isSinglet && "md:col-span-2")}>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Visibility</label>
                  <select
                    value={visibility}
                    onChange={e => setVisibility(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Content</label>
                <textarea
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[150px]"
                  placeholder="What's on your mind?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Photos (Max 4)</label>
                <div className="flex flex-wrap gap-4">
                  {/* Existing Images */}
                  {editingPost?.imageUrls?.filter(url => !removedImageUrls.includes(url)).map((url, i) => (
                    <div key={`existing-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                      <img src={url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRemovedImageUrls(prev => [...prev, url])}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {/* New Images */}
                  {images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                      <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {images.length < 4 && (
                    <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-[var(--bg-panel)] rounded-xl cursor-pointer hover:bg-[var(--bg-main)] transition-all">
                      <ImageIcon size={24} className="text-[var(--text-muted)]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] mt-1">Add Photo</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Trigger Warnings (optional)</label>
                <input
                  value={tw}
                  onChange={e => setTw(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                  placeholder="e.g. Food, Bright Lights, Vent"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex-1 py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold text-lg hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent-glow)] disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : editingPost ? 'Update Post' : 'Post to Feed'}
                </button>
                <button type="button" onClick={() => { setIsAdding(false); setEditingPost(null); setContent(''); setTw(''); setImages([]); }} className="px-8 py-4 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-2xl font-bold hover:bg-[var(--bg-surface)] transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLike={() => handleLike(post)} 
            onAuthorClick={onAuthorClick}
            onEdit={() => startEdit(post)}
            onDelete={() => handleDelete(post.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default SocialFeed;
