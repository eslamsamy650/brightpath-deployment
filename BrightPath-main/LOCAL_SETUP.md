# BrightPath — Local Development Setup

Arabic-first Egyptian K-12 School ERP. Stack: **Node.js + Express + Prisma + PostgreSQL** (backend), **React + Vite** (frontend).

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 16 (via Docker **or** local install) |
| Docker Desktop | Optional (recommended for Postgres) |

## Quick start (recommended order)

### 1. Generate environment files

From repo root (`BrightPath-main/`):

```bash
node scripts/generate-dev-env.mjs
```

Or copy manually:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` — JWT secrets must be **at least 32 characters** each.

### 2. Start PostgreSQL

**Option A — Docker Compose (Postgres only)**

```bash
docker compose up -d postgres
```

Default connection (matches `.env.example`):

`postgresql://brightpath:brightpath@127.0.0.1:5433/brightpath?schema=public`

**Option B — Full stack in Docker**

```bash
docker compose up -d
```

Backend: `http://localhost:4000` · Frontend (nginx): `http://localhost:5173`

> On Windows, ensure **Docker Desktop is running** before `docker compose`.

### 3. Backend: install, migrate, seed

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Health check: `http://localhost:4000/health`  
API base: `http://localhost:4000/api/v1`  
Swagger: `http://localhost:4000/api-docs`

### 4. Frontend: install and dev server

New terminal:

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

Vite proxies `/api`, `/health`, and `/uploads` to port 4000 — leave `VITE_API_BASE` empty in dev.

### 5. Login (after seed)

| Role | Email | Password |
|------|-------|----------|
| School admin | `admin@brightpath.eg` | `Admin@1234` |

See seed output for teacher/parent demo accounts: `npm run seed` in `backend/`.

## Startup order summary

1. Postgres (Docker or local)
2. `backend`: migrate → seed → `npm run dev`
3. `frontend`: `npm run dev`

## Parallel run (Linux/macOS)

```bash
AUTO_INSTALL=1 ./run.sh
```

## Commands reference

| Task | Command (from `backend/`) |
|------|---------------------------|
| Prisma Studio | `npm run db:studio` |
| Dev migrations | `npm run db:migrate:dev` |
| Deploy migrations | `npm run db:migrate` |
| Push schema (no migration) | `npm run db:push` |
| Seed demo data | `npm run seed` |
| Unit tests | `npm test` |
| Coverage | `npm run test:coverage` |
| Lint backend | `npm run lint` |

| Task | Command (from `frontend/`) |
|------|----------------------------|
| Production build | `npm run build` |
| Preview build | `npm run preview` |
| Lint frontend | `npm run lint` |

## Environment variables

| File | Purpose |
|------|---------|
| `backend/.env.example` | Backend template |
| `frontend/.env.example` | Frontend template |
| `.env.production.example` | Docker production template |
| `scripts/generate-dev-env.mjs` | Auto-create dev `.env` files |

Required backend vars: `FRONTEND_URL`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

## Troubleshooting

### `Invalid environment variables` on backend start

- JWT secrets shorter than 32 chars → regenerate with `node scripts/generate-dev-env.mjs` or lengthen manually.
- `FRONTEND_URL` must be a valid URL (e.g. `http://localhost:5173`).

### Database connection refused

- Postgres not running → `docker compose up -d postgres`
- Wrong port: Docker maps **5433→5432**; local Postgres may use **5432** — update `DATABASE_URL`.

### `P3005` migration baseline error (Docker)

`docker-entrypoint.sh` auto-baselines when schema exists without migration history.

### Frontend shows “لا يمكن الوصول إلى الخادم”

- Backend not on port 4000
- Firewall blocking localhost
- Custom `VITE_API_BASE` pointing to wrong host — clear it for dev proxy

### Login 401 after fresh DB

Run `npm run seed` in `backend/`.

### Docker: `dockerDesktopLinuxEngine` not found

Start **Docker Desktop** on Windows, then retry `docker compose`.

### WebSocket / messages not connecting in dev

Set `VITE_SOCKET_URL=http://localhost:4000` in `frontend/.env`. Vite does not proxy Socket.io by default.

## Verification checklist

- [ ] `GET http://localhost:4000/health` → 200
- [ ] Login at `http://localhost:5173` with seed admin
- [ ] Students / classes pages load data
- [ ] `cd backend && npm test` → 96 tests pass

## Related docs

- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — free online hosting
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — production checklist
- [POSTGRES_SETUP.md](./POSTGRES_SETUP.md) — Postgres notes
