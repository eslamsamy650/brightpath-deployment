#!/bin/sh
set -e

cd "$(dirname "$0")"

COMPOSE="docker-compose"
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
fi

# docker-compose v1 can fail with KeyError: 'ContainerConfig' when recreating
# stale containers on newer Docker engines. A clean down avoids that path.
$COMPOSE down --remove-orphans
exec $COMPOSE up --build "$@"
