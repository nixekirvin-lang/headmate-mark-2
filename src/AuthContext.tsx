import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, deleteUser } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, deleteDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  isDeleting: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
  logout: async () => {},
  deleteAccount: async () => false,
  isDeleting: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!user) return false;
    setIsDeleting(true);
    
    try {
      const userId = user.uid;
      
      // Delete all subcollections and their documents
      const subcollections = ['alters', 'switches', 'diary', 'folders', 'internal_messages', 'frontHistory', 'pet'];
      
      for (const subcollection of subcollections) {
        const colRef = collection(db, 'users', userId, subcollection);
        const snapshot = await getDocs(colRef);
        
        const deletePromises = snapshot.docs.map(docItem => 
          deleteDoc(docItem.ref)
        );
        await Promise.all(deletePromises);
      }
      
      // Delete the user profile document
      await deleteDoc(doc(db, 'users', userId));
      
      // Delete Firebase Auth user
      await deleteUser(user);
      
      // Clean up local state
      setUser(null);
      setProfile(null);
      
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let unsubProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            // Ensure new fields exist for existing profiles
            let needsUpdate = false;
            if (!data.currentFrontIds) {
              data.currentFrontIds = [];
              needsUpdate = true;
            }
            if (!data.frontStatuses) {
              data.frontStatuses = {};
              needsUpdate = true;
            }
            // Save defaults to Firestore if they didn't exist
            if (needsUpdate) {
              try {
                await updateDoc(doc(db, 'users', user.uid), {
                  currentFrontIds: data.currentFrontIds,
                  frontStatuses: data.frontStatuses,
                });
              } catch (e) {
                console.error('Error updating profile:', e);
              }
            }
            setProfile(data);
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
              friendsCount: 0,
              isSinglet: false,
              currentFrontIds: [],
              frontStatuses: {},
              createdAt: new Date().toISOString(),
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
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, logout, deleteAccount, isDeleting }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
