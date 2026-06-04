import type { MetadataRoute } from "next"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sacks-and-twines.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/dashboard",
          "/products",
          "/inventory",
          "/dispatch-history",
          "/reports",
          "/suppliers",
          "/users",
          "/audit-logs",
          "/audit-logs/personal",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
