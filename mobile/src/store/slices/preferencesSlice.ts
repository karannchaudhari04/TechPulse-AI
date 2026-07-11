import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  isAmoled: boolean;
  isOnboardingCompleted: boolean;
  selectedCategories: string[];
}

const initialState: PreferencesState = {
  theme: 'system',
  isAmoled: false,
  isOnboardingCompleted: false,
  selectedCategories: [],
};

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setAmoled: (state, action: PayloadAction<boolean>) => {
      state.isAmoled = action.payload;
    },
    setOnboardingCompleted: (state, action: PayloadAction<boolean>) => {
      state.isOnboardingCompleted = action.payload;
    },
    setSelectedCategories: (state, action: PayloadAction<string[]>) => {
      state.selectedCategories = action.payload;
    },
    resetPreferences: () => initialState,
  },
});

export const { setTheme, setAmoled, setOnboardingCompleted, setSelectedCategories, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
