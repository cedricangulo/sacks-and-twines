/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */


import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auditLogs_mutations from "../auditLogs/mutations.js";
import type * as auditLogs_queries from "../auditLogs/queries.js";
import type * as auth_guards from "../auth/guards.js";
import type * as auth_logAttempt from "../auth/logAttempt.js";
import type * as auth_verify from "../auth/verify.js";
import type * as auth from "../auth.js";
import type * as batches_mutations from "../batches/mutations.js";
import type * as batches_queries from "../batches/queries.js";
import type * as batches_validators from "../batches/validators.js";
import type * as dashboard_queries from "../dashboard/queries.js";
import type * as dispatches_mutations from "../dispatches/mutations.js";
import type * as dispatches_queries from "../dispatches/queries.js";
import type * as dispatches_validators from "../dispatches/validators.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as lib_codes from "../lib/codes.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_csv_escape from "../lib/csv_escape.js";
import type * as lib_fetch_entities from "../lib/fetch_entities.js";
import type * as migrations from "../migrations.js";
import type * as products_mutations from "../products/mutations.js";
import type * as products_queries from "../products/queries.js";
import type * as products_validators from "../products/validators.js";
import type * as rate_limiter from "../rate_limiter.js";
import type * as reports_queries from "../reports/queries.js";
import type * as seed from "../seed.js";
import type * as seedAction from "../seedAction.js";
import type * as server from "../server.js";
import type * as stock_adjustments_mutations from "../stock_adjustments/mutations.js";
import type * as stock_adjustments_queries from "../stock_adjustments/queries.js";
import type * as stock_adjustments_validators from "../stock_adjustments/validators.js";
import type * as suppliers_mutations from "../suppliers/mutations.js";
import type * as suppliers_queries from "../suppliers/queries.js";
import type * as suppliers_validators from "../suppliers/validators.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as users_validators from "../users/validators.js";
import type * as validators_helpers from "../validators/helpers.js";

declare const fullApi: ApiFromModules<{
  "auditLogs/mutations": typeof auditLogs_mutations;
  "auditLogs/queries": typeof auditLogs_queries;
  auth: typeof auth;
  "auth/guards": typeof auth_guards;
  "auth/logAttempt": typeof auth_logAttempt;
  "auth/verify": typeof auth_verify;
  "batches/mutations": typeof batches_mutations;
  "batches/queries": typeof batches_queries;
  "batches/validators": typeof batches_validators;
  "dashboard/queries": typeof dashboard_queries;
  "dispatches/mutations": typeof dispatches_mutations;
  "dispatches/queries": typeof dispatches_queries;
  "dispatches/validators": typeof dispatches_validators;
  http: typeof http;
  init: typeof init;
  "lib/codes": typeof lib_codes;
  "lib/constants": typeof lib_constants;
  "lib/csv_escape": typeof lib_csv_escape;
  "lib/fetch_entities": typeof lib_fetch_entities;
  migrations: typeof migrations;
  "products/mutations": typeof products_mutations;
  "products/queries": typeof products_queries;
  "products/validators": typeof products_validators;
  rate_limiter: typeof rate_limiter;
  "reports/queries": typeof reports_queries;
  seed: typeof seed;
  seedAction: typeof seedAction;
  server: typeof server;
  "stock_adjustments/mutations": typeof stock_adjustments_mutations;
  "stock_adjustments/queries": typeof stock_adjustments_queries;
  "stock_adjustments/validators": typeof stock_adjustments_validators;
  "suppliers/mutations": typeof suppliers_mutations;
  "suppliers/queries": typeof suppliers_queries;
  "suppliers/validators": typeof suppliers_validators;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "users/validators": typeof users_validators;
  "validators/helpers": typeof validators_helpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
