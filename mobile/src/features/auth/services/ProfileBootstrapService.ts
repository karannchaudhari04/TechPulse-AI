import { auth } from '../../../utils/firebase';
import { store } from '../../../store';
import { 
  setProfileStart, 
  setProfileSuccess, 
  setProfileFailure 
} from '../../../store/slices/profileSlice';
import { profileApiSlice } from '../../profile/api/profileApiSlice';
import { authApiSlice } from '../api/authApiSlice';

/**
 * Purpose: Service coordinating email verification checks and backend profile synchronization.
 * Triggers backend handshakes to populate the Redux profile slice on authenticated status.
 */
export const ProfileBootstrapService = {
  bootstrapProfile: async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) {
      store.dispatch(setProfileFailure('No authenticated user found'));
      return false;
    }

    store.dispatch(setProfileStart());
    try {
      // 1. Sync Firebase credentials with the Spring Boot backend
      await store.dispatch(
        authApiSlice.endpoints.registerOrLogin.initiate({
          email: user.email || '',
          displayName: user.displayName || 'Tech Explorer',
          photoUrl: user.photoURL || '',
        })
      ).unwrap();

      // 2. Load the verified backend profile records
      const profileResponse = await store.dispatch(
        profileApiSlice.endpoints.getProfile.initiate(undefined, { forceRefetch: true })
      ).unwrap();

      // 3. Update the Redux profile slice with synchronized information
      store.dispatch(
        setProfileSuccess({
          displayName: profileResponse.displayName,
          photoURL: profileResponse.photoUrl,
          roles: profileResponse.roles || ['USER'],
          preferences: profileResponse.preferences || [],
          followedTechnologies: profileResponse.followedTechnologies || [],
          emailVerified: user.emailVerified,
          isOnboarded: profileResponse.isOnboarded,
        })
      );

      return true;
    } catch (error: any) {
      console.error('[ProfileBootstrapService] Failed to bootstrap user profile:', error);
      const errMsg = error?.data?.message || error?.message || 'Server profile synchronization failed';
      store.dispatch(setProfileFailure(errMsg));
      return false;
    }
  },
};
