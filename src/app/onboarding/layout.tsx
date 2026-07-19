import { Bot } from "lucide-react";
import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot size={15} />
            </div>
            SalesOS
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        {children}
      </main>
    </div>
  );
}
