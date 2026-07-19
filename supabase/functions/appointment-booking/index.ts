import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action = "book" } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "check_availability") {
      const { business_id, date } = body;
      if (!business_id || !date) {
        return new Response(JSON.stringify({ error: "Missing business_id or date" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const dayOfWeek = new Date(date).getDay();
      const { data: hours } = await supabase
        .from("business_hours")
        .select("*")
        .eq("business_id", business_id)
        .eq("day_of_week", dayOfWeek)
        .single();

      if (!hours?.is_available) {
        return new Response(
          JSON.stringify({ available: false, message: "Business is closed on this day" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: booked } = await supabase
        .from("appointments")
        .select("appointment_time, duration_minutes")
        .eq("business_id", business_id)
        .gte("appointment_time", `${date}T00:00:00`)
        .lt("appointment_time", `${date}T23:59:59`)
        .in("status", ["scheduled", "confirmed"]);

      const bookedSlots = (booked || []).map((a: { appointment_time: string }) =>
        new Date(a.appointment_time).getHours()
      );

      const slots: string[] = [];
      const startHour = parseInt(hours.start_time.split(":")[0]);
      const endHour = parseInt(hours.end_time.split(":")[0]);

      for (let h = startHour; h < endHour; h++) {
        if (!bookedSlots.includes(h)) {
          slots.push(`${h.toString().padStart(2, "0")}:00`);
        }
      }

      return new Response(
        JSON.stringify({ available: slots.length > 0, slots, business_hours: hours }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "book") {
      const { business_id, customer_name, customer_email, customer_phone, appointment_time, duration_minutes = 30, service, notes, chat_id } = body;

      if (!business_id || !customer_name || !customer_email || !appointment_time) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Conflict check
      const slotStart = new Date(appointment_time);
      const slotEnd = new Date(slotStart.getTime() + duration_minutes * 60000);

      const { data: conflicts } = await supabase
        .from("appointments")
        .select("id")
        .eq("business_id", business_id)
        .gte("appointment_time", slotStart.toISOString())
        .lt("appointment_time", slotEnd.toISOString())
        .in("status", ["scheduled", "confirmed"]);

      if (conflicts && conflicts.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Time slot is already booked. Please choose another time." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          business_id,
          customer_name,
          customer_email,
          customer_phone: customer_phone || null,
          appointment_time,
          duration_minutes,
          service: service || "Appointment",
          status: "scheduled",
          notes: notes || null,
          chat_id: chat_id || null,
        })
        .select()
        .single();

      if (error) throw new Error(`Appointment booking failed: ${error.message}`);

      await supabase.from("analytics_events").insert({
        business_id,
        event_type: "appointment_booked",
        agent_type: "appointment",
        chat_id: chat_id || null,
        metadata: { appointment_id: appointment.id, appointment_time },
      });

      return new Response(
        JSON.stringify({ success: true, appointment }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel") {
      const { appointment_id, reason } = body;
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", notes: reason || "Cancelled via chat" })
        .eq("id", appointment_id)
        .select()
        .single();

      if (error) throw new Error(`Cancel failed: ${error.message}`);
      return new Response(
        JSON.stringify({ success: true, appointment: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("appointment-booking error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
