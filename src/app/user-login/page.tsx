"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function UserLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    router.push("/explore");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-violet-100/30 dark:from-violet-950/20 dark:via-background dark:to-violet-900/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-violet-600 px-6 py-8 text-center text-white">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Store size={28} />
            </div>
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-white/80 text-sm mt-1">Browse and discover amazing local businesses</p>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="you@email.com" required autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="••••••••" required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={loading}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Signing in…</> : "Sign In & Explore"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/user-signup" className="text-violet-600 hover:underline font-medium">Create free account</Link>
            </p>

            {/* Switch to business login */}
            <div className="border-t pt-4">
              <p className="text-center text-xs text-muted-foreground mb-2">Own a business?</p>
              <Link href="/login">
                <Button variant="outline" className="w-full gap-2">
                  Business Owner Login →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
