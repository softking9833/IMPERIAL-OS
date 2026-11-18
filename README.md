# IMPERIAL OS

Shared operating platform for IMPERIAL.

- **Mobile**: Associate execution — learning, field, KPIs, callbacks (`apps/mobile`)
- **Web**: Administration Portal — people, curriculum/readiness, campaigns, commercials
- **One backend / identity / permissions / Perspective+Scope model**

## Milestones

- [`docs/MILESTONE-01-FOUNDATION.md`](docs/MILESTONE-01-FOUNDATION.md) — auth, identity, Field Readiness, campaigns, field capture
- [`docs/MILESTONE-02-LEARN-PERFORMANCE.md`](docs/MILESTONE-02-LEARN-PERFORMANCE.md) — Learn lessons/quizzes + Performance KPIs / predicted vs actual PNL
- [`docs/MILESTONE-03-HOME-FIELD.md`](docs/MILESTONE-03-HOME-FIELD.md) — Home next-actions + Field callbacks / End of Day
- [`docs/MILESTONE-04-PROFILE-ROLEPLAY.md`](docs/MILESTONE-04-PROFILE-ROLEPLAY.md) — Profile identity view + Roleplay submit/review loop
- [`docs/MILESTONE-05-ADMIN-CONFIG.md`](docs/MILESTONE-05-ADMIN-CONFIG.md) — Admin curriculum/commercials/KPI/day-rate configuration
- [`docs/MILESTONE-06-MOBILE.md`](docs/MILESTONE-06-MOBILE.md) — Associate mobile app (Expo)

Current cut includes Milestones 1–6 (web + mobile execution surface), including offline Field sync.

Client V1 test steps: [`docs/V1-TEST-CHECKLIST.md`](docs/V1-TEST-CHECKLIST.md).

## Quick start

```bash
npm install
npm run db:generate -w @imperial/api
npm run db:migrate -w @imperial/api -- --name foundation
npm run db:seed -w @imperial/api
npm run build -w @imperial/shared
npm run dev:api
npm run dev:web
# Mobile (separate install — Expo is outside npm workspaces)
npm --prefix apps/mobile install
npm run dev:mobile
```

- API: http://localhost:4000/health
- Web: http://localhost:3000
- Mobile: Expo Dev Tools (Android emulator uses `http://10.0.2.2:4000`)

### Demo logins

| Role | Email | Password |
|------|-------|----------|
| Managing Director | md@imperial.com | password123 |
| Junior Associate | associate@imperial.com | password123 |
| Associate | assoc@imperial.com | password123 |

## Repo layout

```
apps/api          Express + Prisma API
apps/web          Next.js Admin Portal
apps/mobile       Expo Associate app (standalone install)
packages/shared   Shared domain types
docs/             Milestone notes
```

## V1 product north star

An already-onboarded Associate can:

Enter OS → complete Field Readiness → receive leader approval → become Field Ready → receive campaign/territory → execute in field → record activity → learning/roleplay loops → performance/profitability → improve → repeat.
