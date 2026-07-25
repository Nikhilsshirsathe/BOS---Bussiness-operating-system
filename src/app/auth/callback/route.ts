import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role") ?? null; // passed from user-signup emailRedirectTo

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const userRole = role ?? data.user.user_metadata?.role ?? "business";

      // Upsert user_profiles row
      await supabase.from("user_profiles").upsert({
        id:        data.user.id,
        email:     data.user.email,
        full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.business_name ?? "",
        role:      userRole,
      }, { onConflict: "id" });

      if (userRole === "user") {
        return NextResponse.redirect(`${origin}/explore`);
      }

      // Business owner — ensure businesses row exists
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", data.user.id)
        .single();

      if (!existing) {
        const businessName = data.user.user_metadata?.business_name || "My Business";
        const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await supabase.from("businesses").insert({
          owner_id:      data.user.id,
          business_name: businessName,
          slug,
          industry:      "Other",
        });
        return NextResponse.redirect(`${origin}/profile-setup`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
