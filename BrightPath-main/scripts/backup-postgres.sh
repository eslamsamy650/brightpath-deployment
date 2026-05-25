#!/usr/bin/env sh
# PostgreSQL backup for BrightPath — keeps last N days (default 7).
# Usage:
#   ./scripts/backup-postgres.sh
#   BACKUP_DIR=/var/backups/brightpath RETENTION_DAYS=7 ./scripts/backup-postgres.sh
#
# Requires: pg_dump in PATH, or run against Docker:
#   docker exec brightpath-postgres-prod pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > file.dump

set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

POSTGRES_USER="${POSTGRES_USER:-brightpath}"
POSTGRES_DB="${POSTGRES_DB:-brightpath}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"

mkdir -p "$BACKUP_DIR"
OUT_FILE="${BACKUP_DIR}/brightpath_${TIMESTAMP}.dump"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'brightpath-postgres'; then
  CONTAINER="$(docker ps --format '{{.Names}}' | grep 'brightpath-postgres' | head -n 1)"
  echo "Backing up via Docker container: $CONTAINER"
  docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT_FILE"
else
  echo "Backing up via pg_dump (${POSTGRES_HOST}:${POSTGRES_PORT})"
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -Fc \
    -f "$OUT_FILE"
fi

echo "Backup written: $OUT_FILE"

# Prune old backups
find "$BACKUP_DIR" -name 'brightpath_*.dump' -type f -mtime +"$RETENTION_DAYS" -print -delete

echo "Retention: keeping backups from the last ${RETENTION_DAYS} days."
