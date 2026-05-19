# Rate Limiter

This document explains the rate limits in `convex/rate_limiter.ts` in non-technical language(para sayo).

## What is a rate limit?

A rate limit prevents the system from being overwhelmed. It sets a maximum
number of times a specific action can happen within a minute. Think of it like a
turnstile — only so many people can pass through per minute.

## Per-user vs. Global

- **Per-user**: Each person using the system has their own separate limit. If
  the limit is 5 per minute, _each_ user can do it 5 times per minute.
- **Global**: The limit applies to _everyone combined_. No matter how many users
  are active, the total across all users cannot exceed this number.

## How "token bucket" works

Imagine a bucket that holds tokens. The bucket refills at a steady rate (the
"sustained" column). Every time the action happens, a token is taken out. If you
don't use any tokens for a while, the bucket fills up to its "burst" capacity —
this lets you do several actions in quick succession when needed.

**Example**: 5 per minute sustained, burst of 10. Normally you can do 5 per
minute. But if you do nothing for 2 minutes, the bucket fills to 10 — you can
then do 10 in one go and the bucket will be empty again.

## All Limits

| Limit Name              | What It Controls                              | Scope    | Sustained | Burst |
| ----------------------- | --------------------------------------------- | -------- | --------- | ----- |
| `createUser`            | Creating a staff account                      | Per user | 5/min     | 10    |
| `deactivateUser`        | Deactivating a staff account                  | Per user | 20/min    | 40    |
| `createSupplier`        | Adding a new supplier                         | Per user | 20/min    | 40    |
| `updateSupplier`        | Editing a supplier                            | Per user | 30/min    | 60    |
| `archiveSupplier`       | Archiving a supplier                          | Per user | 15/min    | 30    |
| `archiveProduct`        | Archiving a product                           | Per user | 15/min    | 30    |
| `createBatch`           | Recording stock-in (a batch)                  | Per user | 30/min    | 60    |
| `updateBatch`           | Editing a batch                               | Per user | 30/min    | 60    |
| `voidBatch`             | Cancelling a batch                            | Per user | 15/min    | 30    |
| `generateUploadUrl`     | Generating a file upload link                 | Per user | 20/min    | 40    |
| `createDispatch`        | Creating a dispatch (coming soon)             | Per user | 20/min    | 40    |
| `voidDispatch`          | Cancelling a dispatch (coming soon)           | Per user | 10/min    | 20    |
| `createStockAdjustment` | Recording a stock adjustment (coming soon)    | Per user | 30/min    | 60    |
| `globalCreateUser`      | Total staff creations (all users combined)    | Global   | 10/min    | 20    |
| `globalCreateSupplier`  | Total supplier additions (all users combined) | Global   | 50/min    | 100   |
| `globalMutations`       | Any write operation — catch-all safety net    | Global   | 120/min   | 240   |

## Important Notes

- **All values are intentionally generous**. The plan is to tighten them after
  seeing real-world usage.
- If a limit is hit, the action is blocked and the user sees a "retry later"
  message.
- Limits with "coming soon" labels are placeholders for features not yet built.
