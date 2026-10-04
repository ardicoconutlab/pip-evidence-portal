import { NextResponse } from "next/server";
import { z } from "zod";
import { createDriveFolder } from "@/lib/drive";
import { requireActiveUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({ name: z.string().trim().min(2).max(160) });

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  if (access.profile.role !== "admin") return NextResponse.json({ error: "Only administrators can add projects." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a project name." }, { status: 400 });
  const supabase = getAdminSupabase();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!supabase || !rootFolderId) return NextResponse.json({ error: "Google Drive has not been configured yet." }, { status: 503 });

  const code = `PRJ-${Date.now().toString().slice(-6)}`;
  const { data: project, error: createError } = await supabase.from("projects").insert({ code, name: parsed.data.name, created_by: access.user.id }).select().single();
  if (createError || !project) return NextResponse.json({ error: "This project could not be created. It may already exist." }, { status: 409 });
  try {
    const driveFolderId = await createDriveFolder(`${project.name} — ${project.code}`, rootFolderId);
    const { data: readyProject } = await supabase.from("projects").update({ drive_folder_id: driveFolderId, drive_status: "ready" }).eq("id", project.id).select().single();
    return NextResponse.json({ project: readyProject });
  } catch {
    await supabase.from("projects").update({ drive_status: "failed" }).eq("id", project.id);
    return NextResponse.json({ error: "The project was saved, but its evidence folder could not be prepared. Please retry from the administrator view." }, { status: 502 });
  }
}
