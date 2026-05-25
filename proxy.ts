import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server"
import { jwtDecode } from "jwt-decode"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/inventory(.*)",
  "/products(.*)",
  "/suppliers(.*)",
  "/users(.*)",
  "/audit-logs(.*)",
])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedRoute(request)) {
    if (!(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/sign-in")
    }

    const token = await convexAuth.getToken()
    if (!token) {
      return nextjsMiddlewareRedirect(request, "/sign-in")
    }

    let role: string | undefined
    try {
      const decoded = jwtDecode<{ role?: string }>(token)
      role = decoded?.role
    } catch {
      return nextjsMiddlewareRedirect(request, "/sign-in")
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-role", role ?? "")
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
}
