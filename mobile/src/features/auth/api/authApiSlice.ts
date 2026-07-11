import { apiSlice } from '../../../api/apiSlice';

export interface RegisterOrLoginPayload {
  email: string;
  displayName: string;
  photoUrl: string;
}

export interface RegisterOrLoginResponse {
  hasPreferences: boolean;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  roles: string[];
}

/**
 * Purpose: Authentication API client endpoints.
 * Interacts with Spring Boot backend register-or-login authentication handshakes.
 */
export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    registerOrLogin: builder.mutation<RegisterOrLoginResponse, RegisterOrLoginPayload>({
      query: (payload) => ({
        url: '/users/register-or-login',
        method: 'POST',
        data: payload,
      }),
    }),
  }),
});

export const { useRegisterOrLoginMutation } = authApiSlice;
