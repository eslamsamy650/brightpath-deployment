#!/bin/sh
set -e

echo "Running database migrations..."
set +e
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
MIGRATE_EXIT=$?
set -e

echo "$MIGRATE_OUTPUT"

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  if echo "$MIGRATE_OUTPUT" | grep -q 'P3005'; then
    echo "Database has existing schema without migration history. Baselining migrations..."
    for dir in prisma/migrations/*/; do
      [ -d "$dir" ] || continue
      migration=$(basename "$dir")
      echo "Marking $migration as applied..."
      npx prisma migrate resolve --applied "$migration"
    done
    npx prisma migrate deploy
  else
    exit "$MIGRATE_EXIT"
  fi
fi

if [ "$NODE_ENV" = "production" ]; then
  exec npm start
else
  exec npm run dev
fi
