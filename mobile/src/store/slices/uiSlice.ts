import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  isGlobalLoading: boolean;
  networkErrorBannerVisible: boolean;
  activeErrorMsg: string | null;
}

const initialState: UIState = {
  isGlobalLoading: false,
  networkErrorBannerVisible: false,
  activeErrorMsg: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isGlobalLoading = action.payload;
    },
    setNetworkErrorBannerVisible: (state, action: PayloadAction<boolean>) => {
      state.networkErrorBannerVisible = action.payload;
    },
    showErrorBanner: (state, action: PayloadAction<string>) => {
      state.activeErrorMsg = action.payload;
    },
    clearErrorBanner: (state) => {
      state.activeErrorMsg = null;
    },
  },
});

export const { setGlobalLoading, setNetworkErrorBannerVisible, showErrorBanner, clearErrorBanner } = uiSlice.actions;
export default uiSlice.reducer;
