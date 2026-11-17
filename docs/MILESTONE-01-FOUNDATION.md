# Milestone 1 — Foundation

Aligned with Dev Spec §12.3 and the agreed V1 Core Operating Loops.

## Goal

Prove the architectural spine of IMPERIAL OS before building every module deeply:

- one shared backend
- one identity system
- Perspective and Scope kept separate
- Admin Portal foundation (web)
- Associate execution loop stub (Field Readiness → approval → deployment → field capture)
- Business Empowerment placeholders (configurable curriculum, campaigns, commercials, rules)

## Delivered in this milestone

1. Monorepo (`apps/api`, `apps/web`, `packages/shared`)
2. Auth (JWT) + identity states + V1 roles
3. Perspective / Scope session context
4. Users, campaigns, territories, deployments
5. Configurable Field Readiness curriculum + leader approval
6. Field activity + sale recording API (offline-ready `clientRef` / sync status fields)
7. Admin Portal screens: Overview, People, Campaigns, Field Readiness, Associate Loop preview
8. Seeded demo accounts

## Explicitly deferred (later milestones)

- Full Learn / Roleplay content authoring UX
- Full Performance / PNL engine UI
- Native mobile app
- Offline sync client
- Advanced analytics, AI, mapping, integrations

## Demo accounts

- Managing Director: `md@imperial.local` / `password123`
- Junior Associate: `associate@imperial.local` / `password123`
- Associate: `assoc@imperial.local` / `password123`

## Suggested demo path

1. Sign in as MD → Overview
2. Open Associate Loop → complete curriculum items
3. Field Readiness → Approve Field Ready
4. Campaigns → deploy associate to territory
5. Associate Loop → record doors / sale
