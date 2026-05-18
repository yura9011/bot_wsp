#!/bin/bash
# Backup on demand for bot_dolce production.
# Intended for Dashboard Maestro production only, after explicit approval.

set -euo pipefail

PROD_DIR="${PROD_DIR:-/home/forma/bot_dolce}"
BACKUP_DIR="${BACKUP_DIR:-/home/forma/backups-prod}"
KEEP_DAYS="${KEEP_DAYS:-30}"
DATE="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="bot_dolce-maestro-${DATE}.tar.gz"

if [[ "$PROD_DIR" != "/home/forma/bot_dolce" ]]; then
  echo "Refusing to run outside production path: $PROD_DIR" >&2
  exit 1
fi

if [[ ! -d "$PROD_DIR" ]]; then
  echo "Production directory not found: $PROD_DIR" >&2
  exit 1
fi

if [[ ! -f "$PROD_DIR/config/agents.json" ]]; then
  echo "agents.json not found under production directory: $PROD_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

includes=()
for path in \
  "config" \
  "data" \
  "logs" \
  "catalogs" \
  "dashboard-humano-v2" \
  "lib" \
  "scripts" \
  "flujos.js" \
  "orchestrator.js" \
  "package.json" \
  "package-lock.json" \
  ".env" \
  ".wwebjs_auth" \
  ".wwebjs_cache"
do
  if [[ -e "$PROD_DIR/$path" ]]; then
    includes+=("$path")
  fi
done

if [[ ${#includes[@]} -eq 0 ]]; then
  echo "No backup inputs found under $PROD_DIR" >&2
  exit 1
fi

echo "Creating production backup: $BACKUP_DIR/$ARCHIVE_NAME"
(
  cd "$PROD_DIR"
  tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" "${includes[@]}"
)

tar -tzf "$BACKUP_DIR/$ARCHIVE_NAME" >/dev/null

find "$BACKUP_DIR" -name "bot_dolce-maestro-*.tar.gz" -mtime +"$KEEP_DAYS" -delete

echo "Backup completed: $BACKUP_DIR/$ARCHIVE_NAME"
