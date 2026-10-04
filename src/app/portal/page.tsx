import { redirect } from "next/navigation";
import { PortalExperience } from "@/components/portal-experience";
import { isSupabaseConfigured } from "@/lib/config";
import { getServerSupabase } from "@/lib/supabase/server";
import type { EvidenceFile, Investment, Person, Project, Role } from "@/types/portal";

export default async function PortalPage() {
  if (!isSupabaseConfigured) return <PortalExperience previewMode />;

  const supabase = await getServerSupabase();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active, is_approved")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || !profile.is_approved) redirect("/login?access=unavailable");

  const [projectsResult, investmentsResult, filesResult, peopleResult] = await Promise.all([
    supabase.from("projects").select("id, code, name, status").order("name"),
    supabase.from("investments").select("id, reference, owner_id, project_id, created_at, updated_at, projects(name), profiles!investments_owner_id_fkey(full_name), investment_folders(id, category_id), evidence_files(count)").order("updated_at", { ascending: false }),
    supabase.from("evidence_files").select("id, investment_id, category_id, original_name, mime_type, byte_size, uploaded_at, status").eq("status", "available").order("uploaded_at", { ascending: false }),
    profile.role === "admin" ? supabase.from("profiles").select("id, full_name, phone, role, is_approved, is_active").order("full_name") : Promise.resolve({ data: [] }),
  ]);

  const investments = ((investmentsResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((row): Investment => {
    const project = row.projects as { name?: string } | null;
    const owner = row.profiles as { full_name?: string } | null;
    const folders = (row.investment_folders as Array<{ id: string; category_id: string }> | null) ?? [];
    const counts = (row.evidence_files as Array<{ count?: number }> | null) ?? [];
    return {
      id: String(row.id), reference: String(row.reference), ownerId: String(row.owner_id), projectId: String(row.project_id),
      ownerName: owner?.full_name ?? "Unknown investor", projectName: project?.name ?? "Unknown project",
      createdAt: String(row.created_at), lastActivityAt: String(row.updated_at), fileCount: counts[0]?.count ?? 0,
      folderIds: Object.fromEntries(folders.map((folder) => [folder.category_id, folder.id])),
    };
  });
  const projectCounts = investments.reduce<Record<string, number>>((counts, investment) => ({ ...counts, [investment.projectId]: (counts[investment.projectId] ?? 0) + 1 }), {});
  const projects = ((projectsResult.data ?? []) as Array<{ id: string; code: string; name: string; status: "active" | "archived" }>).map((item): Project => ({ ...item, investorCount: projectCounts[item.id] ?? 0 }));
  const files = ((filesResult.data ?? []) as Array<{ id: string; investment_id: string; category_id: string; original_name: string; mime_type: string | null; byte_size: number; uploaded_at: string | null; status: "available" }>).map((item): EvidenceFile => ({
    id: item.id, investmentId: item.investment_id, categoryId: item.category_id, name: item.original_name,
    type: item.mime_type?.split("/").pop()?.toUpperCase() ?? "FILE", size: item.byte_size,
    uploadedAt: item.uploaded_at ?? new Date().toISOString(), status: item.status,
  }));
  const investmentCounts = investments.reduce<Record<string, number>>((counts, investment) => ({ ...counts, [investment.ownerId]: (counts[investment.ownerId] ?? 0) + 1 }), {});
  const people = ((peopleResult.data ?? []) as Array<{ id: string; full_name: string; phone: string; role: Role; is_approved: boolean; is_active: boolean }>).map((item): Person => ({
    id: item.id, name: item.full_name, phone: item.phone, role: item.role, isApproved: item.is_approved, isActive: item.is_active, investmentCount: investmentCounts[item.id] ?? 0,
  }));

  return <PortalExperience previewMode={false} initialName={profile.full_name} initialRole={profile.role as Role} initialProjects={projects} initialInvestments={investments} initialFiles={files} initialPeople={people} />;
}
