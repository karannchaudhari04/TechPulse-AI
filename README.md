<div align="center">
  <h1>TechBite</h1>
  <p><b>Master High-Yield Tech News in 2 Minutes a Day.</b></p>
  <p><i>A mobile-first, AI-powered short news app designed for Computer Science students and software engineers.</i></p>

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Spring Boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)](#)
  [![TiDB](https://img.shields.io/badge/TiDB-FFFFFF?style=for-the-badge&logo=tidb&logoColor=blue)](#)
  [![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)](#)
  [![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](#)
</div>

---

## 📖 Overview

**TechBite** solves the "information overload" problem for tech professionals and students. Instead of scrolling through endless articles, TechBite automatically scrapes top tech blogs, uses **Google Gemini AI** to summarize them into 80-150 word "bites", and delivers them in a highly addictive, frictionless vertical scrolable feed.

Engineered as a **production-ready distributed system**, TechBite is capable of high-concurrency traffic through horizontal scaling, database read/write splitting, and aggressive caching.

---

## ✨ Features

- **⚡ 60 FPS Vertical Feed**: Hyper-optimized native scrolling using Shopify's `FlashList` and Reanimated.
- **🤖 AI-Powered Summaries**: Automated background ingestion pipeline utilizing Gemini AI to extract key insights.
- **🧠 Personalized "For You"**: Tailored content delivery based on user-selected interests (DSA, AI, Web Dev, etc.).
- **🔥 Daily Streaks & Gamification**: Push notifications and streak tracking to build consistent learning habits.
- **🔖 Bookmarks**: Save crucial interview prep tips.
- **🔐 Secure Stateless Auth**: Seamless Google Sign-In backed by Firebase Admin SDK and stateless JWT verification.

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Mobile Client** | React Native (Expo), TypeScript, FlashList, Reanimated, React Query, NativeWind (Tailwind) |
| **Backend API** | Java 17, Spring Boot 3.2, Spring Security, Spring AI, Rome (RSS), Bucket4j |
| **Database & Cache** | TiDB (MySQL Dialect), Redis |
| **DevOps & Cloud** | Docker, Nginx (Load Balancer), Render (PaaS), EAS (Expo Application Services) |

---

## 🏗️ Architecture & Production Highlights

This project moves beyond standard CRUD apps by implementing **Enterprise-grade distributed patterns**:

### 1. Horizontal Scaling & High Availability (AP-Mode)
- The backend is fully **stateless**. Session state is managed via JWTs, allowing an **Nginx Load Balancer** to distribute traffic via Round-Robin across multiple Spring Boot instances.
- **TiDB Read/Write Splitting**: Implemented custom `AbstractRoutingDataSource` and Spring AOP to route heavy feed queries to TiDB Read Replicas (`tidb_replica_read = 'leader-and-follower'`), prioritizing system availability over strict consistency (CAP Theorem AP-Mode).

### 2. The AI Ingestion Pipeline
- A scheduled Spring Boot cron job reads RSS feeds via **Rome**.
- Raw HTML is sanitized using **JSoup** to prevent prompt injection.
- Clean text is sent to **Google Gemini** via `spring-ai`, prompting it to return structured JSON containing a concise summary and category classification.

### 3. Fail-Safe Caching Strategy
- The primary feed is aggressively cached in **Redis**. 
- Implemented a custom `CacheErrorHandler` ensuring that if the Redis node goes down, the application gracefully falls back to database reads instead of throwing 500 Internal Server Errors.

### 4. Extreme Mobile Optimization
- **Sub-30MB APK**: Achieved by enabling Android ABI Splitting in Gradle and utilizing Hermes engine.
- **Instant TTI (Time to Interactive)**: UI rendering is decoupled from network requests using React Query with local Async Storage persistence. 

---

## 📸 Screenshots

<div align="center">
  <!-- Note: Update image paths with actual deployed screenshots later -->
  <img src="https://via.placeholder.com/250x500.png?text=Feed+Screen" width="22%" />
  <img src="https://via.placeholder.com/250x500.png?text=Personalization" width="22%" />
  <img src="https://via.placeholder.com/250x500.png?text=Bookmarks" width="22%" />
  <img src="https://via.placeholder.com/250x500.png?text=Profile" width="22%" />
</div>

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) & Java (JDK 17)
- Docker Desktop
- Firebase Project & Google Gemini API Key

### 1. Run Backend Locally (Docker)
The backend is fully containerized for a zero-config setup.
```bash
cd backend
# Rename .env.example to .env and add your Gemini & Firebase keys
docker compose up -d
```
*This starts MySQL (TiDB local), Redis, 3 Spring Boot instances, and the Nginx Load Balancer on `localhost:8080`.*

### 2. Run Mobile App
```bash
cd mobile
npm install
npx expo start
```
*Use the Expo Go app or an Android Emulator to view the app.*

---

## 🎯 Resume & Interview Talking Points

If you are a recruiter reviewing this project, here are the key engineering challenges solved:

* **Distributed Systems**: Architected a horizontally scaled, stateless Spring Boot backend using Nginx load balancing and JWT authentication, supporting high-concurrency mobile traffic.
* **Database Optimization**: Engineered a custom Database Routing layer using Spring AOP to split Read/Write traffic, leveraging TiDB Follower Reads to achieve CAP Theorem AP-mode availability.
* **Mobile Performance**: Optimized React Native performance by implementing ABI Splitting, Hermes engine, and FlashList, reducing final APK size by 75% and achieving 60fps scrolling.
* **Automated AI Pipeline**: Designed an automated data pipeline using Rome RSS and Google Gemini AI to scrape, summarize, and categorize high-yield tech news, aggressively cached via Redis.
* **Viral Acquisition**: Built a seamless viral acquisition loop utilizing deep linking, Server-Side Rendered (Thymeleaf) dynamic landing pages, and Expo Push Notifications.

---

## 🗺️ Future Roadmap

- [ ] **iOS Native Build**: Configure EAS for App Store release.
- [ ] **Web Dashboard**: Next.js admin panel for manual bite curation.
- [ ] **Audio Bites**: Integration with Text-to-Speech APIs for podcast-style listening.
- [ ] **Offline Mode**: Comprehensive SQLite sync for reading without an internet connection.

---

<div align="center">
  <i>Made with ❤️ by developers, for developers.</i>
</div>
