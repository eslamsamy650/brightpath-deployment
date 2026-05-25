# BrightPath — Free Online Deployment Guide

Recommended **free-tier** stack for this monorepo (Express API + React SPA + PostgreSQL):

| Layer | Provider | Why |
|-------|----------|-----|
| PostgreSQL | [Neon](https://neon.tech) | Free serverless Postgres, no sleep, Prisma-friendly connection string |
| Backend API | [Render](https://render.com) | Free Web Service, env vars, `npm start`, health checks |
| Frontend SPA | [Netlify](https://netlify.com) | Free static hosting, Vite build, env at build time |

**Alternative:** Render static site for frontend + same Render account for API (fewer dashboards).

**Not recommended for MVP:** Vercel for Express backend (serverless limits, cold starts, no long-lived Socket.io without extra work).

---

## Architecture (production)

```
Browser → Netlify (React dist)
              ↓ HTTPS
         Render API (Express :4000)
              ↓
         Neon PostgreSQL
```

Socket.io: works on Render if you use a **single** web instance; for MVP, messaging UI can stay placeholder until you upgrade plan or add Redis adapter.

---

## Step 1 — Neon PostgreSQL

1. Create project → database `brightpath`.
2. Copy connection string (pooled recommended for serverless):

   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/brightpath?sslmode=require`

3. In Render backend env, set:

   `DATABASE_URL=<neon-connection-string>`

4. Run migrations once (from your machine or Render shell):

   ```bash
   cd backend
   DATABASE_URL="..." npx prisma migrate deploy
   npm run seed   # optional demo data — remove for real production
   ```

---

## Step 2 — Render (backend)

1. New **Web Service** → connect GitHub repo → root directory: `backend`.
2. Settings:

   | Setting | Value |
   |---------|-------|
   | Build Command | `npm ci && npx prisma generate` |
   | Start Command | `npx prisma migrate deploy && npm start` |
   | Health Check Path | `/health` |

3. Environment variables (minimum):

   ```env
   NODE_ENV=production
   PORT=4000
   API_PREFIX=/api/v1
   FRONTEND_URL=https://YOUR-NETLIFY-SITE.netlify.app
   DATABASE_URL=<neon-url>
   JWT_ACCESS_SECRET=<openssl rand -base64 48>
   JWT_REFRESH_SECRET=<openssl rand -base64 48>
   ```

4. Note public URL: `https://brightpath-api.onrender.com`

See `render.yaml` in repo root for Infrastructure-as-code starter.

---

## Step 3 — Netlify (frontend)

1. New site → import repo → base directory: `frontend`.
2. Build settings:

   | Setting | Value |
   |---------|-------|
   | Build command | `npm ci && npm run build` |
   | Publish directory | `dist` |

3. Environment variables (build-time):

   ```env
   VITE_API_BASE=https://brightpath-api.onrender.com/api/v1
   VITE_SOCKET_URL=https://brightpath-api.onrender.com
   ```

4. Deploy → copy site URL → update Render `FRONTEND_URL` to match → redeploy backend (CORS).

See `netlify.toml` in `frontend/`.

---

## Step 4 — CORS & cookies

Backend `app.js` uses `FRONTEND_URL` for CORS. It **must** exactly match the Netlify origin (no trailing slash mismatch).

Refresh tokens use HTTP-only cookies in some flows; current MVP stores refresh token in `localStorage` — works cross-origin with CORS credentials if enabled later.

---

## Docker production (VPS / single server)

```bash
cp .env.production.example .env.production
# Fill JWT secrets, POSTGRES_PASSWORD, FRONTEND_URL

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Frontend nginx proxies `/api` to backend — set `VITE_API_BASE=/api/v1` at build time.

---

## Health checks

| Endpoint | Expected |
|----------|----------|
| `GET /health` | `{ "status": "ok" }` |
| `GET /api/v1/...` | Authenticated routes behind JWT |

---

## Rollback

1. **Render:** Dashboard → Deploys → Rollback to previous deploy.
2. **Netlify:** Deploys → Publish previous deploy.
3. **Database:** Neon branch / point-in-time restore (paid feature on some plans) or restore from `scripts/backup-postgres.sh` dump.

---

## Production startup commands

```bash
# Backend (Render start command)
npx prisma migrate deploy && npm start

# One-off seed (dev/staging only)
npm run seed
```

---

## Cost notes (free tier limits)

- **Render free:** service sleeps after ~15 min inactivity; first request slow.
- **Neon free:** storage and compute caps; fine for MVP demo.
- **Netlify free:** 100 GB bandwidth/month.

Upgrade path: Render paid ($7+) + Neon scale + Netlify Pro when schools go live.
