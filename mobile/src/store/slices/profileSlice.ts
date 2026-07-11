import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfileDetails {
  displayName: string | null;
  photoURL: string | null;
  roles: string[];
  preferences: string[];
  followedTechnologies: string[];
  emailVerified: boolean;
  isOnboarded: boolean;
}

export interface ProfileState {
  profile: UserProfileDetails | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
};

export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    setProfileSuccess: (state, action: PayloadAction<UserProfileDetails>) => {
      state.profile = action.payload;
      state.loading = false;
    },
    setProfileFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateProfileDetails: (state, action: PayloadAction<Partial<UserProfileDetails>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    clearProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
    },
    resetProfile: () => initialState,
  },
});

export const {
  setProfileStart,
  setProfileSuccess,
  setProfileFailure,
  updateProfileDetails,
  clearProfile,
  resetProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
