"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Product { id?: string; name: string; description: string; pricing: number; category: string; }

export default function PricingAgentPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState({ currency: "USD", show_prices: true, allow_discounts: true });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);
      const [{ data: cfg }, { data: prods }] = await Promise.all([
        supabase.from("agent_configs").select("settings").eq("business_id", biz.id).eq("agent_type", "pricing").single(),
        supabase.from("products").select("*").eq("business_id", biz.id).order("created_at"),
      ]);
      if (cfg?.settings && Object.keys(cfg.settings).length > 0) setSettings((p) => ({ ...p, ...(cfg.settings as typeof settings) }));
      if (prods) setProducts(prods);
      setLoading(false);
    };
    load();
  }, []);

  const addProduct = () => setProducts((p) => [...p, { name: "", description: "", pricing: 0, category: "General" }]);
  const removeProduct = (i: number) => setProducts((p) => p.filter((_, pi) => pi !== i));
  const updateProduct = (i: number, field: keyof Product, val: string | number) =>
    setProducts((p) => p.map((prod, pi) => pi === i ? { ...prod, [field]: val } : prod));

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("agent_configs").upsert({ business_id: businessId, agent_type: "pricing", enabled: true, settings }, { onConflict: "business_id,agent_type" });
    // Upsert products
    for (const prod of products.filter((p) => p.name.trim())) {
      if (prod.id) {
        await supabase.from("products").update({ name: prod.name, description: prod.description, pricing: prod.pricing, category: prod.category }).eq("id", prod.id);
      } else {
        await supabase.from("products").insert({ business_id: businessId, ...prod });
      }
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <div><h1 className="text-2xl font-bold">Product & Pricing Agent</h1><p className="text-muted-foreground text-sm">Manage your products and pricing catalog</p></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Currency</label>
            <select value={settings.currency} onChange={(e) => setSettings((p) => ({ ...p, currency: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {["USD", "EUR", "GBP", "INR", "AUD", "CAD"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Show Prices in Chat</p><p className="text-xs text-muted-foreground">Display actual pricing during conversations</p></div>
            <button onClick={() => setSettings((p) => ({ ...p, show_prices: !p.show_prices }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.show_prices ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.show_prices ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Product Catalog</CardTitle>
            <Button size="sm" variant="outline" onClick={addProduct}><Plus size={14} className="mr-1" />Add Product</Button>
          </div>
          <CardDescription>Products the AI can recommend and quote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No products yet. Add your first product.</p>}
          {products.map((prod, i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={prod.name} onChange={(e) => updateProduct(i, "name", e.target.value)} placeholder="Product name"
                  className="px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <input type="number" value={prod.pricing} onChange={(e) => updateProduct(i, "pricing", +e.target.value)} placeholder="Price"
                    className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeProduct(i)}><Trash2 size={14} /></Button>
                </div>
              </div>
              <input value={prod.description} onChange={(e) => updateProduct(i, "description", e.target.value)} placeholder="Description"
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : saved ? "✓ Saved!" : <><Save size={16} className="mr-2" />Save Settings</>}
      </Button>
    </div>
  );
}
