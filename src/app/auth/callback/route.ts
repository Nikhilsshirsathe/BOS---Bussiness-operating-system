import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create business record if it doesn't exist
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", data.user.id)
        .single();

      if (!existing) {
        const businessName = data.user.user_metadata?.business_name || "My Business";
        await supabase.from("businesses").insert({
          owner_id: data.user.id,
          business_name: businessName,
          industry: "Other",
        });
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
