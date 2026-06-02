import migrations from "@convex-dev/migrations/convex.config.js"
import rateLimiter from "@convex-dev/rate-limiter/convex.config"
import { defineApp } from "convex/server"

// Registers third-party Convex components (migrations, rate limiter).
const app = defineApp()
app.use(migrations)
app.use(rateLimiter)

export default app
