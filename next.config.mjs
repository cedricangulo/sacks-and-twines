/** @type {import('next').NextConfig} */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexHostName = convexUrl ? new URL(convexUrl).hostname : ""

// Convex storage image URLs are served from `<deployment>.convex.cloud`,
// and the deployment slug can differ from NEXT_PUBLIC_CONVEX_URL (e.g. preview
// deployments). Allow the whole convex.cloud storage host so next/image never
// rejects a valid storage URL at runtime.
const storageRemotePatterns = [
  {
    protocol: "https",
    hostname: "*.convex.cloud",
    pathname: "/api/storage/**",
  },
]

if (convexHostName && !convexHostName.endsWith(".convex.cloud")) {
  storageRemotePatterns.push({
    protocol: "https",
    hostname: convexHostName,
    pathname: "/api/storage/**",
  })
}

const nextConfig = {
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: storageRemotePatterns,
  },
  // TODO: Revisit CSP — origins need auditing for Convex CDN, storage, etc.
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         { key: "X-Frame-Options", value: "DENY" },
  //         { key: "X-Content-Type-Options", value: "nosniff" },
  //         { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  //         {
  //           key: "Content-Security-Policy",
  //           value:
  //             "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src 'none'; object-src 'none'",
  //         },
  //         {
  //           key: "Strict-Transport-Security",
  //           value: "max-age=63072000; includeSubDomains; preload",
  //         },
  //         {
  //           key: "Permissions-Policy",
  //           value: "camera=(), microphone=(), geolocation=()",
  //         },
  //       ],
  //     },
  //   ]
  // },
}

export default nextConfig
