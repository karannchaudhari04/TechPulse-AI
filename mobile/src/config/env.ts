/**
 * Centralized Environment Configuration
 *
 * Single source of truth for all environment variables across the mobile application.
 * All API URLs and service keys are configured exclusively in the .env file.
 */

export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

if (!API_URL) {
  console.warn(
    '[ENV] Warning: EXPO_PUBLIC_API_URL is not defined in your .env file! ' +
    'Please set EXPO_PUBLIC_API_URL in mobile/.env'
  );
}

export const ENV = {
  API_URL,
  FIREBASE: {
    API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  },
  GOOGLE: {
    WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  },
} as const;

export default ENV;
