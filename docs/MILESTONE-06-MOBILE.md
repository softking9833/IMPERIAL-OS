# Milestone 6 — Mobile Associate App

## Goal

Deliver the Associate execution surface on mobile, sharing the same backend, identity and data as the web Admin Portal.

## Delivered

- Expo React Native app in `apps/mobile`
- Login against shared API
- Tabs: Home, Field, Learn, Performance, More (Profile + Roleplay)
- Field capture: doors, sales, callbacks, End of Day
- Offline Field queue (local save + sync statuses + simulate-offline for testing)
- Learn lessons/quizzes
- Performance predicted vs actual snapshot

## Test guide

See [`V1-TEST-CHECKLIST.md`](./V1-TEST-CHECKLIST.md).

## Run

1. Start API: `npm run dev:api`
2. Start mobile: `npm run dev:mobile`
3. Open in Expo Go (same LAN) or Android emulator

### API URL notes

- iOS simulator: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000` (default in app)
- Physical device: set `EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000`

### Demo login

`associate@imperial.local` / `password123`
