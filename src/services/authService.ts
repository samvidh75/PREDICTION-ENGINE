import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Auth Exception:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export default { signInWithGoogle, logout };
