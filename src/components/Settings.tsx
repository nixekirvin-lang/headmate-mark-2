import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useSystem } from '../SystemContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Shield, User, Download, Trash2, Moon, Sun, Type, AlertTriangle, Save, Check, X, Upload, Camera, LogOut, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeConfig } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const PASTEL_COLORS = {
  red: '#ffb3ba',
  orange: '#ffdfba',
  yellow: '#ffffba',
  green: '#baffc9',
  blue: '#bae1ff',
  purple: '#e1baff',
  pink: '#ffbaff',
};

const NEUTRAL_COLORS = {
  white: '#ffffff',
  offWhite: '#f5f5f5',
  grey: '#808080',
  nearBlack: '#1a1a1a',
};

const ACCENT_PRESETS = [
  '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'
];

const Settings: React.FC = () => {
  const { profile, user, logout, deleteAccount, isDeleting } = useAuth();
  const { theme, updateTheme, saveTheme, deleteTheme, contrastWarning } = useTheme();
  const { alters, switches } = useSystem();
  const [isExporting, setIsExporting] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync state with profile when it changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
      setBannerUrl(profile.bannerUrl || '');
    }
  }, [profile]);

  const updateProfile = async (data: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSaveCurrentTheme = async () => {
    if (!newThemeName.trim()) return;
    await saveTheme(newThemeName, theme);
    setNewThemeName('');
    setIsSavingTheme(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    const success = await deleteAccount();
    if (!success) {
      setDeleteError('Failed to delete account. Please try again.');
    }
  };

  const handleAvatarUrlSave = async () => {
    if (!avatarUrl.startsWith('http')) {
      setUploadError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setUploadError(null);
    try {
      await updateProfile({ avatarUrl });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error saving avatar URL:', error);
      setUploadError(error.message || 'Failed to save avatar URL. Please try again.');
    }
  };

  const handleBannerUrlSave = async () => {
    if (!bannerUrl.startsWith('http')) {
      setUploadError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setUploadError(null);
    try {
      await updateProfile({ bannerUrl });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error saving banner URL:', error);
      setUploadError(error.message || 'Failed to save banner URL. Please try again.');
    }
  };

  const handleSaveProfileInfo = async () => {
    setSaveStatus('saving');
    try {
      await updateProfile({
        displayName: displayName || profile?.displayName,
        bio: bio
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('idle');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h2>
        <p className="text-[var(--text-secondary)]">Customize your HeadM8 experience.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance & Theme */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <Palette className="text-[var(--accent-main)]" />
              Appearance & Theme
            </h3>
            {contrastWarning && (
              <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                <AlertTriangle size={12} />
                Low Contrast
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Background Color */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Background Color</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PASTEL_COLORS).map(([name, hex]) => (
                  <button
                    key={name}
                    onClick={() => updateTheme({ background: hex })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      theme.background === hex ? "border-[var(--accent-main)] scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: hex }}
                    title={name}
                  />
                ))}
                <div className="w-px h-8 bg-[var(--bg-panel)] mx-1" />
                {Object.entries(NEUTRAL_COLORS).map(([name, hex]) => (
                  <button
                    key={name}
                    onClick={() => updateTheme({ background: hex })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      theme.background === hex ? "border-[var(--accent-main)] scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: hex }}
                    title={name}
                  />
                ))}
                <input 
                  type="color" 
                  value={theme.background}
                  onChange={(e) => updateTheme({ background: e.target.value })}
                  className="w-8 h-8 rounded-full border-2 border-transparent bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Accent Color</label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => updateTheme({ accent: hex })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      theme.accent === hex ? "border-white scale-110 shadow-lg" : "border-transparent"
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input 
                  type="color" 
                  value={theme.accent}
                  onChange={(e) => updateTheme({ accent: e.target.value })}
                  className="w-8 h-8 rounded-full border-2 border-transparent bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Text Color</label>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {['#1a1a1a', '#4a4a4a', '#f5f5f5', '#ffffff'].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => updateTheme({ text: hex })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        theme.text === hex ? "border-[var(--accent-main)] scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <input 
                  type="color" 
                  value={theme.text}
                  onChange={(e) => updateTheme({ text: e.target.value })}
                  className="w-8 h-8 rounded-full border-2 border-transparent bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Alter Text Color */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Alter Profile Text Color</label>
              <p className="text-xs text-[var(--text-secondary)]">Choose a text color for alter profiles for better readability</p>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {['#1a1a1a', '#4a4a4a', '#f5f5f5', '#ffffff', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => updateTheme({ alterTextColor: hex })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        theme.alterTextColor === hex ? "border-[var(--accent-main)] scale-110" : "border-gray-300 dark:border-gray-600"
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <input 
                  type="color" 
                  value={theme.alterTextColor || theme.text}
                  onChange={(e) => updateTheme({ alterTextColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-2 border-transparent bg-transparent cursor-pointer"
                />
                {theme.alterTextColor && (
                  <button
                    onClick={() => updateTheme({ alterTextColor: undefined })}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Reset to default"
                  >
                    <X size={14} /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => updateTheme({ isDark: !theme.isDark })}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  theme.isDark ? "bg-[var(--bg-panel)] border-[var(--accent-main)] text-[var(--text-primary)]" : "bg-[var(--bg-main)] border-transparent text-[var(--text-secondary)]"
                )}
              >
                <span className="text-xs font-bold uppercase">Dark Mode</span>
                {theme.isDark ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button
                onClick={() => updateTheme({ highContrast: !theme.highContrast })}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  theme.highContrast ? "bg-[var(--bg-panel)] border-[var(--accent-main)] text-[var(--text-primary)]" : "bg-[var(--bg-main)] border-transparent text-[var(--text-secondary)]"
                )}
              >
                <span className="text-xs font-bold uppercase">High Contrast</span>
                <div className="w-4 h-4 border-2 border-current rounded-sm" />
              </button>
              <button
                onClick={() => updateTheme({ dyslexiaFont: !theme.dyslexiaFont })}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  theme.dyslexiaFont ? "bg-[var(--bg-panel)] border-[var(--accent-main)] text-[var(--text-primary)]" : "bg-[var(--bg-main)] border-transparent text-[var(--text-secondary)]"
                )}
              >
                <span className="text-xs font-bold uppercase">Dyslexia Font</span>
                <Type size={18} />
              </button>
              {!profile?.isSinglet && (
                <button
                  onClick={() => updateTheme({ useAlterTheme: !theme.useAlterTheme })}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                    theme.useAlterTheme ? "bg-[var(--bg-panel)] border-[var(--accent-main)] text-[var(--text-primary)]" : "bg-[var(--bg-main)] border-transparent text-[var(--text-secondary)]"
                  )}
                >
                  <span className="text-xs font-bold uppercase">Alter Themes</span>
                  <User size={18} />
                </button>
              )}
            </div>

            {/* Font Size */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Text Size</label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateTheme({ fontSize: size })}
                    className={cn(
                      "flex-1 py-2 rounded-xl border-2 transition-all font-bold text-xs uppercase",
                      theme.fontSize === size ? "border-[var(--accent-main)] bg-[var(--accent-glow)] text-[var(--accent-main)]" : "border-transparent bg-[var(--bg-main)] text-[var(--text-muted)]"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Themes */}
            <div className="pt-6 border-t border-[var(--bg-panel)] space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Saved Themes</label>
                <button 
                  onClick={() => setIsSavingTheme(true)}
                  className="text-[10px] font-bold uppercase text-[var(--accent-main)] hover:text-[var(--accent-hover)]"
                >
                  Save Current
                </button>
              </div>
              
              <AnimatePresence>
                {isSavingTheme && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex gap-2 overflow-hidden"
                  >
                    <input 
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="Theme name..."
                      className="flex-1 px-4 py-2 rounded-xl border border-[var(--bg-panel)] bg-transparent text-sm text-[var(--text-primary)]"
                    />
                    <button onClick={handleSaveCurrentTheme} className="p-2 bg-green-500 text-white rounded-xl">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setIsSavingTheme(false)} className="p-2 bg-[var(--bg-panel)] text-[var(--text-primary)] rounded-xl">
                      <X size={18} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap gap-2">
                {Object.entries(profile?.savedThemes || {}).map(([name, savedTheme]) => (
                  <div key={name} className="group relative">
                    <button
                      onClick={() => updateTheme(savedTheme)}
                      className="px-4 py-2 bg-[var(--bg-main)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-panel)] transition-all border border-transparent hover:border-[var(--accent-main)]"
                    >
                      {name}
                    </button>
                    <button 
                      onClick={() => deleteTheme(name)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {/* Profile Settings */}
          <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <User className="text-[var(--accent-main)]" />
              {profile?.isSinglet ? 'User Profile' : 'System Profile'}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Singlet Mode</p>
                  <p className="text-xs text-[var(--text-secondary)]">Toggle if you are a singlet or a plural system.</p>
                </div>
                <button
                  onClick={() => updateProfile({ isSinglet: !profile?.isSinglet })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    profile?.isSinglet ? "bg-[var(--accent-main)]" : "bg-[var(--bg-panel)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    profile?.isSinglet ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Username</label>
                  <input
                    defaultValue={profile?.username}
                    onBlur={(e) => updateProfile({ username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-transparent text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                    placeholder="unique_username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Display Name</label>
                  <input
                    defaultValue={profile?.displayName}
                    onBlur={(e) => updateProfile({ displayName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-transparent text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                    placeholder="Your Name"
                  />
                </div>
              </div>
              {!profile?.isSinglet && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">System Name</label>
                  <input
                    defaultValue={profile?.systemName}
                    onBlur={(e) => updateProfile({ systemName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-transparent text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Avatar URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Profile Picture URL</label>
                  <div className="relative">
                    <img
                      src={avatarUrl || profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`}
                      alt="Avatar"
                      className="w-full h-32 rounded-2xl object-cover border-2 border-[var(--bg-panel)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image URL here..."
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-[var(--bg-panel)] bg-transparent text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none text-sm"
                    />
                    <button
                      onClick={handleAvatarUrlSave}
                      className="px-4 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all text-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Banner URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Banner URL</label>
                  <div className="relative">
                    <img
                      src={bannerUrl || profile?.bannerUrl || 'https://via.placeholder.com/300x100'}
                      alt="Banner"
                      className="w-full h-32 rounded-2xl object-cover border-2 border-[var(--bg-panel)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image URL here..."
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-[var(--bg-panel)] bg-transparent text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none text-sm"
                    />
                    <button
                      onClick={handleBannerUrlSave}
                      className="px-4 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all text-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
              {uploadError && (
                <div className="mt-2 p-3 bg-red-500/20 border border-red-500 rounded-xl text-red-500 text-sm">
                  {uploadError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">About Me</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={handleSaveProfileInfo}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-transparent text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[100px] resize-none"
                  placeholder="Tell people about yourself..."
                />
              </div>

              <button
                onClick={handleSaveProfileInfo}
                disabled={uploading || saveStatus === 'saving'}
                className="w-full py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveStatus === 'saving' ? (
                  <>Saving...</>
                ) : saveStatus === 'saved' ? (
                  <>
                    <Check size={20} />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Privacy Settings */}
          <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <Shield className="text-emerald-500" />
              Privacy & Safety
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-[var(--bg-main)] rounded-2xl">
                <p className="font-bold text-[var(--text-primary)]">
                  All Users Visible
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  All users are visible in the community. Everyone can see and connect with each other.
                </p>
              </div>
            </div>
          </section>

          {/* Data Settings */}
          <section className="bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <Download className="text-orange-500" />
              Data Management
            </h3>
            <div className="space-y-4">
              <div className="pt-4 border-t border-[var(--bg-panel)] space-y-3">
                <button 
                  onClick={async () => {
                    if (!user) return;
                    setIsExporting(true);
                    try {
                      // Gather all data
                      const exportData: Record<string, unknown> = {
                        profile: {
                          uid: user.uid,
                          displayName: profile?.displayName,
                          systemName: profile?.systemName,
                          bio: profile?.bio,
                          isSinglet: profile?.isSinglet,
                        },
                        alters: alters,
                        switches: switches,
                        exportedAt: new Date().toISOString(),
                      };

                      // Fetch diary entries
                      const diarySnapshot = await getDocs(collection(db, 'users', user.uid, 'diary'));
                      exportData.diary = diarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                      // Fetch internal messages
                      const messagesSnapshot = await getDocs(collection(db, 'users', user.uid, 'internal_messages'));
                      exportData.internalMessages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                      // Create and download ZIP file
                      const dataStr = JSON.stringify(exportData, null, 2);
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      
                      // Simple approach: download as JSON file (user can zip if needed)
                      // For a true zip, we'd need a library like JSZip
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `headm8-export-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Export failed:', error);
                      alert('Failed to export data. Please try again.');
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-main)] rounded-2xl hover:bg-[var(--bg-panel)] transition-colors text-[var(--text-primary)] disabled:opacity-50"
                >
                  <span className="font-medium">{isExporting ? 'Exporting...' : 'Export System Data'}</span>
                  {isExporting ? <Loader2 size={18} className="text-[var(--text-muted)] animate-spin" /> : <Download size={18} className="text-[var(--text-muted)]" />}
                </button>
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors text-blue-600 font-medium"
                >
                  <span>Sign Out</span>
                  <LogOut size={18} />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-red-600"
                >
                  <span className="font-medium">Delete Account</span>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--bg-surface)] rounded-3xl p-8 max-w-md w-full border border-[var(--bg-panel)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Delete Account</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  This action is <span className="font-bold text-red-600">irreversible</span>. All your data will be permanently deleted including:
                </p>
                <ul className="text-left text-sm text-[var(--text-secondary)] bg-[var(--bg-main)] rounded-2xl p-4 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <Trash2 size={14} className="text-red-500" />
                    Your profile and account
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 size={14} className="text-red-500" />
                    All alters ({alters.length} alters)
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 size={14} className="text-red-500" />
                    All switch logs ({switches.length} switches)
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 size={14} className="text-red-500" />
                    All diary entries
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 size={14} className="text-red-500" />
                    All folders and messages
                  </li>
                </ul>
                {deleteError && (
                  <p className="text-red-500 text-sm mb-4">{deleteError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-2xl font-medium hover:bg-[var(--bg-panel)] transition-colors"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Delete Forever
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
