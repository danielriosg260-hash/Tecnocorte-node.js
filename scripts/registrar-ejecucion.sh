#!/usr/bin/env bash

set -u

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/backup-cron.log"

mkdir -p "$(dirname "$LOG_FILE")"
echo "Ejecución del backup: $(date '+%Y-%m-%d %H:%M:%S %Z')" >> "$LOG_FILE"
