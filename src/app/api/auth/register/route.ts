import { NextResponse } from "next/server";
import { z } from "zod";
import { normaliseSingaporePhone } from "@/lib/phone";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(120),
  phone: z.string().min(1, "Please enter your mobile number."),
});

export async function POST(request: Request) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });

  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid registration details." }, { status: 400 });
  const phone = normaliseSingaporePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter an eight-digit Singapore mobile number." }, { status: 400 });

  const { data: existing } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (existing) return NextResponse.json({ error: "This mobile number is already registered. Please sign in." }, { status: 409 });

  const { error } = await supabase.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { full_name: parsed.data.name },
  });
  if (error) return NextResponse.json({ error: "We could not save your registration. Please try again." }, { status: 500 });

  return NextResponse.json({ phone });
}
