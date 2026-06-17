#!/bin/bash

# ─────────────────────────────────────────────
#  Eat Clean API — clear ChromaDB & re-index
# ─────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── 1. Check ChromaDB is running ──────────────
if ! curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
  warn "ChromaDB is not running. Starting it now..."
  docker-compose -f docker-compose.rag.yml up -d

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
      err "ChromaDB did not respond. Aborting."
      exit 1
    fi
  done
else
  log "ChromaDB is already running."
fi

# ── 2. Check LM Studio is reachable ──────────
LM_URL="http://127.0.0.1:1234/v1/models"
echo -n "    Checking LM Studio"
LM_READY=""
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
  err "LM Studio is NOT reachable at $LM_URL."
  err "Start LM Studio and load the bge-m3 embedding model first."
  exit 1
fi

# ── 3. Delete all ChromaDB collections ───────
log "Clearing ChromaDB collections..."
for collection in meal_recipes disease_guidelines ingredients; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE "http://localhost:8000/api/v1/collections/$collection")
  if [ "$STATUS" = "200" ]; then
    log "  Deleted collection: $collection"
  else
    warn "  Collection '$collection' not found or already deleted (status $STATUS)"
  fi
done

# ── 4. Re-index knowledge base ────────────────
log "Re-indexing knowledge base into ChromaDB..."
npm run rag:index

log "Done! ChromaDB has been refreshed with the latest knowledge base."
