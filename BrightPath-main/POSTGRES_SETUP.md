# PostgreSQL Setup Guide for BrightPath

The backend uses **PostgreSQL** with **Prisma**, based on the schema in `data/schema/`.

## Option 1: Docker (recommended)

```bash
# Start PostgreSQL
docker compose up -d postgres

# Apply migrations and seed demo data
cd backend
npm install
npm run db:migrate
npm run seed
npm run dev
```

Connection string (default, port **5433** to avoid conflicts with a local PostgreSQL on 5432):

```env
DATABASE_URL=postgresql://brightpath:brightpath@127.0.0.1:5433/brightpath?schema=public
```

## Option 2: Local PostgreSQL

1. Install PostgreSQL 16+
2. Create database and user:

```sql
CREATE USER brightpath WITH PASSWORD 'brightpath';
CREATE DATABASE brightpath OWNER brightpath;
```

3. Enable extensions (required by schema):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

4. Set `DATABASE_URL` in `backend/.env`
5. Run migrations and seed demo data:

```bash
cd backend
npm run db:migrate
npm run seed
npm run dev
```

## Full stack with Docker Compose

```bash
docker compose up --build
```

The backend runs `prisma migrate deploy` on startup to apply committed migrations from `backend/prisma/migrations`.

## Demo credentials (after seed)

| Role    | Email                   | Password     |
|---------|-------------------------|--------------|
| Admin   | admin@brightpath.eg     | Admin@1234   |
| Teacher | fatima@brightpath.eg    | Teacher@1234 |
| Student | yasmine@brightpath.eg   | Student@1234 |
| Parent  | nadia@example.com       | Parent@1234  |

## Useful commands

```bash
npm run db:push    # sync schema to database
npm run db:migrate # apply committed migrations
npm run db:migrate:dev # create/apply a local development migration
npm run db:studio  # open Prisma Studio
npm run seed       # load demo data
```
