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
  "/dispatch-history(.*)",
  "/users(.*)",
  "/audit-logs(.*)",
  "/audit-logs/personal(.*)",
  "/reports(.*)",
])

const isOwnerOnlyRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/inventory(.*)",
  "/suppliers(.*)",
  "/users(.*)",
  "/reports(.*)",
])

const isSignInPage = createRouteMatcher(["/sign-in"])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/")
  }

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

    if (isOwnerOnlyRoute(request) && role !== "owner") {
      return nextjsMiddlewareRedirect(request, "/products")
    }

    const pathname = request.nextUrl.pathname
    const isAuditLogsOwnerOnly =
      pathname === "/audit-logs" ||
      (pathname.startsWith("/audit-logs/") &&
        !pathname.startsWith("/audit-logs/personal"))
    if (isAuditLogsOwnerOnly && role !== "owner") {
      return nextjsMiddlewareRedirect(request, "/products")
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
