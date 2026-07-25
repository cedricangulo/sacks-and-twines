import type { Metadata } from "next"
import ProductsClientLayout from "./_client-layout"

interface Props {
  children: React.ReactNode
}

// TODO: Route is /products but this page manages dispatches, not product CRUD.
// Rename to /dispatch once group agrees on the URL.
export const metadata: Metadata = {
  title: "Dispatch",
  description:
    "Manage product dispatches and orders in the Sacks & Twines inventory system",
  openGraph: {
    title: "Dispatch",
    description:
      "Manage product dispatches and orders in the Sacks & Twines inventory system",
    url: "/products",
  },
  twitter: {
    title: "Dispatch",
    description:
      "Manage product dispatches and orders in the Sacks & Twines inventory system",
  },
  alternates: {
    canonical: "/products",
  },
}

export default function ProductsLayout({ children }: Props) {
  return <ProductsClientLayout>{children}</ProductsClientLayout>
}
