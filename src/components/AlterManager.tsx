import React, { useState, useEffect } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Check, Shield, ShieldOff, Tag, Download, RefreshCw, Eye, Folder, FolderPlus, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Alter, AlterFolder } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { cn } from '../lib/utils';

const AlterManager: React.FC = () => {
  const { alters } = useSystem();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState<Alter | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState<AlterFolder | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState<'sp' | 'pk' | null>(null);
  const [importToken, setImportToken] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [viewAlter, setViewAlter] = useState<Alter | null>(null);
  const [folders, setFolders] = useState<AlterFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderForSelectingAlters, setFolderForSelectingAlters] = useState<AlterFolder | null>(null);
  const [selectedAltersForFolder, setSelectedAltersForFolder] = useState<Set<string>>(new Set());

  const [folderFormData, setFolderFormData] = useState({
    name: '',
    description: '',
    color: '#a855f7'
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatarUrl: '',
    bannerUrl: '',
    tags: '',
    isPrivate: true,
    themeConfig: {
      background: '#f5f5f5',
      accent: '#a855f7',
      text: '#1a1a1a',
    }
  });

  // Load folders on component mount
  useEffect(() => {
    if (!user) return;
    const foldersQuery = query(
      collection(db, 'users', user.uid, 'folders'),
      where('systemId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(foldersQuery, (snap) => {
      const loadedFolders = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AlterFolder[];
      setFolders(loadedFolders);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/folders`);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSaveFolder called', { folderFormData, isEditingFolder });
    
    if (!user) {
      console.error('No user found');
      return;
    }

    if (!folderFormData.name.trim()) {
      console.error('Folder name is required');
      return;
    }

    const folderData = {
      ...folderFormData,
      systemId: user.uid,
      createdAt: isEditingFolder ? isEditingFolder.createdAt : new Date().toISOString(),
    };

    try {
      console.log('Saving folder:', folderData);
      if (isEditingFolder) {
        await updateDoc(doc(db, 'users', user.uid, 'folders', isEditingFolder.id), folderData);
        console.log('Folder updated');
      } else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'folders'), folderData);
        console.log('Folder created with ID:', docRef.id);
      }
      
      console.log('Closing modal and resetting form');
      setIsAddingFolder(false);
      setIsEditingFolder(null);
      setFolderFormData({ name: '', description: '', color: '#a855f7' });
    } catch (error) {
      console.error('Error saving folder:', error);
      handleFirestoreError(error, isEditingFolder ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/folders`);
    }
  };

  const handleAddAltersToFolder = async () => {
    if (!user || !folderForSelectingAlters) return;

    try {
      // Get all alters
      const allAlters = alters;
      
      // Update each alter
      for (const alter of allAlters) {
        const shouldBeInFolder = selectedAltersForFolder.has(alter.id);
        const isCurrentlyInFolder = alter.folderId === folderForSelectingAlters.id;
        
        if (shouldBeInFolder && !isCurrentlyInFolder) {
          // Add to folder
          await updateDoc(doc(db, 'users', user.uid, 'alters', alter.id), {
            folderId: folderForSelectingAlters.id
          });
        } else if (!shouldBeInFolder && isCurrentlyInFolder) {
          // Remove from folder
          await updateDoc(doc(db, 'users', user.uid, 'alters', alter.id), {
            folderId: ''
          });
        }
      }
      
      setFolderForSelectingAlters(null);
      setSelectedAltersForFolder(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/alters`);
    }
  };

  const toggleAlterSelection = (alterId: string) => {
    const newSelected = new Set(selectedAltersForFolder);
    if (newSelected.has(alterId)) {
      newSelected.delete(alterId);
    } else {
      newSelected.add(alterId);
    }
    setSelectedAltersForFolder(newSelected);
  };

  const handleDeleteFolder = async (id: string) => {
    if (!user || !window.confirm('Delete this folder? Alters will not be deleted.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'folders', id));
      // Remove folder ID from any alters in this folder
      const altersInFolder = alters.filter(a => a.folderId === id);
      for (const alter of altersInFolder) {
        await updateDoc(doc(db, 'users', user.uid, 'alters', alter.id), { folderId: '' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/folders/${id}`);
    }
  };

  const openFolderEdit = (folder: AlterFolder) => {
    setIsEditingFolder(folder);
    setFolderFormData({
      name: folder.name,
      description: folder.description || '',
      color: folder.color || '#a855f7'
    });
    setIsAddingFolder(true);
  };

  const openFolderAlterSelection = (folder: AlterFolder) => {
    setFolderForSelectingAlters(folder);
    const altersInFolder = alters.filter(a => a.folderId === folder.id).map(a => a.id);
    setSelectedAltersForFolder(new Set(altersInFolder));
  };

  const openNewFolderForm = () => {
    setIsAddingFolder(true);
    setIsEditingFolder(null);
    setFolderFormData({ name: '', description: '', color: '#a855f7' });
  };

  const toggleFolderExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const alterData = {
      ...formData,
      systemId: user.uid,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: isEditing ? isEditing.createdAt : new Date().toISOString(),
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'users', user.uid, 'alters', isEditing.id), alterData);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'alters'), alterData);
      }
      setIsAdding(false);
      setIsEditing(null);
      setFormData({ 
        name: '', 
        description: '', 
        avatarUrl: '', 
        bannerUrl: '', 
        tags: '', 
        isPrivate: true,
        themeConfig: { background: '#f5f5f5', accent: '#a855f7', text: '#1a1a1a' }
      });
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/alters`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this alter?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'alters', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/alters/${id}`);
    }
  };

  const openEdit = (alter: Alter) => {
    setIsEditing(alter);
    setFormData({
      name: alter.name,
      description: alter.description || '',
      avatarUrl: alter.avatarUrl || '',
      bannerUrl: alter.bannerUrl || '',
      tags: alter.tags?.join(', ') || '',
      isPrivate: alter.isPrivate ?? true,
      themeConfig: alter.themeConfig || { background: '#f5f5f5', accent: '#a855f7', text: '#1a1a1a' }
    });
    setIsAdding(true);
  };

  const handleImport = async () => {
    if (!user || !importToken || !isImporting) return;
    setImportLoading(true);
    setImportError(null);

    try {
      let importedAlters: any[] = [];

      if (isImporting === 'sp') {
        const response = await fetch('https://api.apparyllis.com/v1/members', {
          headers: { 'Authorization': importToken }
        });
        if (!response.ok) throw new Error('Failed to fetch from Simply Plural');
        const data = await response.json();
        importedAlters = data.map((m: any) => ({
          name: m.content.name,
          description: m.content.desc || '',
          avatarUrl: m.content.avatarUrl || '',
          bannerUrl: m.content.bannerUrl || '',
          tags: [],
          isPrivate: m.content.private ?? true,
          systemId: user.uid,
          createdAt: new Date().toISOString()
        }));
      } else {
        const response = await fetch('https://api.pluralkit.me/v2/systems/@me/members', {
          headers: { 'Authorization': importToken }
        });
        if (!response.ok) throw new Error('Failed to fetch from PluralKit');
        const data = await response.json();
        importedAlters = data.map((m: any) => ({
          name: m.name,
          description: m.description || '',
          avatarUrl: m.avatar_url || '',
          bannerUrl: m.banner || '',
          tags: [],
          isPrivate: m.privacy?.visibility === 'private',
          systemId: user.uid,
          createdAt: new Date().toISOString()
        }));
      }

      // Batch add to Firestore
      const batch = importedAlters.map(alter => 
        addDoc(collection(db, 'users', user.uid, 'alters'), alter)
      );
      try {
        await Promise.all(batch);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/alters`);
      }

      setIsImporting(null);
      setImportToken('');
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Alter Management</h2>
          <p className="text-[var(--text-secondary)]">Document and manage your system's identities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openNewFolderForm}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--bg-panel)] rounded-xl font-bold hover:bg-[var(--bg-panel)] transition-all text-sm"
          >
            <FolderPlus size={18} />
            New Folder
          </button>
          <button
            onClick={() => setIsImporting('sp')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--bg-panel)] rounded-xl font-bold hover:bg-[var(--bg-panel)] transition-all text-sm"
          >
            <Download size={18} />
            Import SP
          </button>
          <button
            onClick={() => setIsImporting('pk')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--bg-panel)] rounded-xl font-bold hover:bg-[var(--bg-panel)] transition-all text-sm"
          >
            <Download size={18} />
            Import PK
          </button>
          <button
            onClick={() => { setIsAdding(true); setIsEditing(null); }}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)]"
          >
            <Plus size={20} />
            Add Alter
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[var(--bg-surface)] rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[var(--bg-panel)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                  Import from {isImporting === 'sp' ? 'Simply Plural' : 'PluralKit'}
                </h3>
                <button onClick={() => setIsImporting(null)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full text-[var(--text-secondary)]">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  {isImporting === 'sp' 
                    ? 'Enter your Simply Plural API Key. You can find this in Settings > API.' 
                    : 'Enter your PluralKit Token. You can get this by typing "pk;token" in Discord.'}
                </p>
                <input
                  type="password"
                  value={importToken}
                  onChange={e => setImportToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                  placeholder="Enter token..."
                />
                {importError && (
                  <p className="text-xs text-red-500 font-medium">{importError}</p>
                )}
                <button
                  onClick={handleImport}
                  disabled={importLoading || !importToken}
                  className="w-full py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importLoading ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
                  {importLoading ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
        {isAddingFolder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[var(--bg-surface)] rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[var(--bg-panel)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{isEditingFolder ? 'Edit Folder' : 'New Folder'}</h3>
                <button onClick={() => setIsAddingFolder(false)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full text-[var(--text-secondary)]">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveFolder} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Folder Name</label>
                  <input
                    required
                    value={folderFormData.name}
                    onChange={e => setFolderFormData({ ...folderFormData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                    placeholder="e.g. Trauma Holders"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
                  <textarea
                    value={folderFormData.description}
                    onChange={e => setFolderFormData({ ...folderFormData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[80px]"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Folder Color</label>
                  <div className="flex gap-2">
                    {['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFolderFormData({ ...folderFormData, color: hex })}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          folderFormData.color === hex ? "border-white scale-110 shadow-lg" : "border-transparent"
                        )}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={folderFormData.color}
                      onChange={(e) => setFolderFormData({ ...folderFormData, color: e.target.value })}
                      className="w-8 h-8 rounded-full border-2 border-transparent bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all"
                >
                  {isEditingFolder ? 'Update Folder' : 'Create Folder'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <AnimatePresence>
        {folderForSelectingAlters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[var(--bg-surface)] rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-[var(--bg-panel)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[var(--bg-surface)] pb-4">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">Add Alters to {folderForSelectingAlters.name}</h3>
                <button onClick={() => setFolderForSelectingAlters(null)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full text-[var(--text-secondary)]">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {alters.length === 0 ? (
                  <p className="text-center text-[var(--text-muted)] py-8">No alters yet. Create an alter to add to this folder.</p>
                ) : (
                  alters.map(alter => (
                    <label key={alter.id} className="flex items-center gap-4 p-4 bg-[var(--bg-main)] hover:bg-[var(--bg-panel)] rounded-2xl border border-[var(--bg-panel)] cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={selectedAltersForFolder.has(alter.id)}
                        onChange={() => toggleAlterSelection(alter.id)}
                        className="w-5 h-5 rounded accent-[var(--accent-main)] cursor-pointer"
                      />
                      <img
                        src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                        alt={alter.name}
                        className="w-12 h-12 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold" style={{ color: 'var(--alter-text-color)' }}>{alter.name}</h4>
                        {alter.description && (
                          <p className="text-sm line-clamp-1" style={{ color: 'var(--alter-text-color)', opacity: 0.7 }}>{alter.description}</p>
                        )}
                      </div>
                      {alter.tags && alter.tags.length > 0 && (
                        <div className="flex gap-1">
                          {alter.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] font-bold uppercase px-2 py-1 bg-[var(--bg-panel)] text-[var(--text-muted)] rounded-full">
                              {tag}
                            </span>
                          ))}
                          {alter.tags.length > 2 && (
                            <span className="text-[9px] font-bold uppercase px-2 py-1 text-[var(--text-muted)]">
                              +{alter.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </label>
                  ))
                )}
              </div>

              <div className="flex gap-3 sticky bottom-0 bg-[var(--bg-surface)] pt-4 border-t border-[var(--bg-panel)]">
                <button
                  onClick={() => setFolderForSelectingAlters(null)}
                  className="flex-1 py-3 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-2xl font-bold hover:bg-[var(--bg-panel)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAltersToFolder}
                  className="flex-1 py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[var(--bg-surface)] rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-[var(--bg-panel)] overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{isEditing ? 'Edit Alter' : 'New Alter'}</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-[var(--bg-panel)] rounded-full text-[var(--text-secondary)]">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Name</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                      placeholder="e.g. Luna"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Tags (comma separated)</label>
                    <input
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                      placeholder="e.g. Host, Protector"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[100px]"
                    placeholder="Tell us about them..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Avatar URL</label>
                    <input
                      value={formData.avatarUrl}
                      onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Banner URL</label>
                    <input
                      value={formData.bannerUrl}
                      onChange={e => setFormData({ ...formData, bannerUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--bg-panel)]">
                  <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Custom Theme (Optional)</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Background</label>
                      <input 
                        type="color" 
                        value={formData.themeConfig.background}
                        onChange={(e) => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, background: e.target.value } })}
                        className="w-full h-10 rounded-xl cursor-pointer bg-transparent border border-[var(--bg-panel)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Accent</label>
                      <input 
                        type="color" 
                        value={formData.themeConfig.accent}
                        onChange={(e) => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, accent: e.target.value } })}
                        className="w-full h-10 rounded-xl cursor-pointer bg-transparent border border-[var(--bg-panel)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Text</label>
                      <input 
                        type="color" 
                        value={formData.themeConfig.text}
                        onChange={(e) => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, text: e.target.value } })}
                        className="w-full h-10 rounded-xl cursor-pointer bg-transparent border border-[var(--bg-panel)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      formData.isPrivate ? 'bg-[var(--bg-panel)] text-[var(--text-secondary)]' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {formData.isPrivate ? <Shield size={18} /> : <ShieldOff size={18} />}
                    {formData.isPrivate ? 'Private (System Only)' : 'Shared (Visible to Friends)'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold text-lg hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent-glow)]"
                >
                  {isEditing ? 'Update Alter' : 'Create Alter'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folders Section - Displayed as bubbles at top */}
      <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--bg-panel)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Folder size={20} className="text-[var(--accent-main)]" />
            Folders
          </h3>
          <button
            onClick={openNewFolderForm}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent-main)] text-white text-sm rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all"
          >
            <Plus size={16} />
            New Folder
          </button>
        </div>
        {folders.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {folders.map(folder => {
              const folderAlters = alters.filter(a => a.folderId === folder.id);
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <div key={folder.id} className="relative">
                  <button
                    onClick={() => toggleFolderExpanded(folder.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] rounded-xl border-2 transition-all hover:border-[var(--accent-main)] group"
                    style={{ borderColor: isExpanded ? folder.color : 'var(--bg-panel)' }}
                  >
                    <Folder size={16} style={{ color: folder.color }} />
                    <span className="font-medium text-[var(--text-primary)]">{folder.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[var(--bg-panel)] rounded-full text-[var(--text-muted)]">
                      {folderAlters.length}
                    </span>
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openFolderAlterSelection(folder); }}
                        className="p-1 bg-[var(--accent-main)] text-white rounded-full hover:bg-[var(--accent-hover)]"
                        title="Add alters"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openFolderEdit(folder); }}
                        className="p-1 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-full hover:bg-[var(--bg-surface)]"
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                  {/* Dropdown with alters */}
                  {isExpanded && folderAlters.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-surface)] rounded-2xl border border-[var(--bg-panel)] shadow-xl z-20 p-3">
                      <p className="text-xs font-bold text-[var(--text-muted)] mb-2 uppercase">Alters in {folder.name}</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {folderAlters.map((alter) => (
                          <div 
                            key={alter.id} 
                            className="flex items-center gap-2 p-2 bg-[var(--bg-main)] rounded-xl cursor-pointer hover:bg-[var(--bg-panel)]"
                            onClick={() => { setViewAlter(alter); toggleFolderExpanded(folder.id); }}
                          >
                            <img
                              src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                              alt={alter.name}
                              className="w-8 h-8 rounded-lg object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{alter.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] italic">No folders yet. Create a folder to organize your alters.</p>
        )}
      </div>

      {/* All Alters Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users size={20} />
            All Alters ({alters.length})
          </h3>
        </div>
        {alters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alters.map((alter) => (
              <AlterCard key={alter.id} alter={alter} onView={setViewAlter} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--bg-panel)]">
            <p className="text-[var(--text-muted)] italic">No alters yet. Add your first alter to get started!</p>
          </div>
        )}
      </div>

      {/* View Alter Modal */}
      <AnimatePresence>
        {viewAlter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewAlter(null)}
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
                  onClick={() => setViewAlter(null)}
                  className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="text-center">
                <img
                  src={viewAlter.avatarUrl || `https://ui-avatars.com/api/?name=${viewAlter.name}`}
                  alt={viewAlter.name}
                  className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 border-4"
                  style={{ borderColor: viewAlter.themeConfig?.accent || 'var(--accent-main)' }}
                  referrerPolicy="no-referrer"
                />
                <h4 className="text-2xl font-bold mb-2" style={{ color: 'var(--alter-text-color)' }}>{viewAlter.name}</h4>
                {viewAlter.description && (
                  <p className="mb-4" style={{ color: 'var(--alter-text-color)', opacity: 0.7 }}>{viewAlter.description}</p>
                )}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {viewAlter.isPrivate ? (
                    <span className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                      <Shield size={14} />
                      Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-green-500">
                      <ShieldOff size={14} />
                      Shared
                    </span>
                  )}
                </div>
                {viewAlter.tags && viewAlter.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {viewAlter.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-[var(--accent-main)] text-white text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {viewAlter.themeConfig && (
                  <div className="mb-4">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Custom Theme</p>
                    <div className="flex justify-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: viewAlter.themeConfig.background }}></div>
                      <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: viewAlter.themeConfig.accent }}></div>
                      <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: viewAlter.themeConfig.text }}></div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  Created {new Date(viewAlter.createdAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Alter Card Component
const AlterCard: React.FC<{
  alter: Alter;
  onView: (alter: Alter) => void;
  onEdit: (alter: Alter) => void;
  onDelete: (id: string) => void;
}> = ({ alter, onView, onEdit, onDelete }) => {
  return (
    <motion.div
      layout
      className="group relative bg-[var(--bg-surface)] rounded-3xl overflow-hidden border border-[var(--bg-panel)] shadow-sm hover:shadow-xl transition-all"
    >
      <div className="h-24 bg-[var(--bg-main)] relative">
        {alter.bannerUrl && (
          <img src={alter.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        )}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(alter)} className="p-2 bg-[var(--bg-surface)]/90 rounded-full shadow-sm hover:text-blue-500 text-[var(--text-primary)]">
            <Eye size={16} />
          </button>
          <button onClick={() => onEdit(alter)} className="p-2 bg-[var(--bg-surface)]/90 rounded-full shadow-sm hover:text-[var(--accent-main)] text-[var(--text-primary)]">
            <Edit2 size={16} />
          </button>
          <button onClick={() => onDelete(alter.id)} className="p-2 bg-[var(--bg-surface)]/90 rounded-full shadow-sm hover:text-red-500 text-[var(--text-primary)]">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="p-6 pt-0 -mt-10 relative">
        <img
          src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
          alt={alter.name}
          className="w-20 h-20 rounded-2xl border-4 border-[var(--bg-surface)] object-cover shadow-md mb-4"
          referrerPolicy="no-referrer"
        />
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-xl font-bold" style={{ color: 'var(--alter-text-color)' }}>{alter.name}</h4>
          {alter.isPrivate ? <Shield size={14} className="text-[var(--text-muted)]" /> : <ShieldOff size={14} className="text-green-500" />}
        </div>
        <p className="text-sm line-clamp-2 mb-4 min-h-[2.5rem]" style={{ color: 'var(--alter-text-color)', opacity: 0.7 }}>
          {alter.description || 'No description provided.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {alter.tags?.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-full">
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AlterManager;
