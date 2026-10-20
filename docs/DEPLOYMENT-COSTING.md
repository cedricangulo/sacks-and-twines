# Deployment Costing — Monthly Operational Cost

Draft. Cost-introduction analysis included; the rejected-alternatives
comparison is not yet written.

Scope: the Sacks & Twines application as currently deployed. Excludes the
companion documentation site and any development-time tooling.

| Component                          | Technical Specification                                                              | Hosting Environment                                                                  | Monthly Cost (PHP) |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------ |
| Frontend Application Runtime       | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4            | Vercel — serverless Node.js runtime, `sacks-and-twines.vercel.app`                   | ₱0.00              |
| Edge Delivery & Encryption         | Global CDN, automated HTTPS/TLS certificates, WAF, DDoS mitigation                   | Vercel Edge Network (1M CDN requests + 100 GB fast data transfer per month included) | ₱0.00              |
| Backend & Realtime Synchronization | Convex serverless queries, mutations, and actions; reactive query subscriptions      | Convex Cloud "Free & Starter", S16 serverless class — `prod:sleek-buffalo-290`       | ₱0.00              |
| Relational Database                | Convex reactive database — 8 domain tables + 6 Convex Auth tables, index range reads | Convex Database (0.5 GB storage, 1 GB I/O per month included)                        | ₱0.00              |
| Object File Storage                | Product image uploads via `generateUploadUrl`, served through `ctx.storage.getUrl`   | Convex Storage (1 GB per month included)                                             | ₱0.00              |
| Authentication & Authorization     | `@convex-dev/auth`, Scrypt password hashing, JWT `role` claim for middleware         | Convex Auth — built into the base plan                                               | ₱0.00              |
| Transactional Email                | 8-digit one-time passcodes, owner-inbox routing (`convex/ResendOTP.ts`)              | Resend Free — 100 emails/day, 3 custom domains                                       | ₱0.00              |
| Request Rate Limiting              | `@convex-dev/rate-limiter` token bucket, per-function and global limits              | Convex Component — installed in application code, no managed fee                     | ₱0.00              |
| Domain Name & SSL Certificate      | `*.vercel.app` subdomain; no custom domain registered                                | Vercel-provided subdomain and managed certificate                                    | ₱0.00              |
| **Total Operational Cost**         | Full production stack for the Sacks & Twines inventory and dispatch system           | All components on vendor free tiers                                                  | **₱0.00**          |

## Basis of Estimate

Vendor pricing as published on **2026-10-17**, read from `vercel.com/pricing`,
`convex.dev/pricing`, and `resend.com/pricing`. No quoted figure is estimated
from memory or from a cached rate card.

Supporting evidence for each row:

- `NEXT_PUBLIC_SITE_URL=https://sacks-and-twines.vercel.app` (`.env.production`)
- `CONVEX_DEPLOYMENT=prod:sleek-buffalo-290` (`.env.production`)
- `convex/schema.ts` — 8 domain tables plus Convex Auth tables
- `convex/ResendOTP.ts`, `convex/auth.ts`, `convex/rate_limiter.ts`
- `convex/batches/mutations.ts` (`generateUploadUrl`)
- `convex/products/queries.ts` (`ctx.storage.getUrl`)
- `next.config.mjs` declares no `output: "export"`, so the app runs on the
  serverless runtime rather than as a static build
- No `Dockerfile`, compose file, nginx or Caddy configuration exists in the
  repository, and no web server, container runtime, or relational database
  process is self-hosted

## Qualifications

**Vercel Hobby is licensed for non-commercial personal use only.** Vercel's
fair use guidelines state that Hobby teams are restricted to non-commercial
personal use, and that any deployment used for the financial gain of any party
requires Pro or Enterprise. A free-tier Vercel row is therefore accurate for
this academic deployment, but a production deployment of the same system for
the client would require Vercel Pro at **$20 USD/month** (≈₱1,160 at ₱58/USD).
That single line item is the one that would move the total off ₱0.00.

**₱0.00 is conditional, not guaranteed.** No component in the table hard-caps at
zero. Convex Free meters usage and bills overage beyond its included
allowances, so the total holds only while the application stays inside those
allowances. The full breakdown follows.

## What Would Introduce Cost

### Convex Cloud — Free & Starter

Free & Starter is `$0/month and pay as you go`. Query and mutation compute is
unmetered on this tier, but the following are metered against an included
allowance and billed on overflow:

