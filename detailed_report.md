# TechPulse AI Project State & Progress Report
**Date:** November 14, 2026

## 🚀 1. Project Overview
**TechPulse AI** is a full-stack, AI-powered tech news platform designed to deliver a high-performance mobile reading experience. The project is divided into a **React Native (Expo)** client and a **Django 6** backend.

The backend migration from the legacy Java implementation is complete. The Django API preserves the existing client contracts, TiDB schema, authentication model, and deployment URL while replacing the runtime, ORM, scheduling, and ingestion pipeline.

---

## 📱 2. Frontend Status (React Native / Expo)
The mobile app focuses on delivering a zero-latency, highly immersive user experience.

### 2.1 Technologies in Use
- **Core:** React Native (v0.76.9), Expo (v52.0.49)
- **Navigation:** `@react-navigation/native-stack` (v7)
- **Data Fetching:** `@tanstack/react-query`
- **Performance lists:** `@shopify/flash-list`
- **Authentication:** Firebase Auth (`firebase` v11.0.2), Google Sign-In (`@react-native-google-signin/google-signin`)
- **Styling:** React Native `StyleSheet`
- **Media:** `expo-image` for caching and cross-device reliability

### 2.2 Key Features Implemented
- ✅ **Wireless "Reels" Experience:** Vertical pagination using `FlashList` with calculated `snapToInterval`.
- ✅ **Absolute Isolation:** Screen-height-aware cards keep one news item in focus per swipe.
- ✅ **Guest vs. Member Flows:** Guests can read; authenticated users see profile, bookmarks, history, and preferences.
- ✅ **Profile & Logout:** Firebase logout resets navigation state cleanly.
- ✅ **Error and Empty States:** Retry actions when the backend is unreachable and empty-state screens when the feed is exhausted.

---

## ⚙️ 3. Backend Status (Django 6)

The backend is the centralized API, database manager, ingestion engine, and AI proxy.

### 3.1 Technologies in Use
- **Core:** Python 3.12+, Django 6, Django REST Framework
- **API compatibility:** camelCase JSON rendering, `{ success, message, data, timestamp, traceId }` envelope, legacy datetime formatting
- **Database:** TiDB via MySQL/MariaDB backend, writer/replica routing
- **Cache and scheduling:** Redis, Celery Beat (static schedule in `config/celery.py`)
- **Authentication:** Firebase Admin SDK, `Authorization: Bearer <Firebase ID token>`
- **AI engine:** Gemini via the OpenAI-compatible chat-completions endpoint
- **Deployment:** Gunicorn, Docker, Render Blueprint

### 3.2 Key Features Implemented
- ✅ **Schema-compatible models:** Django models map to the existing TiDB tables through `Meta.db_table` and legacy column names.
- ✅ **Feature-complete API:** accounts, feed, trends, search, events, library, notifications, assistant, intelligence, and admin ingestion endpoints.
- ✅ **Async ingestion pipeline:** RSS collection, 24-hour relevance filtering, HTML cleanup, URL normalization, exact and near-duplicate detection, quality ranking, Gemini synthesis, and pruning.
- ✅ **Scheduled jobs:** in-process ingestion every 8 hours, pruning at midnight, and a daily Expo push digest at 09:00 (Celery Beat can take over on paid hosts).
- ✅ **Contract tests:** 44 pytest tests (18 contract tests, a TiDB schema-compatibility check, twenty ingestion-scheduling/health tests, and five reference-data tests) cover the API envelope, camelCase fields, auth/admin rules, paging, assistant, notifications, library, and admin endpoints.

---

## 🔒 4. Security & Networking
- **Google Auth:** Firebase ID tokens are verified server-side with Firebase Admin SDK.
- **Authorization:** Middleware enforces public, authenticated, and ADMIN path rules; admin endpoints require the `ADMIN` role.
- **Rate limiting:** Per-user and per-IP limits, with stricter limits for AI endpoints.
- **CORS:** Restricted to the configured web origin, localhost, and `192.168.1.*` origins.
- **Secrets:** Firebase service-account JSON, Gemini keys, database credentials, and `.env` files stay outside version control.
- **Production settings:** Secure cookies, HTTPS proxy handling, CSRF, and clickjacking middleware are enabled.

---

## 🗺️ 5. Outstanding Technical Debt & Next Steps
1. **Deduplication scale:** partition `raw_ingestion` by `fetched_at` and reduce the quadratic near-duplicate comparison.
2. **Schema verification:** add a drift check before relying on `migrate --fake-initial` in a new environment.
3. **Worker deployment:** Render free instances cannot run Celery background workers; deploy worker/beat on a paid instance or external scheduler.
4. **AI monitoring:** track Gemini latency, quota cooldowns, fallback usage, and synthesis failures.
5. **Ingestion tests:** add unit tests for URL normalization, eligibility, Jaro-Winkler, ranking, and synthesis failure handling.
6. **Placeholder intelligence data:** back graph, technology, company, release, timeline, and compare responses with persisted data.
7. **App store packaging:** produce production Android artifacts with EAS Build when ready.

---

**Verdict:** The Django backend is deployed and contract-compatible with the existing clients. The next phase is operational hardening: schema verification, ingestion testing, worker deployment, and real load measurement.
