## TechBite: AI-Powered Micro-Learning Platform

TechBite is a mobile-first, high-performance news digest app built specifically for Computer Science students and software engineers. It solves the "information overload" problem by autonomously curating, summarizing, and classifying top industry news into bite-sized, high-signal technical insights.

### 🚀 Technical Highlights
- **Automated AI Ingestion Engine:** A Spring Boot backend continuously fetches feeds via Rome RSS, cleans HTML payloads using JSoup, and summarizes technical articles down to 3 concise bullet points using a highly resilient, multi-model Google Gemini integration.
- **High-Performance Infinite Feed:** Built with React Native and `@shopify/flash-list`, providing a smooth, TikTok-style vertical scrolling experience that renders complex UI cards efficiently.
- **Enterprise-Grade Backend Architecture:** Features composite cursor-based pagination for limitless scalability, Bucket4j-based dynamic rate limiting, and Firebase JWT stateless authentication.
- **Offline-First Resilience:** Integrates TanStack React Query with AsyncStorage to cache data on the device, ensuring the feed and user bookmarks remain fully accessible without internet connectivity.
