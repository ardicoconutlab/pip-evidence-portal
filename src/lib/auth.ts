import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function requireActiveUser() {
  const supabase = await getServerSupabase();
  if (!supabase) return { response: NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 }) } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) } as const;
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role, is_active, is_approved, storage_limit_bytes, used_storage_bytes, reserved_storage_bytes").eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_active || !profile.is_approved) return { response: NextResponse.json({ error: "This account is not currently available." }, { status: 403 }) } as const;
  return { user, profile } as const;
}
