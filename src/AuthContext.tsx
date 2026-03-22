import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    let unsubProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
            setLoading(false);
            setIsAuthReady(true);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              username: user.uid.slice(0, 8),
              displayName: user.displayName || 'Unnamed System',
              systemName: user.displayName || 'Unnamed System',
              themeConfig: {
                background: '#f5f5f5',
                accent: '#a855f7',
                text: '#1a1a1a',
                isDark: false,
                highContrast: false,
                fontSize: 'medium',
                dyslexiaFont: false,
                useAlterTheme: true,
              },
              isPrivate: true,
              followingIds: [],
              followerIds: [],
              friendIds: [],
              isSinglet: false,
            };
            try {
              await setDoc(doc(db, 'users', user.uid), newProfile);
              setProfile(newProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            }
            setLoading(false);
            setIsAuthReady(true);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
          setIsAuthReady(true);
        });
      } else {
        setProfile(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribe();
      unsubProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
