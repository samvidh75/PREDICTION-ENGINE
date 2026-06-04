import { useState, useEffect } from 'react';
import { UserProfile } from '../services/auth/userProfile';
import { saveUserProfile, loadUserProfile } from '../services/auth/userProfileStore';

// Simple external state container matching the Zustand hook API design,
// but written in pure TypeScript to preserve our ultra-lean zero-dependency footprint.
type StoreState = {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
};

type Listener = (state: StoreState) => void;

let currentProfile: UserProfile | null = null;
const listeners = new Set<Listener>();

const store = {
  getState(): StoreState {
    return {
      profile: currentProfile,
      setProfile(profile: UserProfile | null) {
        currentProfile = profile;
        if (profile) {
          saveUserProfile(profile);
        }
        listeners.forEach((listener) => listener(store.getState()));
      }
    };
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

};

export function useUserProfileStore<T>(selector: (state: StoreState) => T): T {
  const [slice, setSlice] = useState(() => selector(store.getState()));

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setSlice(selector(state));
    });
    return unsubscribe;
  }, [selector]);

  return slice;
}

export default useUserProfileStore;
