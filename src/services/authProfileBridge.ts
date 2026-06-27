import { authService } from './auth/authService';
import { fetchUserProfile } from './profileService';
import type { UserProfile } from '../types/user';

export const handleSecureSignIn = async (setProfile: (p: UserProfile | null) => void) => {
  try {
    const user = await authService.signInWithGoogle();

    // 2. Hydrate User Entitlements from Firestore
    const profileData = await fetchUserProfile(user.uid);

    // 3. Commit state to UserContext
    if (profileData) {
      setProfile({ ...profileData, uid: user.uid });
    } else {
      // Handle edge case: User exists in Auth but not in Firestore
      console.warn('Profile hydration failed: Document missing.');
    }
  } catch (error) {
    console.error('Auth-Profile Bridge Failure:', error);
    throw error;
  }
};

export default { handleSecureSignIn };
