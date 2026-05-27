import { httpRouter } from "convex/server"
import { auth } from "./auth"

/** Registers Convex auth HTTP routes for credential-based authentication. */
const http = httpRouter()

auth.addHttpRoutes(http)

export default http
