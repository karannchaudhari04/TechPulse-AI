import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import preferencesReducer from './slices/preferencesSlice';
import uiReducer from './slices/uiSlice';
import conversationReducer from '../features/assistant/store/conversationSlice';
import workspaceReducer from '../features/intelligence/store/workspaceSlice';
import { apiSlice } from '../api/apiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  preferences: preferencesReducer,
  ui: uiReducer,
  conversation: conversationReducer,
  workspace: workspaceReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['preferences', 'profile', 'workspace'], // Persist non-sensitive settings, profiles, and workspace pins
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
