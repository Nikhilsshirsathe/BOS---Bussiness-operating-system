"use client";

import { useState } from "react";
import { useServices } from "@/lib/hooks/use-data";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Loader2, Star, RefreshCw, GripVertical } from "lucide-react";
import type { Service } from "@/types";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD"];

interface ServiceFormData {
  id?: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  duration_minutes: number;
  category: string;
  is_active: boolean;
}

const blank = (): ServiceFormData => ({
  name: "", description: "", price: "", currency: "INR",
  duration_minutes: 30, category: "", is_active: true,
});

export default function ServicesPage() {
  const { fetchBusiness, business } = useAppStore();
  const { services, loading, refetch, save, remove } = useServices();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ServiceFormData>(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  const startEdit = (svc?: Service) => {
    if (svc) {
      setForm({
        id: svc.id,
        name: svc.name,
        description: svc.description ?? "",
        price: svc.price != null ? String(svc.price) : "",
        currency: svc.currency,
        duration_minutes: svc.duration_minutes,
        category: svc.category ?? "",
        is_active: svc.is_active,
      });
      setEditingId(svc.id);
    } else {
      setForm(blank());
      setEditingId("new");
    }
  };

  const cancelEdit = () => { setEditingId(null); setForm(blank()); };

  const handleSave = async () => {
    if (!form.name.trim() || !business?.id) return;
    setSaving(true);
    await save({
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price !== "" ? parseFloat(form.price) : null,
      currency: form.currency,
      duration_minutes: form.duration_minutes,
      category: form.category.trim() || null,
      is_active: form.is_active,
    } as Partial<Service> & { name: string });
    setSaving(false);
    cancelEdit();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await remove(id);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage what your business offers — shown on your public page and used for booking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
          {editingId === null && (
            <Button size="sm" onClick={() => startEdit()}>
              <Plus size={14} className="mr-1.5" />Add Service
            </Button>
          )}
        </div>
      </div>

      {/* ── Add / Edit Form ── */}
      {editingId !== null && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">{editingId === "new" ? "New Service" : "Edit Service"}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium block mb-1">Service Name <span className="text-destructive">*</span></label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Teeth Whitening"
                  className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium block mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the service…" rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Price (leave blank for "Contact us")</label>
                <div className="flex gap-2">
                  <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                    className="px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input type="number" min="0" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Duration (minutes)</label>
                <input type="number" min="5" step="5" value={form.duration_minutes}
                  onChange={(e) => setForm((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 30 }))}
                  className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Category (optional)</label>
                <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Cosmetic, Diagnostic"
                  className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="active" checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-primary" />
                <label htmlFor="active" className="text-sm cursor-pointer">Active (visible on public page)</label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? <><Loader2 size={14} className="mr-1 animate-spin" />Saving…</> : <><Save size={14} className="mr-1" />Save</>}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Services List ── */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Star size={40} className="opacity-20" />
            <p className="text-sm">No services yet.</p>
            <Button size="sm" onClick={() => startEdit()}>
              <Plus size={14} className="mr-1.5" />Add your first service
            </Button>
          </div>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                  <GripVertical size={14} className="text-muted-foreground/40 shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{svc.name}</p>
                      {!svc.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Hidden</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {svc.price != null ? (
                        <span className="font-medium text-foreground">{svc.currency} {svc.price.toLocaleString()}</span>
                      ) : (
                        <span>Contact for price</span>
                      )}
                      <span>·</span>
                      <span>{svc.duration_minutes} min</span>
                      {svc.category && <><span>·</span><span>{svc.category}</span></>}
                    </div>
                    {svc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{svc.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => startEdit(svc)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(svc.id, svc.name)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Services appear on your public business page and are used by the AI to answer pricing questions and during appointment booking.
      </p>
    </div>
  );
}
