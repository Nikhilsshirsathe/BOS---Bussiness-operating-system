import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType = "appointment_confirmation" | "appointment_reminder" | "lead_notification" | "escalation_notification" | "welcome";

function buildEmailHTML(type: EmailType, data: Record<string, string>): { subject: string; html: string } {
  const templates: Record<EmailType, { subject: string; html: string }> = {
    appointment_confirmation: {
      subject: `Appointment Confirmed - ${data.business_name}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">Appointment Confirmed! ✓</h2>
        <p>Hi ${data.customer_name},</p>
        <p>Your appointment with <strong>${data.business_name}</strong> has been confirmed.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Date & Time:</strong> ${data.appointment_time}</p>
          <p><strong>Service:</strong> ${data.service || "Appointment"}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
        </div>
        <p>If you need to reschedule or cancel, please contact us.</p>
        <p style="color:#64748b;font-size:12px">Powered by SalesOS</p>
      </div>`,
    },
    appointment_reminder: {
      subject: `Reminder: Appointment Tomorrow - ${data.business_name}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">Appointment Reminder ⏰</h2>
        <p>Hi ${data.customer_name},</p>
        <p>This is a reminder about your upcoming appointment with <strong>${data.business_name}</strong>.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Date & Time:</strong> ${data.appointment_time}</p>
          <p><strong>Service:</strong> ${data.service || "Appointment"}</p>
        </div>
        <p style="color:#64748b;font-size:12px">Powered by SalesOS</p>
      </div>`,
    },
    lead_notification: {
      subject: `New ${data.lead_status?.toUpperCase()} Lead - ${data.customer_name}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">New Lead Detected 🎯</h2>
        <p>A new lead has been qualified from your chatbot.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Name:</strong> ${data.customer_name}</p>
          <p><strong>Email:</strong> ${data.customer_email}</p>
          <p><strong>Status:</strong> <span style="color:${data.lead_status === "hot" ? "#ef4444" : data.lead_status === "warm" ? "#f59e0b" : "#3b82f6"}">${data.lead_status?.toUpperCase()}</span></p>
          <p><strong>Score:</strong> ${data.score}/100</p>
          ${data.requirements ? `<p><strong>Requirements:</strong> ${data.requirements}</p>` : ""}
        </div>
        <p style="color:#64748b;font-size:12px">Powered by SalesOS</p>
      </div>`,
    },
    escalation_notification: {
      subject: `Escalation Required - Ticket #${data.ticket_id}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#ef4444">Human Support Required ⚠️</h2>
        <p>A customer requires human assistance.</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #ef4444">
          <p><strong>Customer:</strong> ${data.customer_name} (${data.customer_email})</p>
          <p><strong>Priority:</strong> ${data.priority?.toUpperCase()}</p>
          <p><strong>Summary:</strong> ${data.summary}</p>
          <p><strong>Ticket ID:</strong> #${data.ticket_id}</p>
        </div>
        <p style="color:#64748b;font-size:12px">Powered by SalesOS</p>
      </div>`,
    },
    welcome: {
      subject: `Welcome to ${data.business_name}! 🎉`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">Welcome to SalesOS!</h2>
        <p>Hi ${data.user_name},</p>
        <p>Your AI Sales Bot for <strong>${data.business_name}</strong> is ready.</p>
        <p>Start by configuring your agents and uploading your business documents.</p>
        <p style="color:#64748b;font-size:12px">Powered by SalesOS</p>
      </div>`,
    },
  };

  return templates[type] || { subject: "Notification", html: "<p>You have a new notification.</p>" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, to, data } = await req.json() as { type: EmailType; to: string; data: Record<string, string> };

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing type or to" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmailHTML(type, data || {});

    // Send via Resend (or any SMTP provider)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY not set, skipping email send");
      return new Response(JSON.stringify({ success: true, sent: false, message: "Email provider not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${data.business_name || "SalesOS"} <noreply@salesos.ai>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      throw new Error(`Email send failed: ${err}`);
    }

    const result = await emailResponse.json();
    return new Response(
      JSON.stringify({ success: true, sent: true, email_id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("email-notifications error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
