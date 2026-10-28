# TechPulse AI Web

Responsive Next.js web client for the TechPulse AI Spring Boot API. The site supports public feed browsing, category filtering, search, update details, Firebase email sign-in, synced preferences, and bookmarks.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL` to the backend API base, such as `http://localhost:8080/api/v1`.
3. Add the Firebase Web app configuration from the same Firebase project used by the mobile app. Enable Google as a sign-in provider in Firebase Authentication and add the website's hostname to Firebase's authorized domains.
4. Install packages and run `npm run dev` from this directory.

The Firebase web config is public client configuration. Google sign-in uses Firebase's configured Google provider, so the mobile Google SDK's `GOOGLE_WEB_CLIENT_ID` is not required by this popup-based web flow. Never put Firebase Admin credentials or private service keys in `NEXT_PUBLIC_*` variables.

## Deployment

Deploy this directory as a Node web service and set the same environment variables in the hosting provider. Set the backend's `WEB_APP_ORIGIN` environment variable to the deployed website origin so Spring Security allows browser API requests. The backend CORS configuration also permits localhost development and the API's timezone/correlation headers.
