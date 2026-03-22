import React, { useState } from 'react';
import { useSystem } from '../SystemContext';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Activity, Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { cn, formatDate, formatDuration, formatTimeRange } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

const SwitchTracker: React.FC = () => {
  const { alters, switches, currentFronters } = useSystem();
  const { user } = useAuth();
  const [selectedAlters, setSelectedAlters] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [triggers, setTriggers] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLogSwitch = async () => {
    if (!user || selectedAlters.length === 0) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'switches'), {
        systemId: user.uid,
        alterIds: selectedAlters,
        timestamp: new Date().toISOString(),
        notes,
        triggers: triggers.split(',').map(t => t.trim()).filter(t => t),
      });
      setSelectedAlters([]);
      setNotes('');
      setTriggers('');
      setIsLogging(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/switches`);
    }
  };

  const toggleAlter = (id: string) => {
    setSelectedAlters(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Front History</h2>
          <p className="text-[var(--text-secondary)]">Log and analyze your system's fronting patterns.</p>
        </div>
      </div>

      {/* Currently Fronting Section */}
      <div className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm">
        <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)] mb-6">
          <Activity className="text-[var(--accent-main)]" />
          Currently Fronting
        </h3>
        {currentFronters.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {currentFronters.map((alter) => (
              <div key={alter.id} className="flex items-center gap-4 p-4 bg-[var(--bg-main)] rounded-2xl border-2" style={{ borderColor: alter.themeConfig?.accent || 'var(--accent-main)' }}>
                <img
                  src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                  alt={alter.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{alter.name}</p>
                  {switches[0] && (
                    <p className="text-sm text-[var(--text-muted)]">Fronting since: {formatDate(switches[0].timestamp)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <p>No one is currently fronting</p>
            <button
              onClick={() => setIsLogging(true)}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)] mx-auto"
            >
              <Plus size={20} />
              Log New Switch
            </button>
          </div>
        )}
      </div>

      {/* Log New Switch Button (when not logging) */}
      {!isLogging && currentFronters.length > 0 && (
        <button
          onClick={() => setIsLogging(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent-glow)]"
        >
          <Plus size={20} />
          Log New Switch
        </button>
      )}

      {isLogging && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Who is fronting now?</h3>
            <button onClick={() => setIsLogging(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {alters.map((alter) => (
              <button
                key={alter.id}
                onClick={() => toggleAlter(alter.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                  selectedAlters.includes(alter.id)
                    ? "border-[var(--accent-main)] bg-[var(--accent-main)]/10 text-[var(--accent-main)]"
                    : "border-transparent bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
                )}
              >
                <img
                  src={alter.avatarUrl || `https://ui-avatars.com/api/?name=${alter.name}`}
                  alt={alter.name}
                  className="w-12 h-12 rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-bold truncate w-full text-center">{alter.name}</span>
                {selectedAlters.includes(alter.id) && <Check size={12} className="text-[var(--accent-main)]" />}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none min-h-[100px]"
                placeholder="How are you feeling? Any context for the switch?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Triggers (optional)</label>
              <input
                value={triggers}
                onChange={e => setTriggers(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--bg-panel)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none"
                placeholder="e.g. Stress, Music, Specific Person"
              />
            </div>
          </div>

          <button
            disabled={selectedAlters.length === 0}
            onClick={handleLogSwitch}
            className="w-full py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold text-lg hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Switch
          </button>
        </motion.div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--bg-panel)] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--bg-panel)]">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Clock className="text-[var(--accent-main)]" />
            Front History
          </h3>
        </div>
        <div className="divide-y divide-[var(--bg-panel)]">
          {switches.map((log) => (
            <div key={log.id} className="p-6 hover:bg-[var(--bg-main)] transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {log.alterIds.map((id) => {
                      const alter = alters.find(a => a.id === id);
                      return (
                        <img
                          key={id}
                          src={alter?.avatarUrl || `https://ui-avatars.com/api/?name=${alter?.name || '?'}`}
                          alt={alter?.name}
                          className="w-12 h-12 rounded-2xl border-2 border-[var(--bg-surface)] object-cover shadow-sm"
                          style={{ borderColor: alter?.themeConfig?.accent || 'var(--accent-main)' }}
                          referrerPolicy="no-referrer"
                        />
                      );
                    })}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {log.alterIds.map(id => alters.find(a => a.id === id)?.name).join(' & ')}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">{formatTimeRange(log.timestamp, switches[switches.indexOf(log) + 1]?.timestamp || null)}</p>
                    <p className="text-xs text-[var(--accent-main)]">Duration: {formatDuration(log.timestamp, switches[switches.indexOf(log) + 1]?.timestamp || null)}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {log.triggers && log.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {log.triggers.map(t => (
                        <span key={t} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                          <AlertCircle size={10} />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {log.notes && (
                <div className="mt-4 p-4 bg-[var(--bg-main)] rounded-2xl text-sm text-[var(--text-secondary)] italic border border-[var(--bg-panel)]">
                  "{log.notes}"
                </div>
              )}
            </div>
          ))}
          {switches.length === 0 && (
            <div className="p-12 text-center text-[var(--text-muted)] italic">
              No switch history found. Start logging to see patterns!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwitchTracker;
