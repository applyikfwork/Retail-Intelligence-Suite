# OmniStore AI

## Overview

OmniStore AI is a full-stack retail intelligence dashboard for local Indian businesses (kirana stores, salons, clinics). It gives shop owners the same data intelligence as global retail giants — WhatsApp campaigns, footfall heatmaps, loyalty QR engine, AI-generated social posts, and a live sales cockpit.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/omnistore-ai) — dark saffron/amber theme
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`, `zod-validation-error`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

### Frontend Pages (artifacts/omnistore-ai/src/pages/)
- `/` — Dashboard: KPI cards, hourly sales chart, dead zone chart, recent activity feed
- `/customers` — Customer management with tier filtering (VIP/Regular/New)
- `/campaigns` — WhatsApp Happy Hour Bot with dead zone alerts and campaign builder
- `/sales` — POS transaction feed and quick-bill form (cash/UPI/card)
- `/loyalty` — QR loyalty engine (scan 6 times → free session)
- `/footfall` — CCTV heatmap with zone intensity visualization and AI insights
- `/social` — Auto-poster for Google Business and Instagram

### Backend Routes (artifacts/api-server/src/routes/)
- `dashboard.ts` — /dashboard/summary, /sales-by-hour, /sales-by-day, /recent-activity
- `customers.ts` — CRUD + /top-loyal endpoint
- `sales.ts` — POS sales recording with customer tier auto-upgrade
- `campaigns.ts` — WhatsApp campaign management + /dead-zones detection
- `loyalty.ts` — QR scan recording with free session logic
- `posts.ts` — Social media post management
- `footfall.ts` — Heatmap zone data and AI insight alerts

### Database Schema (lib/db/src/schema/)
- `customers.ts` — customers (tier: vip/regular/new, spend tracking)
- `sales.ts` — sales transactions (service, amount, payment_method)
- `campaigns.ts` — WhatsApp campaigns (status: draft/sent/scheduled)
- `loyalty.ts` — loyalty_cards (QR codes, scan counts, free session flags)
- `posts.ts` — social_posts (platforms array, likes, reach)
- `footfall.ts` — footfall_zones (x/y/intensity/visitors/conversionRate)

### API Spec Fix
`lib/api-spec/package.json` codegen script patches `lib/api-zod/src/index.ts` after orval runs to avoid duplicate export conflicts between zod schemas and type exports.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
