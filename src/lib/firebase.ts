import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Store ID token strictly in memory (never in localStorage) per security guidelines
let inMemoryIdToken: string | null = null;
let inMemoryAuthUser: { uid: string; email: string; displayName: string } | null = null;

export const getInMemoryAuthToken = async (): Promise<string | null> => {
  if (auth.currentUser) {
    try {
      inMemoryIdToken = await auth.currentUser.getIdToken();
      return inMemoryIdToken;
    } catch {
      return inMemoryIdToken;
    }
  }
  return inMemoryIdToken;
};

export const getInMemoryAuthUser = () => inMemoryAuthUser;

export const signInWithGoogleForCloudSync = async (): Promise<{
  uid: string;
  email: string;
  displayName: string;
  idToken: string;
} | null> => {
  const credential = await signInWithPopup(auth, googleAuthProvider);
  const user: User = credential.user;
  const idToken = await user.getIdToken();
  inMemoryIdToken = idToken;
  inMemoryAuthUser = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'शिक्षक जी',
  };
  return {
    ...inMemoryAuthUser,
    idToken,
  };
};
