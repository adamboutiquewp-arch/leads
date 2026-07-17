import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-webhook-token") ?? request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing webhook token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("webhook_token", token)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }

  const { full_name, email, phone, source, campaign_id } = body as Record<string, unknown>;

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      user_id: profile.id,
      campaign_id: typeof campaign_id === "string" ? campaign_id : null,
      full_name: typeof full_name === "string" ? full_name : null,
      email: typeof email === "string" ? email : null,
      phone: typeof phone === "string" ? phone : null,
      source: typeof source === "string" ? source : "manual",
      raw_payload: body,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 });
}
