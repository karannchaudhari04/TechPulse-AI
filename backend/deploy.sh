#!/bin/bash
# ============================================================
# deploy.sh — Oracle Cloud VM One-Time Setup + Deploy Script
#
# Run this on your Oracle Cloud Ubuntu 22.04 VM:
#   chmod +x deploy.sh && ./deploy.sh
#
# What it does:
#   1. Installs Docker + Docker Compose
#   2. Opens firewall port 8080
#   3. Copies your .env.production as .env
#   4. Builds and starts the app
# ============================================================

set -e  # Exit on any error

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  TechPulse AI Oracle Cloud Deployment║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Update system ─────────────────────────────────────
echo "▶ Updating system packages..."
sudo apt-get update -q
sudo apt-get upgrade -y -q

# ── Step 2: Install Docker ────────────────────────────────────
echo "▶ Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed: $(docker --version)"
fi

# ── Step 3: Install Docker Compose plugin ─────────────────────
echo "▶ Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    sudo apt-get install -y docker-compose-plugin
fi
echo "✅ Docker Compose: $(docker compose version)"

# ── Step 4: Open firewall ports (Oracle Cloud uses iptables) ──
echo "▶ Opening port 8080 in iptables..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save
echo "✅ Port 8080 open"

# ── Step 5: Check .env file ───────────────────────────────────
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
        echo "✅ Copied .env.production → .env"
    else
        echo "❌ ERROR: No .env file found!"
        echo "   Upload .env.production to this directory first."
        exit 1
    fi
fi

# ── Step 6: Build the Docker image ───────────────────────────
echo "▶ Building TechPulse AI Docker image..."
docker build -t techpulse-backend:latest .
echo "✅ Image built"

# ── Step 7: Start the stack ──────────────────────────────────
echo "▶ Starting TechPulse AI stack..."
docker compose -f docker-compose.prod.yml --env-file .env up -d
echo "✅ Stack started"

# ── Step 8: Wait for health check ───────────────────────────
echo "▶ Waiting for backend to be healthy (60s max)..."
for i in $(seq 1 12); do
    sleep 5
    if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    echo "   Attempt $i/12..."
done

# ── Done ─────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s ifconfig.me)
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                  DEPLOYMENT COMPLETE                 ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Backend URL: http://$PUBLIC_IP:8080         "
echo "║  Health:      http://$PUBLIC_IP:8080/actuator/health "
echo "║  Feed:        http://$PUBLIC_IP:8080/api/v1/bites    "
echo "║  Ingest:      http://$PUBLIC_IP:8080/api/v1/admin/news/ingest"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Update your mobile .env:                            ║"
echo "║  EXPO_PUBLIC_API_URL=http://$PUBLIC_IP:8080/api/v1   "
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Useful commands reminder
echo "📋 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f backend"
echo "   Restart:      docker compose -f docker-compose.prod.yml restart backend"
echo "   Stop all:     docker compose -f docker-compose.prod.yml down"
echo "   Update app:   docker build -t techpulse-backend:latest . && docker compose -f docker-compose.prod.yml up -d --no-deps backend"
