import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PreferencesState {
  isOnboardingCompleted: boolean;
  selectedCategories: string[];
}

const initialState: PreferencesState = {
  isOnboardingCompleted: false,
  selectedCategories: [],
};

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setOnboardingCompleted: (state, action: PayloadAction<boolean>) => {
      state.isOnboardingCompleted = action.payload;
    },
    setSelectedCategories: (state, action: PayloadAction<string[]>) => {
      state.selectedCategories = action.payload;
    },
    resetPreferences: () => initialState,
  },
});

export const { setOnboardingCompleted, setSelectedCategories, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