| Meter            | Included (Free & Starter) | Overage Rate    |
| ---------------- | ------------------------- | --------------- |
| Database I/O     | 1 GB / month              | $0.22 / GB      |
| Function calls   | 1M / month                | $2.20 / 1M      |
| Action compute   | 20 GB-hours / month       | $0.33 / GB-hour |
| Data egress      | 1 GB / month              | $0.132 / GB     |
| File storage     | 1 GB / month              | $0.033 / GB     |
| Database storage | 0.5 GB / month            | $0.22 / GB      |

Not applicable to this system and therefore excluded: search storage
($0.55/GB) and search queries ($0.11 per 1,000 query-GBs). `convex/schema.ts`
declares no `searchIndex` and no `vectorIndex`, and no `.search()` call exists
anywhere in `convex/`. Table filtering is client-side via `nuqs` and never
reaches a Convex search index.

Free-tier concurrency ceilings, which fail requests rather than billing: 1,000
concurrent sessions, 16 concurrent queries, 64 concurrent actions, and a
**deployment limit of 40**. That last figure is the operationally real one — it
caps how many times the backend schema can be pushed before migrating to
Professional.

### Vercel — Hobby

| Meter                           | Included (Hobby) | Overage Rate      |
| ------------------------------- | ---------------- | ----------------- |
| CDN requests                    | 1M / month       | Metered on Pro    |
| Fast data transfer              | 100 GB / month   | Metered on Pro    |
| Image Optimization cache reads  | —                | $0.40 / 1M reads  |
| Image Optimization cache writes | —                | $4.00 / 1M writes |

Image Optimization is metered **per image**, not per page load. It is in use
here — `next/image` with Convex Storage `remotePatterns`
(`next.config.mjs:10-24`) appears in
`features/products/components/product-card.tsx`,
`features/inventory/components/table/inventory-table-container.tsx`, and
`features/dispatches/components/dispatch-queue-sidebar.tsx`. A catalogue of
product photographs on a grid page multiplies this quickly, so it is the meter
most likely to be overlooked during a cost review.

### Resend — Free

| Constraint          | Free tier        | Notes                                                         |
| ------------------- | ---------------- | ------------------------------------------------------------- |
| Transactional quota | 100 emails / day | Not metered — sends are blocked past the limit                |
| Custom domains      | 3 included       | Additional domains are a $20/month add-on, Pro and Scale only |

One OTP is sent per sign-in attempt (`convex/ResendOTP.ts`), so this meter
scales with **daily active sign-ins, not stored data**. At roughly 100 staff
sign-ins per day it holds; it is a headcount constraint, not a usage constraint,
and it is the row that would need attention first if the client onboarded more
users.

### Plan Upgrades — The Only Unavoidable Floor

Overages are avoidable by staying inside allowances. A plan upgrade is not:
licensing terms and infrastructure tiers force it.

| Trigger                                                                                                                 | Required Plan       | Cost                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------- |
| Commercial / client deployment of the frontend                                                                          | Vercel Pro          | $20 / month             |
| More than 40 backend deployments, or a need for daily backups, exception reporting, streaming exports, or email support | Convex Professional | $25 / developer / month |
| Beyond 100 emails/day, or more than 3 sending domains                                                                   | Resend Pro          | $20 / month             |

All three combined: **$65 USD/month ≈ ₱3,770** at ₱58/USD. This is the honest
ceiling of the current architecture — a fully licensed production deployment of
this exact system, with no additional engineering work, does not remain free.

## Which Meter Breaks First

**Database I/O**, at 1 GB/month. This is already treated as a hard constraint by
the project rather than a theoretical one — `AGENTS.md` instructs protecting
"the 1 GB/month database-I/O free-tier budget" by keeping `pnpm seed`
idempotent, and `docs/PERFORMANCE-AUDIT.md` states plainly that "on a free tier
with a 1 GB/month budget, that is not free." The reactive-query and audit-log
write paths are what consume it, which is why `docs/N-1-QUERY-AUDIT.md` exists.

Currency note: USD figures are vendor-published and dated 2026-10-17. The
₱58/USD conversion is an assumed round rate for illustration — substitute your
bank's actual mid-market rate before this figure is quoted. Primary table rows
are unaffected, since every one of them is ₱0.00.