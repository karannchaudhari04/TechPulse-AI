<div align="center">
  <h1>TechPulse AI</h1>
  <p><b>AI-powered Technology Intelligence Platform for Developers.</b></p>
  <p><i>An autonomous multi-agent platform that continuously monitors, discovers, cleans, deduplicates, and ranks technology updates to deliver high-quality personalized technology intelligence.</i></p>

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Spring Boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)](#)
  [![TiDB](https://img.shields.io/badge/TiDB-FFFFFF?style=for-the-badge&logo=tidb&logoColor=blue)](#)
  [![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)](#)
  [![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](#)
</div>

---

## 📖 Overview

**TechPulse AI** solves the "information overload" and fragmentation problem for developers, software engineers, and tech enthusiasts. Instead of checking dozens of official company blogs, GitHub releases, Reddit, Hacker News, and research papers, TechPulse AI continuously and autonomously aggregates, validates, deduplicates, and summarizes the technology ecosystem in real time.

Engineered as a **production-ready distributed system**, TechPulse AI is capable of high-concurrency traffic through horizontal scaling, database read/write splitting, and aggressive caching.

---

## 🏗️ Multi-Agent Architecture

The platform uses a pipeline of specialized, modular agent components:

1. **Discovery Agent**: Aggregates technology updates from RSS feeds and online sources.
2. **Content Cleaning Agent**: Sanitizes and normalizes raw content using JSoup.
3. **Classification Agent**: Categorizes updates deterministically into core domains (AI, Web Dev, Mobile, Cloud, Security, etc.).
4. **Duplicate Detection Agent**: Filters out overlapping stories using Jaro-Winkler title similarity and URL normalization.
5. **Credibility Judge Agent**: Assesses source trustworthiness using a rule-based tier list.
6. **Importance Ranking Agent**: Calculates significance scores taking source tiers, duplicate counts, and time decay into account.
7. **Summarization Agent**: Uses Google Gemini to generate clean, high-yield summaries.
8. **Explain Agent**: Generates beginner-friendly explanations on demand.
9. **Recommendation Agent**: Personalizes user feeds based on category preferences and reading history.

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Mobile Client** | React Native (Expo), TypeScript, FlashList, Reanimated, React Query, NativeWind (Tailwind) |
| **Backend API** | Java 17, Spring Boot 3.2, Spring Security, Spring AI, Rome (RSS), Bucket4j |
| **Database & Cache** | TiDB (MySQL Dialect), Redis |
| **DevOps & Cloud** | Docker, Nginx (Load Balancer), Render (PaaS) |

---

## 🏗️ Production Highlights

- **Horizontal Scaling & High Availability**: Fully stateless backend API instances distributed by an Nginx Load Balancer using JWT security.
- **TiDB Read/Write Splitting**: Custom `AbstractRoutingDataSource` and Spring AOP to route heavy feed queries to TiDB replicas.
- **Fail-Safe Caching**: Aggressive Redis caching with fallback handlers to read directly from database if cache node fails.
- **Mobile Optimization**: Zero-latency scrolling using Shopify's `FlashList` and local async persistence.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) & Java (JDK 17)
- Docker Desktop
- Firebase Project & Google Gemini API Key

### 1. Run Backend Locally (Docker)
```bash
cd backend
# Setup .env from .env.example
docker compose up -d
```

### 2. Run Mobile App
```bash
cd mobile
npm install
npx expo start
```
