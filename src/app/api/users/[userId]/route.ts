import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({ isActive: z.boolean().optional(), isApproved: z.boolean().optional() }).refine((value) => value.isActive !== undefined || value.isApproved !== undefined);

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  if (access.profile.role !== "admin") return NextResponse.json({ error: "Only administrators can change user status." }, { status: 403 });
  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ error: "Unknown user." }, { status: 400 });
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid status change." }, { status: 400 });
  const changes = { ...(parsed.data.isActive === undefined ? {} : { is_active: parsed.data.isActive }), ...(parsed.data.isApproved === undefined ? {} : { is_approved: parsed.data.isApproved }) };
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });
  const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
  if (error) return NextResponse.json({ error: "User status could not be updated." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
