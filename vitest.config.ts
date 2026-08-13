import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "edge-runtime",
    // Convex test module maps load cold on the first test of each file; the
    // default 5s timeout is too low and causes flaky timeouts that can pollute
    // shared mocks for subsequent tests.
    testTimeout: 20000,
  },
})
