import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserProfile } from '../types/user';
import { fetchUserProfile } from '../services/profileService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface UserContextShape {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  checkEntitlement: (feature: keyof UserProfile['entitlements']) => boolean;
  loadProfile: (uid: string) => Promise<void>;
}

const UserContext = createContext<UserContextShape | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const checkEntitlement = useCallback(
    (feature: keyof UserProfile['entitlements']) => {
      return profile?.entitlements?.[feature] ?? false;
    },
    [profile]
  );

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const p = await fetchUserProfile(uid);
      if (p) setProfile(p);
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        void loadProfile(user.uid);
      } else {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, [loadProfile]);

  return (
    <UserContext.Provider value={{ profile, setProfile, checkEntitlement, loadProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

export default UserContext;
