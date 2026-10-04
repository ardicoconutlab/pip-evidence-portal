import { NextResponse } from "next/server";
import { z } from "zod";
import { evidenceCategories } from "@/lib/demo-data";
import { createDriveFolder } from "@/lib/drive";
import { requireActiveUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

const inputSchema = z.object({ projectId: z.string().uuid() });

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if ("response" in access) return access.response;
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a project." }, { status: 400 });
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "The portal is not configured yet." }, { status: 503 });
  const { data: project } = await supabase.from("projects").select("id, name, code, drive_folder_id, drive_status, status").eq("id", parsed.data.projectId).maybeSingle();
  if (!project || project.status !== "active") return NextResponse.json({ error: "This project is no longer available." }, { status: 404 });
  if (project.drive_status !== "ready" || !project.drive_folder_id) return NextResponse.json({ error: "This project is still being prepared. Please try again shortly." }, { status: 409 });

  const reference = `INV-${Date.now().toString().slice(-6)}`;
  const { data: investment, error: createError } = await supabase.from("investments").insert({ owner_id: access.user.id, project_id: project.id, reference }).select().single();
  if (createError || !investment) {
    return NextResponse.json({ error: "You already have an evidence collection for this project." }, { status: 409 });
  }
  try {
    const investmentFolderId = await createDriveFolder(`${access.profile.full_name} — ${investment.reference}`, project.drive_folder_id);
    await supabase.from("investments").update({ drive_folder_id: investmentFolderId, drive_status: "ready" }).eq("id", investment.id);
    const folders = await Promise.all(evidenceCategories.map(async (category) => ({
      category_id: category.id,
      drive_folder_id: await createDriveFolder(`${category.number} ${category.name}`, investmentFolderId),
      drive_status: "ready",
      investment_id: investment.id,
    })));
    const { error: folderError } = await supabase.from("investment_folders").insert(folders);
    if (folderError) throw folderError;
    return NextResponse.json({ investment: {
      id: investment.id,
      reference: investment.reference,
      projectId: project.id,
      projectName: project.name,
      ownerId: access.user.id,
      ownerName: access.profile.full_name,
      createdAt: investment.created_at,
      lastActivityAt: investment.created_at,
      fileCount: 0,
      folderIds: Object.fromEntries(folders.map((folder) => [folder.category_id, folder.drive_folder_id])),
    } });
  } catch {
    await supabase.from("investments").update({ drive_status: "failed" }).eq("id", investment.id);
    return NextResponse.json({ error: "Your collection was created but its folders are not ready yet. Please contact the administrator." }, { status: 502 });
  }
}
