#!/bin/bash

# ─────────────────────────────────────────────
#  Eat Clean API — dev startup script
#
#  This script bootstraps the full local dev environment in order:
#    1. Verify Docker is running (required for ChromaDB)
#    2. Start ChromaDB vector database via Docker Compose and wait until healthy
#    3. Install npm dependencies if node_modules is missing
#    4. Confirm LM Studio local AI server is reachable on port 1234
#    5. Index the Vietnamese knowledge base (recipes, guidelines, ingredients)
#       into ChromaDB — skipped if collections already exist or LM Studio is down
#    6. Launch the Express dev server (nodemon, port 4000)
#
#  Usage: bash run_script/start.sh
#  Prerequisites: Docker Desktop running, LM Studio open with a chat model
#                 and the bge-m3 multilingual embedding model loaded.
# ─────────────────────────────────────────────

# Exit immediately if any command fails
set -e

# ANSI colour codes for pretty terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # reset colour

# Helper functions: prefix each message with a coloured status icon
log()  { echo -e "${GREEN}[✓]${NC} $1"; }   # success
warn() { echo -e "${YELLOW}[!]${NC} $1"; }  # non-fatal warning
err()  { echo -e "${RED}[✗]${NC} $1"; }     # fatal error

# ── 1. Check Docker is running ────────────────
# ChromaDB runs inside Docker, so the daemon must be up before anything else.
if ! docker info > /dev/null 2>&1; then
  err "Docker is not running. Please start Docker Desktop first."
  exit 1
fi
log "Docker is running."

# ── 2. Start ChromaDB ─────────────────────────
# Brings up the ChromaDB container defined in docker-compose.rag.yml in
# detached mode (-d), then polls the /heartbeat endpoint up to 15 seconds.
log "Starting ChromaDB..."
docker-compose -f docker-compose.rag.yml up -d

# Poll ChromaDB heartbeat until it responds or the timeout is reached.
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
# Runs npm install only when node_modules is absent (e.g. fresh clone).
# Skipped on subsequent runs to avoid unnecessary overhead.
if [ ! -d "node_modules" ]; then
  log "Installing npm dependencies..."
  npm install
else
  log "node_modules found, skipping install."
fi

# ── 4. Check LM Studio is reachable ──────────
# LM Studio exposes a local OpenAI-compatible server on port 1234.
# Two models must be loaded:
#   • A chat/LLM model — used for Vietnamese meal plan generation
#   • bge-m3 embedding model — multilingual, required for RAG vector search
# This step is non-fatal: a warning is shown and the server starts anyway,
# but RAG indexing (step 5) will be skipped if LM Studio is not reachable.
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
  warn "  • bge-m3 embedding model loaded (multilingual, for Vietnamese RAG)"
fi

# ── 5. Index knowledge base into ChromaDB ─────
# Runs `npm run rag:index` to embed and upsert the three knowledge-base JSON
# files (recipes, disease guidelines, ingredients) into ChromaDB collections.
# Skipped when any of the three collections already exist — re-run manually
# via `npm run rag:index` whenever the JSON files or the embedding model change.
# Also skipped when LM Studio is unavailable (embeddings require it).
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
# Starts the Express server via nodemon (hot-reload on file changes).
# API is available at port 4000; Swagger UI at /api/docs.
echo ""
log "Starting Eat Clean API dev server..."
echo "    API:   http://localhost:4000/api"
echo "    Docs:  http://localhost:4000/api/docs"
echo ""
npm run dev
