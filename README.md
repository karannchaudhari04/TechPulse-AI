# TechBite 🚀

**Bite-sized tech news & placement insights for CS students and freshers**

A high-performance mobile app that delivers personalized, AI-summarized tech content in a smooth vertical swipeable feed.

![TechBite](https://via.placeholder.com/1200x400/6366F1/white?text=TechBite+Mobile+App)

## ✨ Key Features

- **Ultra-smooth Reels-style feed** powered by Shopify FlashList (60 FPS)
- **Personalized "For You" feed** based on selected interests
- **AI-powered summaries** using Google Gemini with career/placement focus
- **"Explain Simply"** — Tap any bite for deeper AI explanation
- **Bookmarks** with offline support
- **Google Sign-In + Guest Mode** with clean onboarding
- **Dark Mode** with modern glassmorphic design

## 🏗️ Architecture

### Backend
- Spring Boot 3.2 + Java 21
- Horizontal scaling (3+ instances behind Nginx)
- Read/Write splitting with TiDB (Primary + Replica routing)
- Redis caching layer
- Automated RSS ingestion + Gemini AI pipeline
- Bucket4j rate limiting

### Mobile
- React Native + Expo (New Architecture)
- FlashList + Reanimated + TanStack Query
- Offline-first with AsyncStorage persistence

## 🛠 Tech Stack

| Layer         | Technologies                              |
|---------------|-------------------------------------------|
| Mobile        | React Native, Expo 55, FlashList, TanStack Query, NativeWind |
| Backend       | Spring Boot 3.2, Spring AI (Gemini), JPA  |
| Database      | TiDB Cloud (MySQL compatible)             |
| Cache         | Redis                                     |
| DevOps        | Docker, Docker Compose, Nginx             |

## 🚀 Quick Start

```bash
# Backend (Scaled)
docker compose down && docker compose up -d --scale backend=3

# Mobile
cd mobile
npm install
npx expo start

```


📈 Production Architecture

Multi-instance backend with load balancing
Database read/write separation
Resilient AI fallback system
Containerized and ready for Render / Railway

📝 What I Learned

Designed distributed systems patterns (horizontal scaling, read replicas, caching)
Built a complete end-to-end Generative AI content pipeline
Optimized mobile performance for real-world mid-range devices
