"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Check, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function UserSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);

    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "user" },
        emailRedirectTo: `${window.location.origin}/auth/callback?role=user`,
      },
    });

    if (authErr) { setError(authErr.message); setLoading(false); return; }

    if (data.session) {
      // Upsert user profile
      await supabase.from("user_profiles").upsert({
        id: data.user!.id,
        email,
        full_name: fullName,
        role: "user",
      });
      router.push("/explore");
      router.refresh();
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-violet-100/30 p-4">
        <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center mx-auto">
            <Check size={32} className="text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/user-login">
            <Button variant="outline" className="w-full mt-2">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-violet-100/30 dark:from-violet-950/20 dark:via-background dark:to-violet-900/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-violet-600 px-6 py-8 text-center text-white">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Store size={28} />
            </div>
            <h1 className="text-2xl font-bold">Join as a Customer</h1>
            <p className="text-white/80 text-sm mt-1">Discover and connect with local AI-powered businesses</p>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Your Name" required
                />
              </div>
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
                    placeholder="Min. 6 characters" required autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={loading}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Creating account…</> : "Create Account & Explore →"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By signing up you agree to our Terms of Service.
              </p>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/user-login" className="text-violet-600 hover:underline font-medium">Sign in</Link>
            </p>

            {/* Switch to business signup */}
            <div className="border-t pt-4">
              <p className="text-center text-xs text-muted-foreground mb-2">Have a business?</p>
              <Link href="/signup">
                <Button variant="outline" className="w-full gap-2">
                  Create Business Account →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
