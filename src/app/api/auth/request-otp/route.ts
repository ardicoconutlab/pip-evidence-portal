import { NextResponse } from "next/server";
import { z } from "zod";
import { normaliseSingaporePhone } from "@/lib/phone";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({ phone: z.string().min(1) });

export async function POST(request: Request) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });
  const parsed = inputSchema.safeParse(await request.json());
  const phone = parsed.success ? normaliseSingaporePhone(parsed.data.phone) : null;
  if (!phone) return NextResponse.json({ error: "Enter an eight-digit Singapore mobile number." }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("id, is_active, is_approved").eq("phone", phone).maybeSingle();
  if (!profile) return NextResponse.json({ code: "REGISTER_FIRST", error: "Please register before signing in." }, { status: 404 });
  if (!profile.is_active || !profile.is_approved) return NextResponse.json({ error: "This account is not currently available. Please contact the support team." }, { status: 403 });

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });
  if (error) return NextResponse.json({ error: "We could not send a login code. Please try again." }, { status: 502 });
  return NextResponse.json({ phone });
}
