import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { auth } from '../../../utils/firebase';
import { SecureStoreService } from '../../../services/secureStore';

export const TOKEN_EXPIRATION_KEY = 'auth_token_expiration';

/**
 * Purpose: Wrapper service interface for Firebase Authentication SDK.
 * Handles identity login, email registration, password resets, verification,
 * and secure credential token caching.
 */
export const authService = {
  login: async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await userCredential.user.getIdTokenResult();
    await SecureStoreService.setItem(TOKEN_EXPIRATION_KEY, tokenResult.expirationTime);
    return userCredential.user;
  },

  register: async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await firebaseUpdateProfile(userCredential.user, { displayName });
    const tokenResult = await userCredential.user.getIdTokenResult();
    await SecureStoreService.setItem(TOKEN_EXPIRATION_KEY, tokenResult.expirationTime);
    return userCredential.user;
  },

  logout: async () => {
    await firebaseSignOut(auth);
    await SecureStoreService.deleteItem(TOKEN_EXPIRATION_KEY);
  },

  sendPasswordReset: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  sendEmailVerification: async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  },

  getIdToken: async (forceRefresh = false): Promise<string | null> => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(forceRefresh);
      const tokenResult = await auth.currentUser.getIdTokenResult(forceRefresh);
      await SecureStoreService.setItem(TOKEN_EXPIRATION_KEY, tokenResult.expirationTime);
      return token;
    }
    return null;
  },
};
