import { Spinner } from "./ui/spinner";

export default function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-linear-to-br from-background via-background to-muted/40">
      <div className="flex flex-col items-center justify-center gap-y-4 text-center">
        <Spinner className="size-8" />
        <p className="type-base text-muted-foreground">New Michael's</p>
        <h1 className="type-2xl">Sacks and Twines</h1>
      </div>
    </div>
  );
};