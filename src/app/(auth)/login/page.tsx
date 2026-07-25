"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/dashboard";

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
    router.push(next);
    router.refresh();
  };

  const inputCls = "w-full px-4 py-3 rounded-[16px] border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all duration-200";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="blob absolute -top-32 -left-20 w-96 h-96 rounded-full bg-blue-600 opacity-20" />
        <div className="blob blob-2 absolute bottom-0 right-0 w-80 h-80 rounded-full bg-purple-600 opacity-15" />
      </div>

      <div className="w-full max-w-md fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bos-gradient shadow-lg shadow-blue-500/30 mb-4">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to BOS</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your Business Operating System</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-[28px] p-8 border border-border">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputCls} placeholder="you@company.com" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-12`} placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base rounded-[18px]" disabled={loading}>
              {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Signing in…</> : "Sign In →"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            New to BOS?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">Create your digital branch</Link>
          </div>
        </div>

        {/* Switch */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Not a business owner?</p>
          <Link href="/user-login">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Users size={14} /> Browse businesses as a customer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
