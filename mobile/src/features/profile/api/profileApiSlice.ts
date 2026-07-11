import { apiSlice } from '../../../api/apiSlice';

export interface UserProfileResponse {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  roles: string[];
  preferences: string[];
  followedTechnologies: string[];
  isOnboarded: boolean;
}

export interface UpdateProfilePayload {
  displayName?: string;
  photoUrl?: string;
}

export interface SavePreferencesPayload {
  categories: string[];
}

/**
 * Purpose: Profile, settings, and user preferences API client endpoints.
 */
export const profileApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<UserProfileResponse, void>({
      query: () => ({
        url: '/users/profile',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<UserProfileResponse, UpdateProfilePayload>({
      query: (payload) => ({
        url: '/users/profile',
        method: 'PUT',
        data: payload,
      }),
      invalidatesTags: ['User'],
    }),
    savePreferences: builder.mutation<void, SavePreferencesPayload>({
      query: (payload) => ({
        url: '/users/preferences',
        method: 'POST',
        data: payload,
      }),
      invalidatesTags: ['User'],
    }),
    deleteAccount: builder.mutation<void, void>({
      query: () => ({
        url: '/users/profile',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
  useSavePreferencesMutation,
  useDeleteAccountMutation,
} = profileApiSlice;
