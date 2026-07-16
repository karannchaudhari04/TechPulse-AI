# Technical Debt: Phase 2 - Frontend Design System

This log documents code areas requiring eventual cleanup, deprecation, or refactoring in future phases.

---

## 1. Legacy Theme Forwarder (`src/utils/theme.ts`)
- **Description**: We created a compatibility adapter in `src/utils/theme.ts` to map old theme hook calls (`isAmoled`, colors mapping) to the new Redux-integrated `useTheme()` hook in `src/theme/`.
- **Debt Impact**: Low. Legacy screens continue functioning correctly without code changes.
- **Remediation**: Once all screens have been fully refactored, all imports should point directly to the centralized `src/theme` index, and `src/utils/theme.ts` should be permanently removed.

---

## 2. Coexistence of Styled Primitives and UI Components
- **Description**: We introduced custom reusable components (`Button`, `Input`, `Card`, etc.) in `src/components/common/`. However, existing screens still use direct React Native primitives with inline style calculations (e.g., custom padding, hardcoded colors/widths).
- **Debt Impact**: Medium. Changes to global colors might not instantly propagate to screens that don't use design system components yet.
- **Remediation**: During upcoming feature phases (Phase 4: Home Feed, Phase 5: Event Details, etc.), incrementally swap these primitive elements for their Design System wrapper components.

---

## 3. Legacy Welcome & Onboarding Screens (`src/screens/`)
- **Description**: The screens `WelcomeScreen.tsx`, `OnboardingIntroScreen.tsx`, and `InterestsSelectionScreen.tsx` are still present in `src/screens/` but are no longer used by the new `RootNavigator` (which uses `LoginScreen.tsx` and `CompleteProfileScreen.tsx` instead).
- **Debt Impact**: Low (dead code).
- **Remediation**: Safely delete these three files in a later cleanup pass.

---

## 4. Legacy Fetch Client / User API (`src/api/user.ts`)
- **Description**: We created `authApiSlice.ts` and `profileApiSlice.ts` using RTK Query, but existing legacy screens still call the old axios/fetch client via `userApi`.
- **Debt Impact**: Medium (dual query libraries).
- **Remediation**: During screen migration phases, convert all data queries to the new RTK Query hooks (`useGetProfileQuery`, etc.) and delete `src/api/user.ts` and `src/api/client.ts` completely.

---

## 5. Legacy Detail Screen & Hooks (`src/screens/BiteDetailScreen.tsx`)
- **Description**: We built the premium `EventDetailScreen.tsx` and updated AppNavigator routes, but left the legacy `BiteDetailScreen.tsx` and legacy hook `useBites.ts` active for backward compatibility with other unmigrated screens (e.g. BookmarksScreen).
- **Debt Impact**: Low.
- **Remediation**: Once all secondary screens are migrated to the new features, delete `BiteDetailScreen.tsx` and `useBites.ts`.

---

## 6. Voice Search UI-Only Placeholders (`src/features/search/components/SearchBar.tsx`)
- **Description**: The voice search microphone button has been added to the search bar for visual layout completeness but only prints mock console logs.
- **Debt Impact**: Low (non-blocking).
- **Remediation**: In a future dedicated AI features phase, integrate a speech recognition library (e.g., `expo-speech` or `react-native-voice`) to trigger audio search queries.

---

## 7. Legacy Bookmarks Hook Coexistence (`src/hooks/useBookmarks.ts`)
- **Description**: While the main `BookmarksScreen.tsx` has been migrated to use `personalizationApiSlice` query hooks, the legacy `useBookmarks.ts` hook remains active for compatibility with unmigrated screens.
- **Debt Impact**: Medium. Changes to backend bookmark models might require dual maintenance.
- **Remediation**: Once all secondary screens are migrated to the new slice, permanently delete `src/hooks/useBookmarks.ts`.

---

## 8. Adaptive Notifications Polling Fallback (`src/features/notifications/services/NotificationSyncService.ts`)
- **Description**: We implemented a client-driven 30-second polling sync service to fetch unread counters and lists to avoid free-tier Render server SSE disconnection issues.
- **Debt Impact**: Low. It introduces extra client-to-server traffic while the app is active.
- **Remediation**: Once the backend moves to production infrastructure (AWS/Kubernetes) supporting persistent sockets, replace the polling loop with real-time SSE or WebSocket listeners.

---

## 9. Conversation Streaming Mock (`src/features/assistant/screens/AssistantScreen.tsx`)
- **Description**: While `assistantApiSlice` is configured to map ChatMessage status streams, the current backend interface and offline fallback mocks return responses as a single block.
- **Debt Impact**: Low. The UI is fully equipped to parse streaming states when available.
- **Remediation**: In a future conversational tuning sprint, implement real-time SSE adapters in the sync manager to update message states incrementally.

---

## 10. Legacy Clipboard Usage (`src/features/assistant/components/CodeBlock.tsx`)
- **Description**: We imported `Clipboard` from `react-native` inside `CodeBlock.tsx` and `ChatBubble.tsx` to avoid installing new dependencies.
- **Debt Impact**: Low. The API is deprecated in newer React Native versions but fully operational.
- **Remediation**: Replace with `@react-native-clipboard/clipboard` or `expo-clipboard` during the next major Expo package upgrade pass.

---

## 11. Infrastructure telemetry placeholders & storage estimation limits
- **Description**: Sentry and Firebase SDK providers are modeled as console log stubs in dev environments, and AsyncStorage sizing values are approximated since synchronous file sizing operations are blocked by native platform visibility APIs.
- **Debt Impact**: Low. The abstract wrapper interfaces isolate these details cleanly.
- **Remediation**: Replace the Console placeholders with Sentry/Firebase SDK configurations once production credentials and certificates are generated.
