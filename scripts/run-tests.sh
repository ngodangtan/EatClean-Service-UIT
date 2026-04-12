#!/usr/bin/env bash
#
# Run unit and/or integration tests.
#
# Usage:
#   ./scripts/run-tests.sh              # run unit tests only
#   ./scripts/run-tests.sh unit         # run unit tests only
#   ./scripts/run-tests.sh integration  # run integration tests only (requires running server + LM Studio)
#   ./scripts/run-tests.sh all          # run both unit and integration tests

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

MODE="${1:-unit}"

run_unit() {
  echo "=== Running unit tests ==="
  npx vitest run tests/unit/
}

run_integration() {
  echo "=== Checking API server ==="
  API_URL="${API_URL:-http://localhost:4000/api}"

  if ! curl -s --fail "$API_URL/health" > /dev/null 2>&1; then
    echo "ERROR: API server is not running at $API_URL"
    echo "Start it with: npm run dev"
    exit 1
  fi
  echo "Server is up at $API_URL"

  echo ""
  echo "=== Running integration tests ==="
  API_URL="$API_URL" npx vitest run tests/integration/
}

case "$MODE" in
  unit)
    run_unit
    ;;
  integration)
    run_integration
    ;;
  all)
    run_unit
    echo ""
    run_integration
    ;;
  *)
    echo "Usage: $0 [unit|integration|all]"
    exit 1
    ;;
esac
