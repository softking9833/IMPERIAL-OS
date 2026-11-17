# IMPERIAL OS V1 — What to test

## Start servers

```bash
# terminal 1
npm run db:seed
npm run dev:api

# terminal 2
npm run dev:web

# terminal 3
npm run dev:mobile
```

- API: http://localhost:4000/health  
- Web: http://localhost:3000  
- Mobile: Expo Go QR / Android emulator / press `w` for web

### Demo logins

| Role | Email | Password |
|------|-------|----------|
| Managing Director | `md@imperial` | `password123` |
| Junior Associate | `associate@imperial` | `password123` |
| Associate | `assoc@imperial` | `password123` |

> After seed, Associate is **not** Field Ready and has **no** deployment. Do steps 1–3 first.

---

## 1) Field Readiness (web as Associate, or Associate Loop as MD)

1. Sign in as **MD** → open **Associate Loop** / Field Readiness for Alex.
2. Complete curriculum items / quizzes as needed.
3. As **MD** → **Field Readiness** → **Approve Field Ready**.

**Expect:** Associate becomes Field Ready.

## 2) Deploy (web as MD)

1. **Campaigns** → deploy Associate to a territory on Energy Switch (or seeded campaign).

**Expect:** Associate has active campaign + territory.

## 3) Field execution (mobile as Associate)

1. Sign in on mobile as Associate.
2. Open Field once **online** (caches campaign/territory).
3. Save doors / conversations, record a sale, add a callback, submit End of Day.

**Expect:** Data saves; Home / Performance update after refresh.

## 4) Offline Field sync (mobile)

1. On Field, tap **Simulate offline**.
2. Save activity, record sale, add callback, draft/submit EOD.
3. Confirm banner shows **Offline / local save** and **pending sync** queue.
4. Tap **Stop simulate offline** (or turn network back on) → **Sync now** (or reopen Field).

**Expect:** Queue clears; web Performance / Field shows the same doors/sales/callbacks/EOD. Syncing twice must **not** duplicate sales (clientRef).

## 5) Learn loop

1. Mobile **Learn** → open lesson → complete or pass quiz.
2. Web as MD → **Learn** content still visible/configurable.

## 6) Roleplay loop

1. Mobile **More** → submit a roleplay script.
2. Web as MD → Roleplay review → Approve or Return with feedback.

## 7) Performance / PNL

1. Mobile **Performance** → predicted profit from recorded sales.
2. Web as MD → mark a sale **PAID** → actual/realised profit updates.

## 8) Admin Business Empowerment (web as MD)

1. **Admin Config** → change sale value / day rate / add lesson / KPI targets.
2. Confirm Associate sees updated commercial/learning behaviour without code changes.

## 9) Home next actions

1. As Associate and as MD, open **Home**.
2. Confirm primary action matches current state (readiness / field / roleplay / EOD / reviews).

---

## Pass criteria (V1)

- [ ] Field Ready → deploy → field capture works
- [ ] Learn + Roleplay + Performance loops work on shared data
- [ ] MD can configure curriculum / commercials / day rates
- [ ] Offline field entries queue locally and sync without silent loss or duplicate sales
- [ ] Mobile and web share one backend / one identity
