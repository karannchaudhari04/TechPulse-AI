import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: UserProfile | null;
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
}

const initialState: AuthState = {
  user: null,
  sessionStatus: 'loading',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.sessionStatus = 'authenticated';
    },
    clearCredentials: (state) => {
      state.user = null;
      state.sessionStatus = 'unauthenticated';
    },
    setSessionLoading: (state) => {
      state.sessionStatus = 'loading';
    },
  },
});

export const { setCredentials, clearCredentials, setSessionLoading } = authSlice.actions;
export default authSlice.reducer;
