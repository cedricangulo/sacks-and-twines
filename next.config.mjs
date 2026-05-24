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
}

export default nextConfig
