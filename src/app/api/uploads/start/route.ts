import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { createDriveUploadSession } from "@/lib/drive";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({
  investmentId: z.string().uuid(),
  folderId: z.string().uuid(),
  categoryId: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(512),
  mimeType: z.string().max(200).optional().default("application/octet-stream"),
  size: z.number().int().positive().max(250_000_000),
});

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "The selected file is not valid." }, { status: 400 });
  const input = parsed.data;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });

  const { data: investment } = await supabase.from("investments").select("id, owner_id").eq("id", input.investmentId).maybeSingle();
  if (!investment || investment.owner_id !== access.user.id) return NextResponse.json({ error: "You cannot upload to this collection." }, { status: 403 });
  const { data: folder } = await supabase.from("investment_folders").select("id, category_id, drive_folder_id, drive_status").eq("id", input.folderId).eq("investment_id", input.investmentId).maybeSingle();
  if (!folder || folder.category_id !== input.categoryId || folder.drive_status !== "ready" || !folder.drive_folder_id) return NextResponse.json({ error: "This evidence folder is not ready yet." }, { status: 409 });

  const { data: reserved, error: reserveError } = await supabase.rpc("reserve_storage", { p_owner_id: access.user.id, p_bytes: input.size });
  if (reserveError || !reserved) return NextResponse.json({ error: "This file would exceed your 250 MB storage allowance." }, { status: 413 });

  try {
    const uploadUrl = await createDriveUploadSession({ name: input.name, mimeType: input.mimeType, parentId: folder.drive_folder_id });
    const { data: evidenceFile, error: fileError } = await supabase.from("evidence_files").insert({
      investment_id: input.investmentId, folder_id: folder.id, category_id: input.categoryId,
      uploaded_by: access.user.id, original_name: input.name, mime_type: input.mimeType, byte_size: input.size,
    }).select("id").single();
    if (fileError || !evidenceFile) throw new Error("Could not create evidence record.");
    const { data: session, error: sessionError } = await supabase.from("upload_sessions").insert({
      evidence_file_id: evidenceFile.id, owner_id: access.user.id, drive_upload_url: uploadUrl,
      expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single();
    if (sessionError || !session) throw new Error("Could not create upload session.");
    return NextResponse.json({ uploadId: session.id, chunkSize: 4_000_000 });
  } catch {
    await supabase.rpc("release_storage_reservation", { p_owner_id: access.user.id, p_bytes: input.size });
    return NextResponse.json({ error: "We could not prepare your file upload. Please try again." }, { status: 502 });
  }
}
