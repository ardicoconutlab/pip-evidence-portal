import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({ requireRegistrationApproval: z.boolean() });

export async function PATCH(request: Request) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  if (access.profile.role !== "admin") return NextResponse.json({ error: "Only administrators can change this setting." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid setting value." }, { status: 400 });
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });
  const { error } = await supabase.from("app_settings").update({ require_registration_approval: parsed.data.requireRegistrationApproval }).eq("id", true);
  if (error) return NextResponse.json({ error: "Setting could not be updated." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
