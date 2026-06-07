import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types/user';

export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export default { fetchUserProfile };
