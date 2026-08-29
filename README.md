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

The platform is powered by a high-throughput autonomous multi-agent pipeline and on-demand conversational intelligence:

1. **Discovery Agent**: Concurrently crawls and ingests technology updates across active RSS sources, sanitizes HTML via JSoup, normalizes URLs (removing tracking parameters), and executes layered deduplication using Jaro-Winkler title similarity and SHA-256 content hashing.
2. **AI Synthesis Agent**: Processes unique updates via Google Gemini / Spring AI to produce structured JSON intelligence—generating technical/developer/enterprise impact analyses, version extractions, official taxonomy categorization, and credibility/importance evaluations.
3. **Personalization Agent**: Tracks granular user interaction signals (likes, bookmarks, shares, read durations), models category and entity interest weights with temporal decay, and performs deterministic multi-factor feed ranking.
4. **AI Assistant & Intelligence Services**: Powers on-demand conversational Q&A, deep-dive technology comparisons, and technical briefs via Gemini with contextual citations.

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
