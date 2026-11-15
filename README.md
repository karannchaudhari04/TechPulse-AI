<div align="center">
  <h1>TechPulse AI</h1>
  <p><b>AI-powered Technology Intelligence Platform for Developers.</b></p>
  <p><i>An autonomous multi-agent platform that continuously monitors, discovers, cleans, deduplicates, and ranks technology updates to deliver high-quality personalized technology intelligence.</i></p>

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)](#)
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

1. **Discovery Agent**: Concurrently crawls and ingests technology updates across active RSS sources, sanitizes HTML via BeautifulSoup, normalizes URLs (removing tracking parameters), and executes layered deduplication using Jaro-Winkler title similarity and SHA-256 content hashing.
2. **AI Synthesis Agent**: Processes unique updates via the Gemini OpenAI-compatible API to produce structured JSON intelligence—generating technical/developer/enterprise impact analyses, version extractions, official taxonomy categorization, and credibility/importance evaluations.
3. **Personalization Services**: Tracks interaction signals (likes, bookmarks, shares, reading completion), updates category and topic interest weights, and exposes bookmark/read state, reading history, and trend personalization to the clients.
4. **AI Assistant & Intelligence Services**: Powers on-demand conversational Q&A, technology comparisons, and technical briefs via Gemini, while public intelligence reads remain stable until backed by persisted data.

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Mobile Client** | React Native (Expo), TypeScript, FlashList, Reanimated, React Query, NativeWind (Tailwind) |
| **Backend API** | Python 3.12+, Django 6, Django REST Framework, Celery, feedparser, BeautifulSoup |
| **Database & Cache** | TiDB (MySQL Dialect), Redis |
| **DevOps & Cloud** | Docker, Gunicorn, Celery Beat, Render (PaaS) |

---

## 🏗️ Production Highlights

- **Horizontal Scaling & High Availability**: Stateless Gunicorn web containers behind a load balancer, with Firebase ID-token authentication.
- **TiDB Read/Write Splitting**: Django database router sends read queries to a TiDB replica when `DATABASE_REPLICA_URL` is configured.
- **Fail-Safe Caching**: Redis caching via `django-redis` with local-memory fallback when Redis is unavailable.
- **Scheduled Ingestion**: ingestion runs every 4 hours in-process (matching the Java `@Scheduled` job and working without a worker), with pruning at midnight and the daily digest at 09:00. Celery Beat can take over on paid hosts.
- **Mobile Optimization**: Zero-latency scrolling using Shopify's `FlashList` and local async persistence.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) & Python 3.12+
- Docker Desktop (recommended for backend, Redis, and Celery)
- Firebase Project & Google Gemini API Key

### 1. Run Backend Locally (Docker)
```bash
cd backend
cp .env.example .env
# Fill in TiDB, Redis, Firebase, and Gemini values, then:
docker compose up -d
curl http://localhost:8080/actuator/health
```

The web container runs `migrate --fake-initial` and `collectstatic` on boot. Separate `worker` and `beat` containers run Celery.

### 1a. Run Backend Without Docker
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows; use source .venv/bin/activate elsewhere
pip install -r requirements.txt
python manage.py migrate --fake-initial
python manage.py runserver 0.0.0.0:8080
```

Run `celery -A config worker --loglevel=info` and `celery -A config beat --loglevel=info` in separate shells for scheduled ingestion.

### 2. Run Mobile App
```bash
cd mobile
npm install
npx expo start
```

### 3. Run Web App
```bash
cd web
# Copy .env.example to .env.local and configure the API URL and Firebase Web app values
npm install
npm run dev
```

The web app uses the same Django API and Firebase project as mobile, so accounts, preferences, and bookmarks are shared. See [web/README.md](web/README.md) for setup and deployment details.
