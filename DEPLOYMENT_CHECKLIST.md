# BrightPath — Production Deployment Checklist

Use with [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Pre-deploy

- [ ] All secrets in host dashboards — **never** commit `.env` or `.env.production`
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` ≥ 32 chars (unique, random)
- [ ] `DATABASE_URL` points to production Postgres (Neon `sslmode=require`)
- [ ] `FRONTEND_URL` matches exact Netlify/production origin
- [ ] `VITE_API_BASE` set at **frontend build** to backend `/api/v1` URL
- [ ] Remove or skip `npm run seed` on production (or use non-default passwords)
- [ ] `NODE_ENV=production` on backend
- [ ] Rate limits reviewed (`RATE_LIMIT_MAX_REQUESTS`)

## Database

- [ ] `npx prisma migrate deploy` succeeded
- [ ] Backup strategy configured (`scripts/backup-postgres.sh` or Neon backups)
- [ ] Connection pooling enabled if using Neon serverless driver (optional)

## Backend (Render / Docker)

- [ ] Health check `/health` returns 200
- [ ] CORS allows only production frontend URL
- [ ] Uploads volume persisted (Docker: `backend-uploads-prod`)
- [ ] Logs directory writable or redirected to stdout

## Frontend (Netlify / nginx)

- [ ] `npm run build` passes locally
- [ ] API calls hit correct backend (browser network tab)
- [ ] RTL layout verified on mobile width
- [ ] Login + refresh flow works against production API

## Security smoke test

- [ ] Unauthenticated `/api/v1/students` → 401
- [ ] Parent cannot access another school's student by ID tampering
- [ ] Default seed passwords changed if seed was run

## Post-deploy

- [ ] Create real school admin account
- [ ] Document support URL and admin contacts
- [ ] Monitor Render/Neon dashboards for errors
- [ ] Tag release in git

## Rollback

1. Revert frontend deploy (Netlify previous publish).
2. Rollback Render backend deploy.
3. If migration broke DB: restore Neon backup / run down migration only if safe.

## CI (GitHub Actions)

On every PR/push to `main`:

- Backend unit tests + coverage artifact
- Frontend production build
- ESLint backend + frontend

See `.github/workflows/ci.yml`.

Optional: add deploy workflow after secrets `RENDER_DEPLOY_HOOK`, `NETLIFY_BUILD_HOOK` are configured.
