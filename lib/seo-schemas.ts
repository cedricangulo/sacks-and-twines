const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sacks-and-twines.vercel.app"

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sacks & Twines",
  url: siteUrl,
  description:
    "Manage your inventory of sacks and twines with ease. Track stock levels, manage suppliers, dispatch orders, and generate business reports.",
  inLanguage: "en",
}

export const articleSchema = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "Sacks & Twines — Inventory Management System",
  headline:
    "Sacks & Twines: A Web-Based Inventory Management System for Sacks and Twines Enterprises",
  description:
    "Manage your inventory of sacks and twines with ease. Track stock levels, manage suppliers, dispatch orders, and generate business reports.",
  url: siteUrl,
  author: [
    { "@type": "Person", name: "Guia Cyleen Torres" },
    { "@type": "Person", name: "Catherine Dela Vega" },
    { "@type": "Person", name: "Cedric Bryan Angulo" },
  ],
  creator: [{ "@type": "Person", name: "Cedric Bryan Angulo" }],
  publisher: {
    "@type": "Organization",
    name: "Nueva Ecija University of Science and Technology",
  },
  inLanguage: "en",
}
