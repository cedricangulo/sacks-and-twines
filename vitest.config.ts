import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` alias in tsconfig.json. Required because the feature
    // validation modules import through `@/lib/validation` and
    // `@/convex/_generated/dataModel`; without this they fail to resolve under
    // Vitest. Convex function tests all use relative imports and were unaffected.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "edge-runtime",
    // Convex test module maps load cold on the first test of each file; the
    // default 5s timeout is too low and causes flaky timeouts that can pollute
    // shared mocks for subsequent tests.
    testTimeout: 20000,
  },
})
