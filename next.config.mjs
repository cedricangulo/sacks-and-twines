/** @type {import('next').NextConfig} */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexHostName = convexUrl ? new URL(convexUrl).hostname : ""

const nextConfig = {
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: convexHostName,
        pathname: "/api/storage/**",
      },
    ],
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
