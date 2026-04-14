import React, { useState, useMemo, useEffect } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Activity, Plus, Check, Clock, BarChart3, Trash2, UserMinus, Timer, Edit2, Save, X, Trash, AlertTriangle } from 'lucide-react';
import { cn, formatDate, formatDetailedDuration } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const SwitchTracker: React.FC = () => {
  const { alters, switches, frontHistory, currentFronters, mainFront } = useSystem();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'analytics'>('current');
  
  // Custom status editing state
  const [editingStatusFor, setEditingStatusFor] = useState<string | null>(null);
  const [statusInput, setStatusInput] = useState('');
  
  // Current time for live timer updates
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every second for live timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Add an alter to front
  const handleAddToFront = async (alterId: string) => {
    console.log('handleAddToFront called', { user: !!user, profile: !!profile, alterId });
    if (!user || !profile) {
      console.log('Missing user or profile');
      return;
    }
    
    // Check if already fronting
    if (profile.currentFrontIds?.includes(alterId)) {
      console.log('Already fronting', alterId);
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    try {
      console.log('Updating profile with newFrontIds', [...(profile.currentFrontIds || []), alterId]);
      // Update profile's currentFrontIds
      const newFrontIds = [...(profile.currentFrontIds || []), alterId];
      await updateDoc(doc(db, 'users', user.uid), {
        currentFrontIds: newFrontIds,
      });
      console.log('Profile updated, creating history entry');
      
      // Create history entry (append-only, never modify)
      await addDoc(collection(db, 'users', user.uid, 'frontHistory'), {
        userId: user.uid,
        alterId,
        action: 'added',
        timestamp,
      });
      console.log('History entry created successfully');
    } catch (error) {
      console.error('Error in handleAddToFront:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Remove an alter from front
  const handleRemoveFromFront = async (alterId: string) => {
    if (!user || !profile) return;
    
    const removeTimestamp = new Date().toISOString();
    
    try {
      // Update profile's currentFrontIds - remove this alter
      const newFrontIds = (profile.currentFrontIds || []).filter(id => id !== alterId);
      
      // Also remove their status
      const newStatuses = { ...profile.frontStatuses };
      delete newStatuses[alterId];
      
      // Prepare update object - also clear mainFrontId if this was the main front
      const updateData: Record<string, any> = {
        currentFrontIds: newFrontIds,
        frontStatuses: newStatuses,
      };
      
      // If removing the main front, clear mainFrontId
      if (profile.mainFrontId === alterId) {
        updateData.mainFrontId = null;
      }
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      // Find the most recent "added" entry for this alter from our local state
      const alterHistory = frontHistory
        .filter(h => h.alterId === alterId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Find the most recent "added" entry
      let addTimestamp: string | undefined;
      for (const entry of alterHistory) {
        if (entry.action === 'added') {
          addTimestamp = entry.timestamp;
          break;
        }
      }
      
      // Also check switches as fallback
      if (!addTimestamp) {
        for (const sw of switches) {
          if (sw.alterIds?.includes(alterId) && !sw.alterEndTimestamps?.[alterId]) {
            addTimestamp = sw.alterTimestamps?.[alterId] || sw.timestamp;
            break;
          }
        }
      }
      
      // Create history entry for removal (append-only, never modify)
      await addDoc(collection(db, 'users', user.uid, 'frontHistory'), {
        userId: user.uid,
        alterId,
        action: 'removed',
        timestamp: removeTimestamp,
        previousTimestamp: addTimestamp,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Set an alter as main front
  const handleSetMainFront = async (alterId: string) => {
    if (!user || !profile) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        mainFrontId: alterId,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Update custom front status
  const handleUpdateStatus = async (alterId: string) => {
    if (!user || !profile) return;
    
    try {
      const newStatuses = {
        ...profile.frontStatuses,
        [alterId]: statusInput,
      };
      
      // If status is empty, remove it
      if (!statusInput.trim()) {
        delete newStatuses[alterId];
      }
      
      await updateDoc(doc(db, 'users', user.uid), {
        frontStatuses: newStatuses,
      });
      
      setEditingStatusFor(null);
      setStatusInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Start editing status
  const startEditingStatus = (alterId: string, currentStatus: string) => {
    setEditingStatusFor(alterId);
    setStatusInput(currentStatus || '');
  };

  // Cancel editing status
  const cancelEditingStatus = () => {
    setEditingStatusFor(null);
    setStatusInput('');
  };

  // Clear all fronting
  const handleClearFront = async () => {
    if (!user || !profile) return;
    
    const now = new Date().toISOString();
    
    try {
      const currentFrontIds = profile.currentFrontIds || [];
      
      // Create history entries for each current fronter being removed
      const historyUpdates = currentFrontIds.map(async (alterId) => {
        const alterHistory = frontHistory
          .filter(h => h.alterId === alterId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        let addTimestamp: string | undefined;
        for (const entry of alterHistory) {
          if (entry.action === 'added') {
            addTimestamp = entry.timestamp;
            break;
          }
        }
        
        return addDoc(collection(db, 'users', user.uid, 'frontHistory'), {
          userId: user.uid,
          alterId,
          action: 'removed',
          timestamp: now,
          previousTimestamp: addTimestamp,
        });
      });
      
      await Promise.all(historyUpdates);
      
      // Clear fronting state and statuses
      await updateDoc(doc(db, 'users', user.uid), {
        currentFrontIds: [],
        mainFrontId: null,
        frontStatuses: {},
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Calculate analytics from frontHistory
  const analytics = useMemo(() => {
    const addedEntries = frontHistory.filter(entry => entry.action === 'added');
    
    if (addedEntries.length === 0) return null;

    const sortedEntries = [...addedEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const alterStats: Record<string, {
      alterId: string;
      alterName: string;
      alterAvatar: string;
      frontCount: number;
      totalMinutes: number;
    }> = {};

    sortedEntries.forEach((entry, index) => {
      const alterId = entry.alterId;
      const alter = alters.find(a => a.id === alterId);
      if (!alter) return;
      
      // Calculate duration: time until next 'added' entry
      let durationMinutes = 60; // Default 1 hour
      const nextEntry = sortedEntries[index + 1];
      if (nextEntry) {
        const currentTimeVal = new Date(entry.timestamp).getTime();
        const nextTimeVal = new Date(nextEntry.timestamp).getTime();
        durationMinutes = Math.max(1, Math.floor((nextTimeVal - currentTimeVal) / 60000));
      }

      if (!alterStats[alterId]) {
        alterStats[alterId] = {
          alterId,
          alterName: alter.name,
          alterAvatar: alter.avatarUrl,
          frontCount: 0,
          totalMinutes: 0
        };
      }
      alterStats[alterId].frontCount += 1;
      alterStats[alterId].totalMinutes += durationMinutes;
    });

    const statsArray = Object.values(alterStats).sort((a, b) => b.frontCount - a.frontCount);
    
    const totalSwitches = addedEntries.length;
    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    const systemUptimeMs = new Date(lastEntry.timestamp).getTime() - new Date(firstEntry.timestamp).getTime();
    const systemDays = Math.max(1, Math.floor(systemUptimeMs / (1000 * 60 * 60 * 24)));
    const avgFrontsPerDay = (totalSwitches / systemDays).toFixed(1);

    return {
      alterStats: statsArray,
      totalSwitches,
      systemDays,
      avgFrontsPerDay,
      totalAlters: alters.length,
      activeAlters: statsArray.length
    };
  }, [frontHistory, alters]);

  // Format duration as readable string with days, hrs, mins, secs
  const formatDurationString = (startTime: string | undefined) => {
    if (!startTime) return 'Unknown';
    const duration = formatDetailedDuration(startTime, currentTime.toISOString());
    const parts = [];
    if (duration.days > 0) parts.push(`${duration.days}d`);
    if (duration.hours > 0) parts.push(`${duration.hours}h`);
    if (duration.minutes > 0) parts.push(`${duration.minutes}m`);
    parts.push(`${duration.seconds}s`);
    return parts.join(' ');
  };

  // Delete a front history entry
  const handleDeleteHistoryEntry = async (historyId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'frontHistory', historyId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/frontHistory/${historyId}`);
    }
  };

  // Get the timestamp when an alter was added to front
  const getAddTimestamp = (alterId: string): string | undefined => {
    const alterHistory = frontHistory
      .filter(h => h.alterId === alterId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const entry of alterHistory) {
      if (entry.action === 'added') {
        return entry.timestamp;
      }
    }
    
    for (const sw of switches) {
      if (sw.alterIds?.includes(alterId) && !sw.alterEndTimestamps?.[alterId]) {
        return sw.alterTimestamps?.[alterId] || sw.timestamp;
      }
    }
    
    return undefined;
  };

  // Check if an alter is a "orphaned" fronter - in currentFrontIds but no "added" entry in history
  const isOrphanedFronting = (alterId: string): boolean => {
    if (!profile?.currentFrontIds?.includes(alterId)) return false;
    
    // Check if there's an "added" entry for this alter
    const hasAddedEntry = frontHistory.some(h => h.alterId === alterId && h.action === 'added');
    return !hasAddedEntry;
  };

  // Fix orphaned fronters - add missing "added" history entries for stale currentFrontIds
  const handleFixOrphanedFronters = async () => {
    if (!user || !profile?.currentFrontIds) return;
    
    const orphanedIds = profile.currentFrontIds.filter(id => isOrphanedFronting(id));
    if (orphanedIds.length === 0) return;
    
    const timestamp = new Date().toISOString();
    
    try {
      // Create "added" history entries for orphaned fronters
      const updates = orphanedIds.map(async (alterId) => {
        await addDoc(collection(db, 'users', user.uid, 'frontHistory'), {
          userId: user.uid,
          alterId,
          action: 'added',
          timestamp,
          isRecovery: true, // Mark as recovery entry
        });
      });
      
      await Promise.all(updates);
      console.log('Fixed orphaned fronters:', orphanedIds);
    } catch (error) {
      console.error('Error fixing orphaned fronters:', error);
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/frontHistory`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Front Tracker</h2>
          <p className="text-[var(--text-secondary)]">Track and analyze your system's fronting patterns.</p>
        </div>
        <div className="flex gap-2 p-1 bg-[var(--bg-main)] rounded-xl border border-[var(--bg-panel)]">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'current'
                ? 'bg-[var(--accent-main)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Activity size={18} />
            Current
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-[var(--accent-main)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock size={18} />
            History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-[var(--accent-main)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BarChart3 size={18} />
            Analytics
          </button>
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--bg-panel)] shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Total Switches</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{analytics.totalSwitches}</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--bg-panel)] shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Tracking Days</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{analytics.systemDays}</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--bg-panel)] shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Avg/Day</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{analytics.avgFrontsPerDay}</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--bg-panel)] shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Active Alters</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{analytics.activeAlters}/{analytics.totalAlters}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Alter Fronting Statistics</h3>
            <div className="space-y-4">
              {analytics.alterStats.map((stat) => {
                const hours = Math.floor(stat.totalMinutes / 60);
                const days = Math.floor(hours / 24);
                const remainingHours = hours % 24;
                const percentage = ((stat.frontCount / analytics.totalSwitches) * 100).toFixed(1);
                
                return (
                  <div key={stat.alterId} className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)]">
                    <img
                      src={stat.alterAvatar || `https://ui-avatars.com/api/?name=${stat.alterName}`}
                      alt={stat.alterName}
                      className="w-12 h-12 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-[var(--text-primary)] truncate">{stat.alterName}</p>
                        <p className="text-sm font-medium text-[var(--accent-main)]">{percentage}%</p>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[var(--accent-main)]" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{stat.frontCount} fronts</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {days > 0 ? `${days}d ` : ''}{remainingHours}h
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && !analytics && (
        <div className="bg-[var(--bg-surface)] rounded-3xl p-12 border border-[var(--bg-panel)] shadow-sm text-center">
          <BarChart3 size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
          <p className="text-[var(--text-muted)] italic">No switch data available yet.</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Start logging switches to see analytics.</p>
        </div>
      )}

      {/* Current Tab */}
      {activeTab === 'current' && (
      <>
      {/* Currently Fronting Section */}
      <div className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="text-[var(--accent-main)]" />
            Currently Fronting
          </h3>
          {currentFronters.length > 0 && (
            <button
              onClick={handleClearFront}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
        </div>
        
        {currentFronters.length > 0 ? (
          <div className="space-y-4">
            {currentFronters.map((alter) => {
              const addTimestamp = getAddTimestamp(alter.id);
              const isMainFront = mainFront?.id === alter.id;
              const alterStatus = profile?.frontStatuses?.[alter.id] || '';
              const isEditing = editingStatusFor === alter.id;
              const isOrphaned = isOrphanedFronting(alter.id);
              
              return (
                <div 
                  key={alter.id} 
                  className={cn(
                    "flex flex-col md:flex-row md:items-center gap-4 p-4 bg-[var(--bg-main)] rounded-2xl border-2",
                    isOrphaned ? "border-yellow-500" : ""
                  )}
                  style={!isOrphaned ? { borderColor: alter.themeConfig?.accent || 'var(--accent-main)' } : undefined}
                >
                  <img
                    src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                    alt={alter.name}
                    className="w-16 h-16 rounded-2xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-[var(--text-primary)]">{alter.name}</p>
                      {isMainFront && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-[var(--accent-main)] text-white rounded-full">
                          Main
                        </span>
                      )}
                      {isOrphaned && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500 text-white rounded-full">
                          Orphaned
                        </span>
                      )}
                    </div>
                    
                    {/* Live Timer */}
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                      <Timer size={14} className={isOrphaned ? "text-yellow-500" : "text-[var(--accent-main)]"} />
                      {isOrphaned ? (
                        <span className="text-yellow-600">Unknown duration (missing history)</span>
                      ) : (
                        <span>Fronting for: {formatDurationString(addTimestamp)}</span>
                      )}
                    </div>
                    
                    {/* Custom Status Display/Input */}
                    <div className="mt-2">
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            placeholder="Set your front status..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--bg-panel)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateStatus(alter.id)}
                            className="p-1.5 bg-[var(--accent-main)] text-white rounded-lg"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={cancelEditingStatus}
                            className="p-1.5 bg-[var(--bg-panel)] text-[var(--text-primary)] rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : alterStatus ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-[var(--accent-main)]/10 text-[var(--accent-main)] rounded-full text-sm">
                            {alterStatus}
                          </span>
                          <button
                            onClick={() => startEditingStatus(alter.id, alterStatus)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-main)]"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingStatus(alter.id, '')}
                          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-main)]"
                        >
                          + Add status
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!isMainFront && (
                      <button
                        onClick={() => handleSetMainFront(alter.id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--accent-main)] rounded-xl transition-colors"
                        title="Set as main front"
                      >
                        <Check size={16} />
                        Main
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveFromFront(alter.id)}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                      title="Remove from front"
                    >
                      <UserMinus size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <p>No one is currently fronting</p>
          </div>
        )}
        
        {/* Orphaned fronters warning */}
        {currentFronters.length > 0 && currentFronters.some(a => isOrphanedFronting(a.id)) && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-300 dark:border-yellow-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-200">
                  {currentFronters.filter(a => isOrphanedFronting(a.id)).length} orphan alter(s) detected
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  These alters are marked as fronting but have no history entry. This can happen after data recovery. 
                  Click the "Fix" button below or remove them to resolve this issue.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add to Front Section */}
      <div className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm">
        <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-6">
          <Plus className="text-[var(--accent-main)]" />
          Add Alter to Front
        </h3>
        
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {alters.map((alter) => {
            const isFronting = currentFronters.some(f => f.id === alter.id);
            const isOrphaned = isOrphanedFronting(alter.id);
            const isDisabled = isFronting && !isOrphaned;
            
            return (
              <button
                key={alter.id}
                onClick={() => isOrphaned ? handleFixOrphanedFronters() : (!isFronting && handleAddToFront(alter.id))}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                  isOrphaned
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:border-yellow-600 cursor-pointer"
                    : isFronting
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default"
                    : "border-transparent bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:border-[var(--accent-main)]"
                )}
                title={isOrphaned ? "Missing history entry - click to fix" : (isFronting ? "Currently fronting" : "Add to front")}
              >
                <img
                  src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                  alt={alter.name}
                  className="w-12 h-12 rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-bold truncate w-full text-center">{alter.name}</span>
                {isOrphaned && <span className="text-[10px] text-yellow-600">Fix needed</span>}
                {isFronting && !isOrphaned && <Check size={12} className="text-green-500" />}
              </button>
            );
          })}
        </div>
      </div>
      </>)}

      {/* History Tab */}
      {activeTab === 'history' && (
      <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--bg-panel)] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--bg-panel)]">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Clock className="text-[var(--accent-main)]" />
            Front History Log
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Each add/remove action is logged as a separate entry (append-only)
          </p>
        </div>
        <div className="divide-y divide-[var(--bg-panel)]">
          {frontHistory.length > 0 ? frontHistory.map((entry) => {
            const alter = alters.find(a => a.id === entry.alterId);
            const isAdded = entry.action === 'added';
            
            let duration = null;
            if (!isAdded && entry.previousTimestamp) {
              duration = formatDetailedDuration(entry.previousTimestamp, entry.timestamp);
            }
            
            return (
              <div key={entry.id} className="p-6 hover:bg-[var(--bg-main)] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isAdded ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"
                  )}>
                    {isAdded ? <Plus size={20} /> : <UserMinus size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-[var(--text-primary)]">
                        {alter?.name || 'Unknown Alter'}
                      </p>
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-bold rounded-full",
                        isAdded ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"
                      )}>
                        {isAdded ? 'Added to Front' : 'Removed from Front'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {formatDate(entry.timestamp)}
                    </p>
                    {!isAdded && duration && (
                      <p className="text-sm text-[var(--accent-main)] mt-1">
                        Fronted for: {duration.days > 0 ? `${duration.days}d ` : ''}{duration.hours > 0 ? `${duration.hours}h ` : ''}{duration.minutes > 0 ? `${duration.minutes}m ` : ''}{duration.seconds}s
                      </p>
                    )}
                  </div>
                  {alter ? (
                    <img
                      src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                      alt={alter.name}
                      className="w-10 h-10 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-panel)] flex items-center justify-center text-[var(--text-muted)]">
                      ?
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleDeleteHistoryEntry(entry.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete this entry"
                  >
                    <Trash size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No front history yet.</p>
              <p className="text-sm mt-2">Add alters to front to start tracking.</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default SwitchTracker;
