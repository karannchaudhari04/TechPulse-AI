import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WorkspaceState {
  pinnedTechnologies: string[];
  pinnedCompanies: string[];
  readingQueue: string[];
}

const initialState: WorkspaceState = {
  pinnedTechnologies: [],
  pinnedCompanies: [],
  readingQueue: [],
};

/**
 * Purpose: Redux slice managing pinned items inside personal Developer Workspace.
 */
export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    pinTechnology: (state, action: PayloadAction<string>) => {
      if (!state.pinnedTechnologies.includes(action.payload)) {
        state.pinnedTechnologies.push(action.payload);
      }
    },
    unpinTechnology: (state, action: PayloadAction<string>) => {
      state.pinnedTechnologies = state.pinnedTechnologies.filter(id => id !== action.payload);
    },
    pinCompany: (state, action: PayloadAction<string>) => {
      if (!state.pinnedCompanies.includes(action.payload)) {
        state.pinnedCompanies.push(action.payload);
      }
    },
    unpinCompany: (state, action: PayloadAction<string>) => {
      state.pinnedCompanies = state.pinnedCompanies.filter(id => id !== action.payload);
    },
    addToReadingQueue: (state, action: PayloadAction<string>) => {
      if (!state.readingQueue.includes(action.payload)) {
        state.readingQueue.push(action.payload);
      }
    },
    removeFromReadingQueue: (state, action: PayloadAction<string>) => {
      state.readingQueue = state.readingQueue.filter(id => id !== action.payload);
    },
  },
});

export const {
  pinTechnology,
  unpinTechnology,
  pinCompany,
  unpinCompany,
  addToReadingQueue,
  removeFromReadingQueue,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
