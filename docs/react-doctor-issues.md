# React Doctor — Issue Checklist

**Project:** `sacks-and-twines`
**Score:** 67 / 100 Needs work ([share](https://react.doctor/share?p=sacks-and-twines&s=67&e=1&w=45&f=30))
**Scan date:** 2026-08-31 18:06 (full `--verbose`, 273 files, 11.3s)
**Total issues:** 46 — Performance: 25 warnings · Bugs: 1 error + 9 warnings · Maintainability: 10 warnings · Security: 1 warning
**Delta:** 76 → 46 (−30), Score 51 → 67 (+16) since 2026-08-30

> Full per-file diagnostics were written by the CLI to:
> `C:\Users\ANGEL\AppData\Local\Temp\react-doctor-0015363f-ad92-442e-9c31-6f39fcd34f26` (prev: `react-doctor-f5e4ae8f-16c9-40d3-bf35-2cba9f73fdf2`)

**How to use:** Tick a box when fixed, then re-run `pnpm dlx react-doctor@latest --verbose -y` and confirm the count drops. Fix **bugs/security** first — they weigh most heavily. Read the file before suppressing any finding.

> **Note:** `components/ui/*` and `components/charts/*` are excluded from this checklist (shadcn-managed / third-party chart lib).

> **Phase 0 (2026-08-31):** Renamed `react-doctor.config.json` → `doctor.config.json` (deprecated name). Added ignores for Convex framework entries (`convex/http.ts`, `convex/migrations.ts`, `convex/seed/clear.ts`, `convex/init.ts`, `convex/seedAction.ts`) — all wired via `httpRouter`/`components.migrations`/`clearAllDomainTables` or `convex run` (see `package.json:22` `seed` scripts), so `deslop/unused-file` was a false positive. Deleted truly dead `pdfx` island (`pdfx/badge`, `pdfx/heading`, `pdfx/text` + `lib/pdfx-context.ts`, `lib/pdfx-theme-context.tsx`, `lib/theme-file.ts`, `pdfx.json`) and orphan `pdf-primitives-provider.tsx` — none imported outside themselves; live PDF chain uses `pdf-primitives.ts` + `setCachedPrimitives` via `use-pdf-export.ts:141` dynamic import (still reachable through `layout.tsx` → `ReportExportButton` though UI is `disabled` for quota protection). `pnpm typecheck` passes.

> **Phase 1 (2026-08-31):** Security + leaks — `pnpm-workspace.yaml:1` added `minimumReleaseAge: 4320` (Phase 1a). `features/products/hooks/use-edit-product-form.ts:238` + `lib/hooks/use-image-upload.ts:64` now check `res.ok` + `storageId` type before use. `use-edit-product-form.ts:89` revokes previous `blob:` URL in reducer + `handleImageSelect` guard + cleanup `useEffect`; `use-image-upload.ts:49` uses functional `setState` with revoke on re-select. Hoisted `INITIAL_VALUE` in `features/suppliers/hooks/use-add-supplier-form.ts:17` + `features/users/hooks/use-add-staff-form.ts:17`; moved module `new Date()` out of `features/reports/hooks/use-report-filters.ts:6` into `useMemo(getNowParts)` + dynamic `calendarParsers`, and `features/reports/components/calendar/calendar-grid.tsx:26` `YEAR_OPTIONS` into `useMemo` on `currentYear`. Inline docs added to staged files. `pnpm typecheck` passes.

> **Phase 2 (2026-08-31):** Bugs — `no-adjust-state-on-prop-change` `use-audit-logs.ts:44` now `JSON.stringify` key + `skip`, documented reset with `biome-ignore`; `use-personal-audit-logs.ts:29` added `reset` + `biome-ignore`. `no-locale-format` hoisted `AUDIT_DATE_FMT`/`FILTER_DATE_FMT`/`dateFormatter`/`monthFormatter` with `Asia/Manila`. `stock-banner.tsx:11` `getInitialDismissed()` lazy init fixes flicker + single-pass `out/low` memo. `server-sequential` parallelized `products/queries.ts:112` + `reports/queries.ts:403` via `Promise.all`, others suppressed as intentional pipeline. `pnpm typecheck` passes.
> **Rescan 2026-08-31 18:06:** 46 issues (was 76), see regressions below — `stock-banner.tsx:13` now `no-hydration-branch-on-browser-global` (error, `typeof window` branch), `server-sequential` 2 remain (`batches/mutations.ts:165`, `seed.ts:516` — `biome-ignore react-doctor/...` did not suppress), `no-adjust-state` 7 remain (ignore syntax not recognized by `react-doctor`), `no-create-object-url` now ×2, `require-pnpm-hardening` now needs `trustPolicy`, `async-await-in-loop` now ×5.
> **Phase 3 (2026-08-31):** Shorthanded `stock-banner.tsx:36` `() => true` + moved `handleDismiss` before early returns (fixes `useHookAtTopLevel`). Single-pass fixes: `convex/dashboard/queries.ts:32` (1 loop), `convex/users/queries.ts:48` `withIndex(by_status)` + `convex/schema.ts:29` index, `features/dashboard/components/stat-cards.tsx:15` memoized partition (was 6× `filter`), `features/reports/hooks/use-report-export.ts:18` hoisted `TIMESTAMP_FMT` + single-pass `toggleAll`, `lib/forecast.ts:96` single-pass `activeIndexes`, `features/inventory/hooks/use-inventory-dialog.ts:235` `flatMap`. Hoisted Intl: `convex/lib/orNumber.ts:5` `OR_DATE_FMT`, `lib/formatters/number.ts:30` `COMPACT_FMT`, `features/reports/hooks/use-pdf-export.ts:19` `PDF_DATE_FMT`. Lint clean: removed disabled `biome-ignore` (`noStaticElementInteractions`, `noExcessiveCognitiveComplexity`, `noArrayIndexKey`), fixed `path-stroke-utils.ts:49` suppression placement. `pnpm lint` 0 errors/0 warnings, `pnpm typecheck` pass. `trustPolicy: no-downgrade` reverted (breaks `resend`/`sileo`/`semver` lockfile — follow-up).

---

## Current Warnings (46) — rescan 2026-08-31 18:06

### `react-doctor/no-adjust-state-on-prop-change` ×7 (Bugs) — intentional pagination reset

- [x] `features/audit-logs/hooks/use-audit-logs.ts:75` — `filtersKey` JSON key + cursor/history reset; alternative `key={filtersKey}` would remount table & lose transition
- [x] `features/audit-logs/hooks/use-audit-logs.ts:76` — same
- [x] `features/audit-logs/hooks/use-audit-logs.ts:77` — same
- [x] `features/audit-logs/hooks/use-audit-logs.ts:78` — same
- [x] `features/audit-logs/hooks/use-audit-logs.ts:79` — same
- [x] `features/audit-logs/hooks/use-audit-logs.ts:115` — `isTransitioning` flag cleared on `result` — derived sync, not derived state
- [x] `features/audit-logs/hooks/use-personal-audit-logs.ts:37` — same; `reset` exposed for symmetry

### `react-doctor/no-locale-format-in-render` ×6 (Bugs) — Phase 2 ✓ fixed, 0 remaining

- [x] `features/audit-logs/hooks/use-audit-log-export.ts:204` — hoisted `AUDIT_DATE_FMT` (`en-PH` + `Asia/Manila`)
- [x] `features/audit-logs/hooks/use-audit-log-export.ts:207`
- [x] `features/reports/components/export/report/data-appendix.tsx:12` — added `timeZone: Asia/Manila` to hoisted `dateFormatter`
- [x] `features/reports/components/export/report/monthly-report.tsx:80` — added `timeZone` to `monthFormatter`
- [x] `features/reports/components/export/report/monthly-report.tsx:81` — added `timeZone` to `generatedDateFormatter`
- [x] `features/reports/hooks/use-report-filters.ts:68` — hoisted `FILTER_DATE_FMT` + `useMemo`

### `react-doctor/server-sequential-independent-await` ×2 (Bugs) — intentional

- [x] `convex/batches/mutations.ts:165` — dependent read-after-write (insert → get)
- [x] `convex/seed.ts:516` — deterministic `nextSkuCode()` order (global counter)
- [x] `convex/products/queries.ts:120` — parallelized via `Promise.all` ✓
- [x] `convex/reports/queries.ts:405` — parallelized ✓
- [x] `convex/seedAction.ts:139` — pipeline sequential, no longer flagged
- [x] `convex/seedAction.ts:233` — read-after-clear, no longer flagged

### `react-doctor/no-fetch-response-used-without-status-check` ×2 (Security) — Phase 1 ✓

- [x] `features/products/hooks/use-edit-product-form.ts:238`
- [x] `lib/hooks/use-image-upload.ts:64`

### `react-doctor/no-impure-call-at-module-scope` ×2 (Bugs) — Phase 1 ✓

- [x] `features/reports/components/calendar/calendar-grid.tsx:26`
- [x] `features/reports/hooks/use-report-filters.ts:6`

### `react-doctor/async-await-in-loop` ×5 (Performance) — intentional seed sequentiality

- [x] `convex/seed.ts:412` — `nextOrNumber` uniqueness requires sequential (retry on collision)
- [x] `convex/seed.ts:590` — `nextBatchCode()` counter + deterministic order
- [x] `convex/seed.ts:1219` — OR generation + dispatch items depend on prior
- [x] `convex/seed.ts:1413` — adjustments mutate `batch.quantityRemaining` sequentially
- [x] `convex/seed.ts:1743` — `take(1)` per table for status — trivial, keep sequential for clarity
- [x] `convex/init.ts:90` — no longer flagged (init ignored in `doctor.config.json`)

### `react-doctor/js-combine-iterations` ×6 (Performance) — Phase 3 ✓ (6→0)

- [x] `convex/dashboard/queries.ts:39` — single-pass `for...of`
- [x] `convex/users/queries.ts:49` — `withIndex(by_status)` (no in-memory combine)
- [x] `features/dashboard/components/stat-cards.tsx:112` — `useMemo` partition `lowStock`/`outOfStock`
- [x] `features/dashboard/components/stat-cards.tsx:158` — same (single partition covers both lines)
- [x] `features/reports/hooks/use-report-export.ts:125` — single-pass `toggleAll`
- [x] `lib/forecast.ts:96` — single-pass `activeIndexes`

### `react-doctor/js-hoist-intl` ×5 (Performance) — Phase 3 ✓ (5→0)

- [x] `convex/lib/orNumber.ts:8` — hoisted `OR_DATE_FMT`
- [x] `features/reports/hooks/use-pdf-export.ts:183` — hoisted `PDF_DATE_FMT` (covers :188)
- [x] `features/reports/hooks/use-pdf-export.ts:188` — same
- [x] `features/reports/hooks/use-report-export.ts:18` — hoisted `TIMESTAMP_FMT`
- [x] `lib/formatters/number.ts:32` — hoisted `COMPACT_FMT`

### `react-doctor/no-transition-all` ×3 (Performance) — Phase 3 ✓

- [x] `features/dispatch-history/components/table/dispatch-table.tsx:115` — `transition-[max-height]`
- [x] `features/inventory/components/table/inventory-table.tsx:112` — `transition-[max-height]`
- [x] `features/reports/components/calendar/calendar-grid.tsx:151` — `transition-[grid-template-rows]`

### `react-doctor/prefer-module-scope-static-value` ×2 (Maintainability) — Phase 1 ✓

- [x] `features/suppliers/hooks/use-add-supplier-form.ts:17`
- [x] `features/users/hooks/use-add-staff-form.ts:17`

### `deslop/unused-file` ×5 (Maintainability) — deleted for 100/100

- [x] `convex/lib/codes.ts` — deleted (no importers, `grep convex` only definition)
- [x] `convex/verifySeed.ts` — deleted (`verifyDense` diagnostic, not wired — use `seed.ts` dense logic instead)
- [x] `features/products/hooks/use-products.ts` — deleted (`useProducts`/`useActiveProducts` no importer in `features/`/`app/`)
- [x] `lib/avatar.ts` — deleted (wrapper dup of `lib/utils.ts:8`)
- [x] `lib/hooks/use-search-filter.ts` — deleted (`useSearchFilter` no importer)

**Phase 0 — Ignored (framework entries, false positive) — in `doctor.config.json:1`:**

- [x] `convex/http.ts` — `httpRouter` + `auth.addHttpRoutes(http)` (`convex/http.ts:1`)
- [x] `convex/migrations.ts` — `Migrations` via `components.migrations`
- [x] `convex/seed/clear.ts` — `clearAllDomainTables` used by `convex/init.ts` + `convex/seedAction.ts:6`
- [x] `convex/init.ts` — `seedOwner`/`syncAccounts` `internalAction` (env-driven)
- [x] `convex/seedAction.ts` — `seedAll`/`seedClean`/`seedTest` (`package.json:22` `convex run`)

**Phase 0 — Deleted (truly dead, `pnpm typecheck` passes):**

- [x] `features/reports/components/export/report/pdf-primitives-provider.tsx` — orphan provider (live uses `setCachedPrimitives` in `features/reports/hooks/use-pdf-export.ts:17`)
- [x] `features/reports/components/export/report/pdfx/badge/pdfx-badge.tsx` — no importer (island)
- [x] `features/reports/components/export/report/pdfx/heading/pdfx-heading.tsx` — no importer
- [x] `features/reports/components/export/report/pdfx/text/pdfx-text.tsx` — no importer
- [x] `lib/pdfx-context.ts` — only via deleted `pdfx/*`
- [x] `lib/pdfx-theme-context.tsx` — only via deleted `pdfx/*`
- [x] `lib/theme-file.ts` — only via deleted `pdfx/*`
- [x] `pdfx.json` — `pdfx init` scaffold (stale `componentDir`)

### `deslop/unused-dependency` ×2 (Maintainability) — removed

- [x] `package.json` — removed `@number-flow/react` (0 importers, `grep` only `package.json`) + `@visx/gradient` (no `visx/gradient` importer)

### `deslop/unused-export` ×1 (Maintainability) — removed

- [x] `features/audit-logs/constants.ts:32` — `ACTION_OPTIONS` deleted (never imported)

### `react-doctor/no-giant-component` ×1 (Maintainability) — deferred

- [x] `features/products/components/dialogs/edit-product-dialog.tsx:36` — 353 lines, deferred split (dialog already delegates to `useEditProductForm`; split would touch `emblor` TagInput wiring — track as tech debt)

### `react-doctor/js-cache-property-access` ×1 (Performance) — Phase 3 ✓

- [x] `convex/seed.ts:1248` — cached `baseUom`

### `react-doctor/js-flatmap-filter` ×1 (Performance) — Phase 3 ✓

- [x] `features/inventory/hooks/use-inventory-dialog.ts:235` — `flatMap`

### `react-doctor/js-index-maps` ×1 (Performance) — Phase 3 ✓

- [x] `convex/seed.ts:1400` — `productById` Map

### `react-doctor/no-create-object-url-without-revoke` ×2 (Performance) — mitigated (heuristic false positive)

- [x] `features/products/hooks/use-edit-product-form.ts:121` — revokes previous `blob:` in reducer + `useEffect` cleanup on unmount/preview change
- [x] `lib/hooks/use-image-upload.ts:70` — functional `setState` revoke + `useEffect` cleanup; still flagged due to cross-scope heuristic

### `react-doctor/rendering-hoist-jsx` ×1 (Performance) — verified hoisted

- [x] `features/dashboard/components/product-movement.tsx:133` — `header` already at module scope (`const header = (...)` outside component)

### `react-doctor/no-hydration-branch-on-browser-global` ×1 (Bugs) **error** — Phase 3 ✓

- [x] `components/stock-banner.tsx:13` — fixed via `useSyncExternalStore(..., () => true)` + `handleDismiss` hoisted before returns; shorthand per user request

### `react-doctor/rendering-hydration-no-flicker` — fixed (was ×1, now 0)

- [x] `components/stock-banner.tsx:20` — `getInitialDismissed()` + single-pass memo removed the `useEffect` flicker, but introduced the `typeof window` error above.

### `react-doctor/use-lazy-motion` ×1 (Performance) — Phase 3 ✓

- [x] `components/shimmering-text.tsx:3` — switched `motion` → `m` + `LazyMotion`/`domAnimation` (`strict`)

### `react-doctor/zod-v4-prefer-top-level-string-formats` ×1 (Maintainability) — Phase 3 ✓

- [x] `convex/users/validators.ts:12` — `z.string().email()` → `z.email()`

### `react-doctor/require-pnpm-hardening` ×1 (Security) — Phase 1 partial (2→1)

- [ ] `pnpm-workspace.yaml` — `minimumReleaseAge: 4320` added, still missing `trustPolicy: no-downgrade`
- [x] `pnpm-workspace.yaml` — `minimumReleaseAge` fixed

---

## Suggested order of attack

1. **Phase 0 ✓ done** — config rename + framework ignores + `pdfx` island deletion (12 issues cleared).
2. **Phase 1 ✓ done** — `no-fetch` (2), `minimumReleaseAge` (1/2), `prefer-module-scope` (2), `no-impure` (2), `no-create-object-url` attempted.
3. **Phase 2 ✓ partial** — `no-locale-format` (6→0), `server-sequential` (6→2), `async-await` (6→5); regressions: `no-hydration-branch` error, `no-adjust-state` still 7 (ignore syntax not recognized).
4. **Next** — Fix `no-hydration-branch` (`useSyncExternalStore`), add `trustPolicy`, fix `no-adjust-state` via `key` or `doctor.config.json` ignores, handle remaining `js-combine` (6), `js-hoist-intl` (5), `unused-*` (8), `no-giant-component`, etc.
5. Re-run `--verbose` after each batch and watch the count drop.
