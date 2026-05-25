#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

node <<'NODE'
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma
  .$queryRaw`SELECT 1 AS ok`
  .then(() => {
    console.log('PostgreSQL connection OK');
    return prisma.$disconnect();
  })
  .catch(err => {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  });
NODE
