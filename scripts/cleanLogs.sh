#!/usr/bin/env bash
#
# Clean log files.
#
# Usage:
#   ./scripts/cleanLogs.sh          # truncate logs/combined.log
#   npm run logs:clean               # (after adding the script to package.json)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/combined.log"

if [ -f "$LOG_FILE" ]; then
  > "$LOG_FILE"
  echo "Cleaned: $LOG_FILE"
else
  echo "Log file not found: $LOG_FILE"
fi
