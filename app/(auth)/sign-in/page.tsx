import SignInForm from "@/features/auth/components/sign-in-form"

export default function SignIn() {
  return (
    <main className="flex items-center h-screen gap-6 p-4">
      <div className="hidden md:block relative overflow-hidden w-full max-w-2/4 rounded-(--radius) bg-cover bg-center bg-[url('/sacks-and-twines.jpg')] md:h-full">
        <div className="absolute bottom-0 left-0 w-full h-2/4 bg-linear-to-t from-primary/80 to-primary/0" />
        <h1 className="absolute text-white bottom-4 left-4 type-xl">
          Sacks and Twines
        </h1>
      </div>
      <div className="grid w-full md:max-w-2/4 place-items-center">
        <SignInForm />
      </div>
    </main>
  )
}
