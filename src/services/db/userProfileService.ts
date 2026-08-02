import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestoreDb as db } from '../../config/firebase';
import { UserProfile } from '../auth/userProfile';

export const UserProfileService = {
  /**
   * Hydrate user profile from Firestore on session initiation
   */
  async getProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  /**
   * Persist high-fidelity preferences (VolatilityComfort, Healthometer baselines)
   */
  async updateProfile(uid: string, data: Partial<UserProfile>) {
    const docRef = doc(db, 'users', uid);
    try {
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Fallback: If document doesn't exist, create it
      await setDoc(docRef, { ...data, createdAt: serverTimestamp() }, { merge: true });
    }
  }
};

export default UserProfileService;
