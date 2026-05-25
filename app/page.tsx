import type { Metadata } from "next"
import HomePageClient from "./home-page-client"

export const metadata: Metadata = {
  title: "Sacks and Twines",
  description: "Inventory and dispatch management for Sacks and Twines.",
}

export default function HomePage() {
  return <HomePageClient />
}
