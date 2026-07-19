"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import type {
  Lead, Appointment, Chat, KnowledgeDocument,
  DashboardStats, TimeSlot, VoiceCall, Service,
} from "@/types";

// Re-export types consumers need
export type { Lead, Appointment, Chat, KnowledgeDocument, TimeSlot, VoiceCall, Service };

// ─── Helper ───────────────────────────────────────────────────
export function useBusinessId() {
  const { business, fetchBusiness } = useAppStore();
  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);
  return business?.id ?? null;
}

// ─── useLeads ─────────────────────────────────────────────────
export function useLeads() {
  const businessId = useBusinessId();
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("leads")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    else setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id: string, status: Lead["status"]) => {
    const supabase = createClient();
    await supabase.from("leads").update({ status }).eq("id", id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
  };

  return { leads, loading, error, refetch: fetch, updateStatus };
}

// ─── useAppointments ──────────────────────────────────────────
export function useAppointments() {
  const businessId = useBusinessId();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .order("appointment_time", { ascending: false })
      .limit(200);
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    const supabase = createClient();
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  };

  return { appointments, loading, refetch: fetch, updateStatus };
}

// ─── useConversations ─────────────────────────────────────────
export function useConversations() {
  const businessId = useBusinessId();
  const [conversations, setConversations] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(100);
    setConversations((data ?? []) as Chat[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime
  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("chats-realtime")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "chats",
        filter: `business_id=eq.${businessId}`,
      }, () => { fetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, fetch]);

  return { conversations, loading, refetch: fetch };
}

// ─── useKnowledge ─────────────────────────────────────────────
export function useKnowledge() {
  const businessId = useBusinessId();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setDocuments((data ?? []) as KnowledgeDocument[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  const deleteDocument = async (id: string) => {
    const supabase = createClient();
    await supabase.from("knowledge_documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return { documents, loading, refetch: fetch, deleteDocument };
}

// ─── useVoiceCalls ────────────────────────────────────────────
export function useVoiceCalls() {
  const businessId = useBusinessId();
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("voice_calls")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    setCalls((data ?? []) as VoiceCall[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { calls, loading, refetch: fetch };
}

// ─── useServices ──────────────────────────────────────────────
export function useServices(businessId?: string | null) {
  const storeId = useBusinessId();
  const id = businessId ?? storeId;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", id)
      .eq("is_active", true)
      .order("sort_order");
    setServices((data ?? []) as Service[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (service: Partial<Service> & { name: string }) => {
    const supabase = createClient();
    if (service.id) {
      await supabase.from("services").update(service).eq("id", service.id);
    } else {
      await supabase.from("services").insert({ ...service, business_id: id });
    }
    fetch();
  };

  const remove = async (serviceId: string) => {
    const supabase = createClient();
    await supabase.from("services").delete().eq("id", serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  return { services, loading, refetch: fetch, save, remove };
}

// ─── useDashboardStats ────────────────────────────────────────
export function useDashboardStats(period = "30d") {
  const businessId = useBusinessId();
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!businessId) return;
      setLoading(true);
      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const supabase = createClient();

      try {
        // Call analytics edge function first
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analytics-processing`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ business_id: businessId, period }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setLoading(false);
          return;
        }
      } catch { /* fall through to direct query */ }

      // Fallback: direct queries
      const [
        { count: totalLeads },
        { count: hotLeads },
        { count: warmLeads },
        { count: coldLeads },
        { count: totalAppts },
        { count: totalChats },
        { count: activeDocs },
        { count: totalVoice },
      ] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", since),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "hot"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "warm"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "cold"),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("chats").select("*", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("knowledge_documents").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "indexed"),
        supabase.from("voice_calls").select("*", { count: "exact", head: true }).eq("business_id", businessId),
      ]);

      setStats({
        total_leads: totalLeads ?? 0,
        hot_leads:   hotLeads  ?? 0,
        warm_leads:  warmLeads ?? 0,
        cold_leads:  coldLeads ?? 0,
        total_appointments: totalAppts ?? 0,
        appointments_today: 0,
        total_conversations: totalChats ?? 0,
        active_conversations: 0,
        total_voice_calls: totalVoice ?? 0,
        total_documents: activeDocs ?? 0,
        total_visitors: 0,
        leads_over_time: [],
        conversations_over_time: [],
        agent_usage: {},
        conversion_rate: 0,
      });
      setLoading(false);
    };
    load();
  }, [businessId, period]);

  return { stats, loading };
}

// ─── useAvailableSlots ────────────────────────────────────────
export function useAvailableSlots(businessId: string | null, date: string | null) {
  const [slots, setSlots]   = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId || !date) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .rpc("get_available_slots", { p_business_id: businessId, p_date: date })
      .then(({ data }) => {
        setSlots((data ?? []) as TimeSlot[]);
        setLoading(false);
      });
  }, [businessId, date]);

  return { slots, loading };
}
