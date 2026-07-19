import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-salesos-signature");
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // Validate webhook secret if configured
    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = await request.json();
    const { event, business_id, data } = payload;

    if (!event || !business_id) {
      return NextResponse.json({ error: "Missing event or business_id" }, { status: 400 });
    }

    const supabase = await createClient();

    // Track the event
    await supabase.from("analytics_events").insert({
      business_id,
      event_type: `webhook:${event}`,
      metadata: data || {},
    });

    // Handle specific webhook events
    switch (event) {
      case "lead.created": {
        const { customer_name, customer_email, score, status } = data || {};
        if (customer_email) {
          await supabase.from("leads").insert({
            business_id,
            customer_name: customer_name || "Unknown",
            customer_email,
            score: score || 50,
            status: status || "warm",
            source: "webhook",
          });
        }
        break;
      }

      case "appointment.booked": {
        const { customer_name, customer_email, appointment_time, service } = data || {};
        if (customer_email && appointment_time) {
          await supabase.from("appointments").insert({
            business_id,
            customer_name: customer_name || "Unknown",
            customer_email,
            appointment_time,
            service: service || "Appointment",
            status: "scheduled",
          });
        }
        break;
      }

      case "conversation.ended": {
        const { chat_id } = data || {};
        if (chat_id) {
          await supabase.from("chats").update({ status: "resolved", is_active: false }).eq("id", chat_id);
        }
        break;
      }

      default:
        // Unknown event type — just tracked above
        break;
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
