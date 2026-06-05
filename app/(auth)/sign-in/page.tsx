import type { Metadata } from "next"
import SignInForm from "@/features/auth/components/sign-in-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Sacks & Twines account to manage inventory",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In - Sacks & Twines",
    description: "Sign in to your Sacks & Twines account to manage inventory",
    url: "/sign-in",
  },
  twitter: {
    title: "Sign In - Sacks & Twines",
    description: "Sign in to your Sacks & Twines account to manage inventory",
  },
  alternates: {
    canonical: "/sign-in",
  },
}

export default function SignIn() {
  return (
    <main className="flex items-center h-screen gap-6 p-4">
      <div className="hidden md:block relative overflow-hidden w-full max-w-2/4 rounded-(--radius) bg-cover bg-center bg-[url('/sacks-and-twines.jpg')] md:h-full">
        <div className="absolute bottom-0 left-0 w-full h-2/4 bg-linear-to-t from-primary/80 to-primary/0" />
        <h1 className="absolute text-white bottom-4 left-4 type-2xl">
          Sacks and Twines
        </h1>
      </div>
      <div className="grid w-full md:max-w-2/4 place-items-center">
        <SignInForm />
      </div>
    </main>
  )
}
