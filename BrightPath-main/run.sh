#!/usr/bin/env bash
set -euo pipefail

# Run backend and frontend in parallel, auto-installing deps if needed,
# and prefixing logs for clarity.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ensure_deps() {
  local folder="$1"
  if [ ! -d "$folder/node_modules" ]; then
    echo "Installing dependencies for $folder..."
    npm --prefix "$folder" install --silent
  fi
}

echo "Preparing services..."

if [ "${AUTO_INSTALL:-0}" = "1" ]; then
  ensure_deps backend || echo "Warning: failed installing backend deps"
  ensure_deps frontend || echo "Warning: failed installing frontend deps"
else
  missing=0
  if [ ! -x "backend/node_modules/.bin/nodemon" ] && [ ! -x "backend/node_modules/.bin/node" ]; then
    echo "Missing backend dev binaries (nodemon). Run: cd backend && npm install"
    missing=1
  fi
  if [ ! -x "frontend/node_modules/.bin/vite" ]; then
    echo "Missing frontend dev binaries (vite). Run: cd frontend && npm install"
    missing=1
  fi
  if [ "$missing" -eq 1 ]; then
    echo "To allow this script to auto-install dependencies, run: AUTO_INSTALL=1 ./run.sh"
    exit 1
  fi
fi

echo "Starting backend and frontend (press Ctrl+C to stop)..."

# Start processes in subshells so pipe failures don't kill this script.
( npm --prefix backend run dev 2>&1 | sed -u 's/^/[backend] /' ) & pid_backend=$!
( npm --prefix frontend run dev 2>&1 | sed -u 's/^/[frontend] /' ) & pid_frontend=$!

cleanup() {
  echo "Stopping services..."
  kill "$pid_backend" "$pid_frontend" 2>/dev/null || true
  wait "$pid_backend" 2>/dev/null || true
  wait "$pid_frontend" 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM

wait
