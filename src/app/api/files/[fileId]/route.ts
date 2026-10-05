import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { getDriveClient } from "@/lib/drive";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  const { fileId } = await params;
  if (!z.string().uuid().safeParse(fileId).success) return NextResponse.json({ error: "Unknown file." }, { status: 400 });
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });
  const { data: file } = await supabase.from("evidence_files").select("id, original_name, mime_type, drive_file_id, investments(owner_id)").eq("id", fileId).eq("status", "available").maybeSingle();
  const investment = Array.isArray(file?.investments) ? file.investments[0] : file?.investments;
  if (!file || !file.drive_file_id || (access.profile.role !== "admin" && investment?.owner_id !== access.user.id)) return NextResponse.json({ error: "This file is not available." }, { status: 404 });
  try {
    const { drive } = getDriveClient();
    const result = await drive.files.get({ fileId: file.drive_file_id, alt: "media", supportsAllDrives: true }, { responseType: "stream" });
    const body = Readable.toWeb(result.data as Readable) as ReadableStream;
    const safeName = file.original_name.replace(/[^\x20-\x7E]|["\\]/g, "_");
    return new Response(body, { headers: { "Content-Type": file.mime_type ?? "application/octet-stream", "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.original_name)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
  } catch {
    return NextResponse.json({ error: "The stored file could not be opened." }, { status: 502 });
  }
}
