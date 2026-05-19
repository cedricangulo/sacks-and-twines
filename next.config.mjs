/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "necessary-sardine-898.convex.cloud",
        pathname: "/api/storage/**",
      },
    ],
  },
}

export default nextConfig
