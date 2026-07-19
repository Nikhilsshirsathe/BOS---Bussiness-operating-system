// @ts-nocheck — Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { business_id, period = "30d" } = await req.json();
    if (!business_id) return new Response(JSON.stringify({ error: "Missing business_id" }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    // Core counts
    const [
      { count: totalLeads },
      { count: hotLeads },
      { count: warmLeads },
      { count: coldLeads },
      { count: totalAppts },
      { count: apptToday },
      { count: totalChats },
      { count: activeChats },
      { count: totalVoice },
      { count: totalDocs },
      { count: totalVisitors },
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", business_id).gte("created_at", since),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", business_id).eq("status", "hot"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", business_id).eq("status", "warm"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", business_id).eq("status", "cold"),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("business_id", business_id)
        .gte("appointment_time", new Date().toISOString().slice(0, 10)),
      supabase.from("chats").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("chats").select("*", { count: "exact", head: true }).eq("business_id", business_id).eq("is_active", true),
      supabase.from("voice_calls").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("knowledge_documents").select("*", { count: "exact", head: true }).eq("business_id", business_id).eq("status", "indexed"),
      supabase.from("analytics_events").select("visitor_id", { count: "exact", head: true }).eq("business_id", business_id).eq("event_type", "page_view"),
    ]);

    // Leads over time
    const { data: leadRows } = await supabase
      .from("leads")
      .select("created_at")
      .eq("business_id", business_id)
      .gte("created_at", since)
      .order("created_at");

    const leadsOverTime = aggregateByDay(leadRows ?? [], days);

    // Conversations over time
    const { data: chatRows } = await supabase
      .from("chats")
      .select("created_at")
      .eq("business_id", business_id)
      .gte("created_at", since)
      .order("created_at");

    const conversationsOverTime = aggregateByDay(chatRows ?? [], days);

    // Agent usage
    const { data: agentRows } = await supabase
      .from("chats")
      .select("current_agent")
      .eq("business_id", business_id)
      .gte("created_at", since);

    const agentUsage: Record<string, number> = {};
    for (const row of agentRows ?? []) {
      agentUsage[row.current_agent] = (agentUsage[row.current_agent] ?? 0) + 1;
    }

    const conversionRate = totalLeads && totalAppts
      ? Math.round(((totalAppts / totalLeads) * 100) * 10) / 10
      : 0;

    return new Response(JSON.stringify({
      total_leads: totalLeads ?? 0,
      hot_leads:   hotLeads  ?? 0,
      warm_leads:  warmLeads ?? 0,
      cold_leads:  coldLeads ?? 0,
      total_appointments: totalAppts ?? 0,
      appointments_today: apptToday ?? 0,
      total_conversations: totalChats ?? 0,
      active_conversations: activeChats ?? 0,
      total_voice_calls: totalVoice ?? 0,
      total_documents: totalDocs ?? 0,
      total_visitors: totalVisitors ?? 0,
      leads_over_time: leadsOverTime,
      conversations_over_time: conversationsOverTime,
      agent_usage: agentUsage,
      conversion_rate: conversionRate,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});

function aggregateByDay(rows: { created_at: string }[], days: number) {
  const map: Record<string, number> = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of rows) {
    const d = row.created_at.slice(0, 10);
    if (d in map) map[d]++;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}
