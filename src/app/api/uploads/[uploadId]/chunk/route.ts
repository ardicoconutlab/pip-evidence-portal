import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function parseRange(value: string | null) {
  const match = value?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
}

export async function PUT(request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  const { uploadId } = await params;
  const range = parseRange(request.headers.get("content-range"));
  if (!range || range.end < range.start || range.end - range.start + 1 > 4_000_000) return NextResponse.json({ error: "Upload chunks must be valid and no larger than 4 MB." }, { status: 400 });
  const content = await request.arrayBuffer();
  if (content.byteLength !== range.end - range.start + 1) return NextResponse.json({ error: "The upload chunk size did not match its range." }, { status: 400 });

  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });
  const { data: session } = await supabase.from("upload_sessions").select("id, owner_id, drive_upload_url, evidence_file_id, uploaded_bytes, expires_at, evidence_files(byte_size, mime_type)").eq("id", uploadId).maybeSingle();
  if (!session || session.owner_id !== access.user.id) return NextResponse.json({ error: "This upload session is not available." }, { status: 404 });
  if (new Date(session.expires_at) < new Date()) return NextResponse.json({ error: "This upload has expired. Please start it again." }, { status: 410 });
  const evidence = Array.isArray(session.evidence_files) ? session.evidence_files[0] : session.evidence_files;
  if (!evidence || evidence.byte_size !== range.total || range.start !== session.uploaded_bytes) return NextResponse.json({ error: "This upload is out of sequence. Please retry the file." }, { status: 409 });

  const driveResponse = await fetch(session.drive_upload_url, {
    method: "PUT",
    headers: { "Content-Length": String(content.byteLength), "Content-Type": evidence.mime_type || "application/octet-stream", "Content-Range": request.headers.get("content-range")! },
    body: content,
  });
  if (driveResponse.status === 308) {
    const acceptedRange = driveResponse.headers.get("range");
    const uploadedBytes = acceptedRange ? Number(acceptedRange.match(/(\d+)$/)?.[1] ?? -1) + 1 : range.end + 1;
    await supabase.from("upload_sessions").update({ uploaded_bytes: uploadedBytes }).eq("id", session.id);
    return NextResponse.json({ complete: false, uploadedBytes });
  }
  if (!driveResponse.ok) return NextResponse.json({ error: "Google Drive could not save this part of the file." }, { status: 502 });

  const driveFile = await driveResponse.json() as { id?: string; sha256Checksum?: string };
  if (!driveFile.id) return NextResponse.json({ error: "Google Drive did not confirm this file." }, { status: 502 });
  await supabase.from("evidence_files").update({ drive_file_id: driveFile.id, sha256_checksum: driveFile.sha256Checksum ?? null, status: "available", uploaded_at: new Date().toISOString() }).eq("id", session.evidence_file_id);
  await supabase.rpc("complete_storage_reservation", { p_file_id: session.evidence_file_id });
  await supabase.from("upload_sessions").delete().eq("id", session.id);
  return NextResponse.json({ complete: true, uploadedBytes: range.total, fileId: session.evidence_file_id });
}
