import React, { useState, useEffect } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Plus, Search, Calendar, Filter, Image as ImageIcon, Music, Smile, User, X, Trash2 } from 'lucide-react';
import { DiaryEntry } from '../types';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const Diary: React.FC = () => {
  const { alters } = useSystem();
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedAlterId, setSelectedAlterId] = useState<string>('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAlterId, setFilterAlterId] = useState<string>('all');
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const isSinglet = profile?.isSinglet ?? true;

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

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'diary'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/diary`);
    });
    return unsub;
  }, [user]);

  const handleDelete = async (entryId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this diary entry? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'diary', entryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/diary/${entryId}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // For singlets, don't require alter selection; for systems, empty string means system-level post
    if (!user || !content) return;

    setSaving(true);
    try {
      // Upload images if any
      const mediaUrls: string[] = [];
      for (const image of images) {
        const imageRef = ref(storage, `diary/${user.uid}/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        mediaUrls.push(url);
      }

      await addDoc(collection(db, 'users', user.uid, 'diary'), {
        systemId: user.uid,
        // For singlets: null; for systems: null if system selected, alter id if specific alter
        alterId: isSinglet ? null : (selectedAlterId || null),
        content,
        mood,
        mediaUrls,
        timestamp: new Date().toISOString(),
      });
      setContent('');
      setMood('');
      setSelectedAlterId('');
      setImages([]);
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/diary`);
    } finally {
      setSaving(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    // For singlets, show all entries (alterId is null); for systems, filter by alterId
    const matchesAlter = filterAlterId === 'all' || 
      (isSinglet ? entry.alterId === null : entry.alterId === filterAlterId);
    return matchesSearch && matchesAlter;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Private Diary</h2>
          <p className="text-[var(--text-secondary)]">A completely private space for your alters to journal.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)]"
        >
          <Plus size={20} />
          New Entry
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-xl"
          >
            <form onSubmit={handleSave} className="space-y-6">
              {/* Single column for singlets, two columns for systems */}
              {isSinglet ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Writing as</label>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-secondary)]">
                      <User size={20} className="text-[var(--text-muted)]" />
                      <span>You (Singlet Mode)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Current Mood</label>
                    <div className="flex items-center gap-2">
                      <Smile size={20} className="text-[var(--text-muted)]" />
                      <input
                        value={mood}
                        onChange={e => setMood(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                        placeholder="e.g. Calm, Anxious, Happy"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Who is writing?</label>
                    <select
                      value={selectedAlterId}
                      onChange={e => setSelectedAlterId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                    >
                      <option value="">{profile?.systemName || 'System'}</option>
                      {alters.map(alter => (
                        <option key={alter.id} value={alter.id}>{alter.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Current Mood</label>
                    <div className="flex items-center gap-2">
                      <Smile size={20} className="text-[var(--text-muted)]" />
                      <input
                        value={mood}
                        onChange={e => setMood(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                        placeholder="e.g. Calm, Anxious, Happy"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Entry Content</label>
                <textarea
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[200px]"
                  placeholder="Write your thoughts here..."
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Images (max 4)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-xl cursor-pointer hover:bg-[var(--bg-surface)] transition-all">
                    <ImageIcon size={20} />
                    <span className="text-sm">Add Images ({images.length}/4)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={images.length >= 4}
                    />
                  </label>
                </div>
                {images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {images.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold text-lg hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent-glow)] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-4 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-2xl font-bold hover:bg-[var(--bg-surface)] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-panel)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
            placeholder="Search entries..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-[var(--text-muted)]" />
          <select
            value={filterAlterId}
            onChange={e => setFilterAlterId(e.target.value)}
            className="px-4 py-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-panel)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
          >
            <option value="all">{isSinglet ? 'All Entries' : 'All Alters'}</option>
            {!isSinglet && alters.map(alter => (
              <option key={alter.id} value={alter.id}>{alter.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {filteredEntries.map((entry) => {
          const alter = entry.alterId ? alters.find(a => a.id === entry.alterId) : null;
          return (
            <motion.div
              layout
              key={entry.id}
              className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={alter?.avatarUrl || `https://ui-avatars.com/api/?name=${alter?.name || (entry.alterId ? '?' : profile?.displayName?.charAt(0) || 'U')}`}
                    alt={alter?.name || (entry.alterId ? 'Unknown' : profile?.displayName || 'You')}
                    className="w-12 h-12 rounded-2xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)]">
                      {alter?.name || (entry.alterId ? 'Unknown Alter' : (profile?.displayName || 'You'))}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(entry.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.mood && (
                    <span className="px-3 py-1 bg-[var(--accent-main)]/10 text-[var(--accent-main)] rounded-full text-xs font-bold uppercase tracking-wider">
                      {entry.mood}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                {entry.content}
              </p>
              {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {entry.mediaUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Entry image ${idx + 1}`}
                      className="w-32 h-32 object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
        {filteredEntries.length === 0 && (
          <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--bg-panel)]">
            <Book size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)] italic">No diary entries found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Diary;
