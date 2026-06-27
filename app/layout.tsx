import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google"

import "./globals.css"
import { JsonLd } from "@/components/seo/json-ld"
import { articleSchema, websiteSchema } from "@/lib/seo-schemas"
import { cn } from "@/lib/utils"
import Providers from "./providers"

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sacks-and-twines.vercel.app"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sacks & Twines",
    template: "%s | Sacks & Twines",
  },
  description:
    "Manage your inventory of sacks and twines with ease. Track stock levels, manage suppliers, dispatch orders, and generate business reports — all in one place.",
  keywords: [
    "inventory",
    "sacks",
    "twines",
    "business management",
    "supply chain",
    "stock management",
    "dispatch tracking",
  ],
  authors: [
    { name: "Guia Cyleen Torres" },
    { name: "Catherine Dela Vega" },
    { name: "Cedric Bryan Angulo" },
  ],
  creator: "Cedric Bryan Angulo",
  publisher: "Nueva Ecija University of Science and Technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Sacks & Twines",
    title: "Sacks & Twines",
    description:
      "Manage your inventory of sacks and twines with ease. Track stock levels, manage suppliers, dispatch orders, and generate business reports.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sacks & Twines",
    description:
      "Manage your inventory of sacks and twines with ease — stock tracking, supplier management, dispatch, and reporting.",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(
          "antialiased",
          fontMono.variable,
          "font-sans",
          nunitoSans.variable
        )}
      >
        <body>
          <JsonLd id="website-schema" data={websiteSchema} />
          <JsonLd id="article-schema" data={articleSchema} />
          <Providers>{children}</Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
