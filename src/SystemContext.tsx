import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Alter, SwitchLog } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

interface SystemContextType {
  alters: Alter[];
  switches: SwitchLog[];
  currentFronters: Alter[];
  loading: boolean;
}

const SystemContext = createContext<SystemContextType>({
  alters: [],
  switches: [],
  currentFronters: [],
  loading: true,
});

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useAuth();
  const [alters, setAlters] = useState<Alter[]>([]);
  const [switches, setSwitches] = useState<SwitchLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setAlters([]);
      setSwitches([]);
      setLoading(false);
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
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/switches`);
    });

    return () => {
      unsubAlters();
      unsubSwitches();
    };
  }, [user, isAuthReady]);

  const currentFronters = alters.filter(alter => 
    switches[0]?.alterIds.includes(alter.id)
  );

  return (
    <SystemContext.Provider value={{ alters, switches, currentFronters, loading }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => useContext(SystemContext);
