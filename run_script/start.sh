#!/bin/bash

# ─────────────────────────────────────────────
#  Eat Clean API — dev startup script
# ─────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── 1. Check Docker is running ────────────────
if ! docker info > /dev/null 2>&1; then
  err "Docker is not running. Please start Docker Desktop first."
  exit 1
fi
log "Docker is running."

# ── 2. Start ChromaDB ─────────────────────────
log "Starting ChromaDB..."
docker-compose -f docker-compose.rag.yml up -d

# Wait for ChromaDB to be ready
echo -n "    Waiting for ChromaDB on port 8000"
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo ""
    log "ChromaDB is ready."
    break
  fi
  echo -n "."
  sleep 1
  if [ $i -eq 15 ]; then
    echo ""
    warn "ChromaDB did not respond in time. Continuing anyway..."
  fi
done

# ── 3. Install dependencies ───────────────────
if [ ! -d "node_modules" ]; then
  log "Installing npm dependencies..."
  npm install
else
  log "node_modules found, skipping install."
fi

# ── 4. Check LM Studio is reachable ──────────
LM_URL="http://127.0.0.1:1234/v1/models"
echo -n "    Checking LM Studio"
for i in $(seq 1 5); do
  if curl -s "$LM_URL" > /dev/null 2>&1; then
    echo ""
    log "LM Studio is reachable."
    LM_READY=true
    break
  fi
  echo -n "."
  sleep 1
done
if [ -z "$LM_READY" ]; then
  echo ""
  warn "LM Studio is NOT reachable at $LM_URL."
  warn "Make sure LM Studio is open and the server is started with:"
  warn "  • A chat/LLM model loaded (for meal generation)"
  warn "  • nomic-embed-text model loaded (for RAG embeddings)"
fi

# ── 5. Index knowledge base into ChromaDB ─────
#     Only runs if ChromaDB has no documents yet
CHROMA_COUNT=$(curl -s http://localhost:8000/api/v1/collections 2>/dev/null || echo "[]")
if echo "$CHROMA_COUNT" | grep -q "meal_recipes\|disease_guidelines\|ingredients"; then
  log "Knowledge base already indexed in ChromaDB, skipping."
else
  if [ -n "$LM_READY" ]; then
    log "Indexing knowledge base into ChromaDB..."
    npm run rag:index
    log "Knowledge base indexed."
  else
    warn "Skipping knowledge base indexing (LM Studio not available)."
    warn "Run 'npm run rag:index' manually once LM Studio is ready."
  fi
fi

# ── 6. Start dev server ───────────────────────
echo ""
log "Starting Eat Clean API dev server..."
echo "    API:   http://localhost:4000/api"
echo "    Docs:  http://localhost:4000/api/docs"
echo ""
npm run dev
