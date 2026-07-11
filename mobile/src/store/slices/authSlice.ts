import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserAuth {
  uid: string;
  email: string | null;
}

export type SessionStatus = 'idle' | 'checking' | 'authenticated' | 'unauthenticated' | 'expired';

export interface AuthState {
  user: UserAuth | null;
  sessionStatus: SessionStatus;
}

const initialState: AuthState = {
  user: null,
  sessionStatus: 'idle',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated: (state, action: PayloadAction<UserAuth>) => {
      state.user = action.payload;
      state.sessionStatus = 'authenticated';
    },
    setUnauthenticated: (state) => {
      state.user = null;
      state.sessionStatus = 'unauthenticated';
    },
    setChecking: (state) => {
      state.sessionStatus = 'checking';
    },
    setSessionExpired: (state) => {
      state.user = null;
      state.sessionStatus = 'expired';
    },
    resetAuth: () => initialState,
  },
});

export const { 
  setAuthenticated, 
  setUnauthenticated, 
  setChecking, 
  setSessionExpired,
  resetAuth 
} = authSlice.actions;

export default authSlice.reducer;
