import Link from "next/link";
import { Bot, Phone, Calendar, QrCode, Sparkles, Zap, Shield, BarChart3, Globe, Store, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* ── Header ── */}
      <header className="border-b sticky top-0 z-50 backdrop-blur bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bos-gradient shadow-md shadow-blue-500/25">
              <Zap size={16} className="text-white" />
            </div>
            <span className="bos-gradient-text">BOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How it works</Link>
            <Link href="/user-login">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Store size={14} /> Browse Businesses
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Building2 size={14} /> Business Login
              </Button>
            </Link>
            <Link href="/signup"><Button size="sm">Get Started Free</Button></Link>
          </nav>
          <div className="flex md:hidden gap-2">
            <Link href="/user-login"><Button variant="ghost" size="sm">Explore</Button></Link>
            <Link href="/login"><Button variant="outline" size="sm">Business</Button></Link>
            <Link href="/signup"><Button size="sm">Sign Up</Button></Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="container mx-auto px-4 py-24 text-center relative overflow-hidden">
        {/* Blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob absolute -top-20 left-1/4 w-72 h-72 rounded-full bg-blue-500 opacity-15 dark:opacity-20" />
          <div className="blob blob-2 absolute top-10 right-1/4 w-64 h-64 rounded-full bg-purple-500 opacity-10 dark:opacity-15" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm mb-8 bg-primary/5 dark:bg-primary/10">
          <Sparkles size={14} className="text-primary" />
          <span>AI Assistant · Appointments · Voice · Analytics</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          Your Business&apos;s{" "}
          <span className="bos-gradient-text">Digital Branch.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          BOS is an AI-powered Business Operating System. Build your digital identity, manage operations, deploy an AI assistant, and share it with anyone — in under 5 minutes.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/signup">
            <Button variant="glow" size="xl" className="gap-2">
              <Building2 size={16} /> Build My Digital Branch
            </Button>
          </Link>
          <Link href="/user-signup">
            <Button size="xl" variant="outline" className="gap-2">
              <Store size={16} /> Browse Businesses
            </Button>
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { label: "Setup time", value: "< 5 min" },
            { label: "No code", value: "Required" },
            { label: "Channels", value: "Chat + Voice + Book" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it looks ── */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-sm mx-auto rounded-2xl border shadow-2xl overflow-hidden bg-card">
          <div className="h-12 bg-primary flex items-center px-4 gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">SmileCare Dental</p>
              <p className="text-white/70 text-xs">AI Receptionist · Online</p>
            </div>
          </div>
          <div className="p-4 space-y-3 bg-background">
            <div className="bg-muted rounded-2xl rounded-tl-sm p-3 text-sm max-w-[85%]">
              Hi! I&apos;m the AI receptionist for SmileCare. How can I help you today?
            </div>
            <div className="bg-primary text-white rounded-2xl rounded-tr-sm p-3 text-sm max-w-[85%] ml-auto">
              What&apos;s the cost of teeth whitening?
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm p-3 text-sm max-w-[85%]">
              Teeth whitening is ₹7,000 and takes about 45 minutes. Would you like to book a slot?
            </div>
          </div>
          <div className="p-4 border-t grid grid-cols-3 gap-2">
            {[
              { icon: Bot, label: "Chat AI" },
              { icon: Phone, label: "Voice AI" },
              { icon: Calendar, label: "Book" },
            ].map(({ icon: Icon, label }) => (
              <button key={label} className="flex flex-col items-center gap-1 p-2 rounded-lg border text-xs hover:bg-muted transition-colors">
                <Icon size={16} className="text-primary" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          agentos.ai/<span className="font-mono font-semibold">smilecare</span>
        </p>
      </section>

      {/* ── Features ── */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything your business needs</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          One page. Three channels. Infinite conversations.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Bot,
              title: "AI Chat Assistant",
              desc: "Answers questions, recommends services, collects leads — using your business knowledge base.",
              color: "bg-indigo-500/10 text-indigo-500",
            },
            {
              icon: Phone,
              title: "AI Voice Receptionist",
              desc: "Customers click 'Call AI' and have a full voice conversation, just like calling a real receptionist.",
              color: "bg-emerald-500/10 text-emerald-500",
            },
            {
              icon: Calendar,
              title: "Smart Appointment Booking",
              desc: "Customers see real-time availability and book, reschedule, or cancel — no human needed.",
              color: "bg-amber-500/10 text-amber-500",
            },
            {
              icon: QrCode,
              title: "QR Code & Shareable Link",
              desc: "Get a custom URL and QR code to put on business cards, storefront, or social media.",
              color: "bg-blue-500/10 text-blue-500",
            },
            {
              icon: BarChart3,
              title: "Analytics Dashboard",
              desc: "Track visitors, chats, voice calls, bookings, leads, and conversion rates in real time.",
              color: "bg-purple-500/10 text-purple-500",
            },
            {
              icon: Shield,
              title: "Business Knowledge (RAG)",
              desc: "Upload PDFs, docs, FAQs, price lists. The AI learns your business and answers accurately.",
              color: "bg-pink-500/10 text-pink-500",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg mb-4 ${f.color}`}>
                <f.icon size={24} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Live in 3 steps</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Create your business page", desc: "Sign up, fill in your business info, upload your knowledge docs and services." },
              { step: "02", title: "Configure your AI assistant", desc: "Pick a personality, greeting, enable chat/voice/booking — no code required." },
              { step: "03", title: "Share with customers", desc: "Share your link, show your QR code, or embed the widget on your website." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-5xl font-black text-primary/20 mb-3">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to deploy your AI receptionist?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Any business can go live in minutes. No developers. No monthly maintenance. Just AI that works for you 24/7.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2 px-10">
              Start for Free <Sparkles size={16} />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AgentOS. The AI receptionist for every business.
        </div>
      </footer>
    </div>
  );
}
