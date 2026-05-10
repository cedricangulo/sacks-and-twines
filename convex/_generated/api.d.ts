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
} from "convex/server"
import type * as auth from "../auth.js"
import type * as http from "../http.js"
import type * as init from "../init.js"
import type * as migrations from "../migrations.js"
import type * as suppliers_mutations from "../suppliers/mutations.js"
import type * as suppliers_queries from "../suppliers/queries.js"
import type * as users_mutations from "../users/mutations.js"
import type * as users_queries from "../users/queries.js"

declare const fullApi: ApiFromModules<{
  auth: typeof auth
  http: typeof http
  init: typeof init
  migrations: typeof migrations
  "suppliers/mutations": typeof suppliers_mutations
  "suppliers/queries": typeof suppliers_queries
  "users/mutations": typeof users_mutations
  "users/queries": typeof users_queries
}>

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
>

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
>

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">
}
