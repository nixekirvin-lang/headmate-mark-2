import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Alter, SwitchLog, FrontHistoryEntry } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

export interface CurrentFrontInfo {
  alter: Alter;
  addedAt: string;
  status?: string;
  isMainFront: boolean;
}

interface SystemContextType {
  alters: Alter[];
  switches: SwitchLog[];
  frontHistory: FrontHistoryEntry[];
  currentFronters: Alter[];
  mainFront: Alter | null;
  currentFrontersWithInfo: CurrentFrontInfo[];
  loading: boolean;
}

const SystemContext = createContext<SystemContextType>({
  alters: [],
  switches: [],
  frontHistory: [],
  currentFronters: [],
  mainFront: null,
  currentFrontersWithInfo: [],
  loading: true,
});

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady, profile } = useAuth();
  const [alters, setAlters] = useState<Alter[]>([]);
  const [switches, setSwitches] = useState<SwitchLog[]>([]);
  const [frontHistory, setFrontHistory] = useState<FrontHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[SystemContext] useEffect triggered, isAuthReady:', isAuthReady, 'user:', !!user);
    if (!isAuthReady || !user) {
      setAlters([]);
      setSwitches([]);
      setLoading(false);
      console.log('[SystemContext] No auth or user, setting loading to false');
      return;
    }

    const altersQuery = query(collection(db, 'users', user.uid, 'alters'));
    const switchesQuery = query(
      collection(db, 'users', user.uid, 'switches'),
      orderBy('timestamp', 'desc')
    );

    const unsubAlters = onSnapshot(altersQuery, (snapshot) => {
      setAlters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alter)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/alters`);
    });

    const unsubSwitches = onSnapshot(switchesQuery, (snapshot) => {
      setSwitches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SwitchLog)));
      setLoading(false);
    }, (error) => {
      console.error('[SystemContext] Error fetching switches:', error);
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/switches`);
      setLoading(false); // Ensure loading is set to false even on error
    });

    // Subscribe to frontHistory collection
    const historyQuery = query(
      collection(db, 'users', user.uid, 'frontHistory'),
      orderBy('timestamp', 'desc')
    );
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      setFrontHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FrontHistoryEntry)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/frontHistory`);
    });

    return () => {
      unsubAlters();
      unsubSwitches();
      unsubHistory();
    };
  }, [user, isAuthReady]);

  // Compute currentFronters from profile's currentFrontIds
  const currentFronters = useMemo(() => {
    if (!profile?.currentFrontIds || !alters.length) return [];
    return alters.filter(alter => profile.currentFrontIds?.includes(alter.id));
  }, [profile?.currentFrontIds, alters]);

  // Compute mainFront from profile's mainFrontId
  const mainFront = useMemo(() => {
    if (!profile?.mainFrontId || !alters.length) return null;
    // Only return mainFront if they're still in the currentFronters list
    if (!profile.currentFrontIds?.includes(profile.mainFrontId)) return null;
    return alters.find(alter => alter.id === profile.mainFrontId) || null;
  }, [profile?.mainFrontId, profile?.currentFrontIds, alters]);

  // Compute currentFrontersWithInfo - from profile's currentFrontIds and frontHistory
  const currentFrontersWithInfo = useMemo(() => {
    if (!profile?.currentFrontIds || !alters.length || !frontHistory.length) return [];
    
    return profile.currentFrontIds.map(alterId => {
      const alter = alters.find(a => a.id === alterId);
      if (!alter) return null;
      
      // Find when this alter was last added to front
      const addEntry = frontHistory.find(h => h.alterId === alterId && h.action === 'added');
      const addedAt = addEntry?.timestamp || new Date().toISOString();
      
      const isMainFront = profile.mainFrontId === alterId;
      
      // Get status from history entry or fallback to profile's frontStatuses
      const status = addEntry?.frontStatus || profile.frontStatuses?.[alterId];
      
      return {
        alter,
        addedAt,
        status,
        isMainFront,
      };
    }).filter(Boolean) as CurrentFrontInfo[];
  }, [profile?.currentFrontIds, profile?.mainFrontId, alters, frontHistory, profile?.frontStatuses]);

  return (
    <SystemContext.Provider value={{ alters, switches, frontHistory, currentFronters, mainFront, currentFrontersWithInfo, loading }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => useContext(SystemContext);
