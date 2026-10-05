"use client";

import { ChangeEvent, useEffect, useRef, useMemo, useState } from "react";
import {
  Archive, Bell, ChevronRight, CircleHelp, FilePlus2, FileText, FolderOpen,
  LayoutList, LoaderCircle, LogOut, Menu, MoreHorizontal, Plus, Search,
  Settings, ShieldCheck, Upload, UserRound, Users, X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { evidenceCategories, demoFiles, demoInvestments, demoPeople, demoProjects } from "@/lib/demo-data";
import { formatBytes, formatDate } from "@/lib/format";
import type { EvidenceFile, Investment, Person, PortalView, Project, Role } from "@/types/portal";

const MAX_STORAGE = 250_000_000;

interface PortalExperienceProps {
  previewMode: boolean;
  initialUserId?: string;
  initialRole?: Role;
  initialName?: string;
  initialProjects?: Project[];
  initialInvestments?: Investment[];
  initialFiles?: EvidenceFile[];
  initialPeople?: Person[];
}

export function PortalExperience({
  previewMode,
  initialUserId = "user-001",
  initialRole = "investor",
  initialName = "Mary Tan",
  initialProjects = demoProjects,
  initialInvestments = demoInvestments,
  initialFiles = demoFiles,
  initialPeople = demoPeople,
}: PortalExperienceProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const [view, setView] = useState<PortalView>("investments");
  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState(initialProjects);
  const [investments, setInvestments] = useState(initialInvestments);
  const [files, setFiles] = useState(initialFiles);
  const [people, setPeople] = useState(initialPeople);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const localUrls = useRef<string[]>([]);
  useEffect(() => () => localUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const [toast, setToast] = useState("");

  const ownedInvestments = role === "admin" ? investments : investments.filter((investment) => investment.ownerId === initialUserId);
  const usedBytes = files.filter((file) => file.investmentId && (role === "admin" || ownedInvestments.some((investment) => investment.id === file.investmentId))).reduce((total, file) => total + file.size, 0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };

  async function createInvestment(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const existing = investments.find((item) => item.projectId === projectId && item.ownerId === initialUserId);
    if (existing) {
      setSelectedInvestment(existing);
      setCreateOpen(false);
      showToast("You already have a collection for this project.");
      return;
    }
    if (!previewMode) {
      try {
        const response = await fetch("/api/investments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "We could not create this collection.");
        const created: Investment = result.investment;
        setInvestments((current) => [created, ...current]);
        setSelectedInvestment(created);
        setCreateOpen(false);
        showToast("Your evidence folders are ready.");
      } catch (caught) { showToast(caught instanceof Error ? caught.message : "We could not create this collection."); }
      return;
    }
    const newInvestment: Investment = {
      id: `inv-${Date.now()}`,
      reference: `INV-${String(investments.length + 123).padStart(6, "0")}`,
      projectId: project.id,
      projectName: project.name,
      ownerId: initialUserId,
      ownerName: initialName,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      fileCount: 0,
    };
    setInvestments((current) => [newInvestment, ...current]);
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, investorCount: item.investorCount + 1 } : item));
    setSelectedInvestment(newInvestment);
    setCreateOpen(false);
    showToast("Your evidence folders are ready.");
  }

  async function createProject(name: string) {
    if (!previewMode) {
      try {
        const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "We could not add this project.");
        setProjects((current) => [...current, result.project]);
        setCreateProjectOpen(false);
        showToast("Project added. Investors can now select it.");
      } catch (caught) { showToast(caught instanceof Error ? caught.message : "We could not add this project."); }
      return;
    }
    const next = projects.length + 1;
    setProjects((current) => [...current, { id: `prj-${Date.now()}`, code: `PRJ-${String(next).padStart(3, "0")}`, name, status: "active", investorCount: 0 }]);
    setCreateProjectOpen(false);
    showToast("Project added. Investors can now select it.");
  }

  async function togglePerson(id: string, key: "isActive" | "isApproved") {
    const person = people.find((item) => item.id === id);
    if (!person) return;
    if (!previewMode) {
      try {
        const response = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: !person[key] }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "User status could not be updated.");
      } catch (caught) { showToast(caught instanceof Error ? caught.message : "User status could not be updated."); return; }
    }
    setPeople((current) => current.map((person) => person.id === id ? { ...person, [key]: !person[key] } : person));
    showToast("User status updated.");
  }

  async function addLocalFile(file: File, categoryId: string, folderId?: string) {
    if (!selectedInvestment) return;
    if (usedBytes + file.size > MAX_STORAGE) {
      showToast("This file would exceed your 250 MB storage allowance.");
      return;
    }
    let uploadedFileId: string | undefined;
    if (!previewMode && !folderId) { showToast("This folder is not ready for uploads. Please refresh or contact the administrator."); return; }
    if (!file.size) { showToast("This file is empty. Please choose another file."); return; }
    if (!previewMode) {
      try {
        const start = await fetch("/api/uploads/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investmentId: selectedInvestment.id, folderId, categoryId, name: file.name, mimeType: file.type || "application/octet-stream", size: file.size }) });
        const session = await start.json();
        if (!start.ok) throw new Error(session.error ?? "The upload could not start.");
        for (let offset = 0; offset < file.size; offset += session.chunkSize) {
          const end = Math.min(offset + session.chunkSize, file.size);
          const chunk = await file.slice(offset, end).arrayBuffer();
          const response = await fetch(`/api/uploads/${session.uploadId}/chunk`, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream", "Content-Range": `bytes ${offset}-${end - 1}/${file.size}` }, body: chunk });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? "The upload was interrupted.");
          if (result.complete) uploadedFileId = result.fileId;
        }
        if (!uploadedFileId) throw new Error("The upload was not confirmed. Please try again.");
      } catch (caught) { showToast(caught instanceof Error ? caught.message : "The upload was interrupted."); return; }
    }
    const localUrl = previewMode ? URL.createObjectURL(file) : undefined;
    if (localUrl) localUrls.current.push(localUrl);
    const newFile: EvidenceFile = {
      localUrl, mimeType: file.type,
      id: uploadedFileId ?? `file-${crypto.randomUUID()}`,
      investmentId: selectedInvestment.id,
      categoryId,
      name: file.name,
      type: file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "FILE",
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: "available",
    };
    setFiles((current) => [newFile, ...current]);
    setInvestments((current) => current.map((item) => item.id === selectedInvestment.id ? { ...item, fileCount: item.fileCount + 1, lastActivityAt: newFile.uploadedAt } : item));
    setSelectedInvestment((current) => current ? { ...current, fileCount: current.fileCount + 1, lastActivityAt: newFile.uploadedAt } : current);
    showToast(`${file.name} added to this collection.`);
  }

  return (
    <div className="min-h-screen bg-mist">
      {toast && <div role="status" className="fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-4 text-base font-bold text-white shadow-xl"><CheckIcon />{toast}</div>}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4"><button className="rounded-lg p-2 text-navy lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu /></button><Brand /></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm font-bold text-slate-500 sm:inline">{previewMode ? "Preview mode" : "Signed in"}</span>{previewMode && <button className="hidden rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-navy md:inline" onClick={() => { setRole(role === "investor" ? "admin" : "investor"); setView("investments"); }}>View as {role === "investor" ? "admin" : "investor"}</button>}<button className="rounded-lg p-2 text-slate-600" aria-label="Notifications"><Bell size={22} /></button><div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-base font-extrabold text-white">{initialName.split(" ").map((name) => name[0]).join("").slice(0, 2)}</div></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px]">
        <Sidebar role={role} view={view} onChange={setView} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          {previewMode && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950"><CircleHelp className="mt-0.5 shrink-0" size={19} /><p><strong>Preview data is shown here.</strong> The screens, roles and evidence-folder flow are ready to connect to your Supabase project, Google Shared Drive and SMS provider.</p></div>}
          {view === "investments" && <InvestmentsView role={role} name={initialName} projects={projects} investments={ownedInvestments} onCreate={() => setCreateOpen(true)} onOpen={setSelectedInvestment} />}
          {view === "projects" && role === "admin" && <ProjectsView projects={projects} onCreate={() => setCreateProjectOpen(true)} />}
          {view === "people" && role === "admin" && <PeopleView people={people} onToggle={togglePerson} />}
          {view === "settings" && role === "admin" && <SettingsView previewMode={previewMode} onToast={showToast} />}
        </main>
      </div>
      {selectedInvestment && <InvestmentDrawer previewMode={previewMode} investment={selectedInvestment} files={files.filter((file) => file.investmentId === selectedInvestment.id)} storageRemaining={Math.max(MAX_STORAGE - usedBytes, 0)} onClose={() => setSelectedInvestment(null)} onFile={addLocalFile} />}
      {createOpen && <CreateInvestmentDialog projects={projects} investments={investments.filter((investment) => investment.ownerId === initialUserId)} onClose={() => setCreateOpen(false)} onCreate={createInvestment} />}
      {createProjectOpen && <CreateProjectDialog onClose={() => setCreateProjectOpen(false)} onCreate={createProject} />}
    </div>
  );
}

function Sidebar({ role, view, onChange, open, onClose }: { role: Role; view: PortalView; onChange: (view: PortalView) => void; open: boolean; onClose: () => void }) {
  const entries: { id: PortalView; label: string; icon: typeof LayoutList }[] = [
    { id: "investments", label: role === "admin" ? "Investments" : "My investments", icon: LayoutList },
    ...(role === "admin" ? [{ id: "projects" as PortalView, label: "Projects", icon: FolderOpen }, { id: "people" as PortalView, label: "Users", icon: Users }, { id: "settings" as PortalView, label: "Settings", icon: Settings }] : []),
  ];
  const content = <><div className="mb-7 flex items-center justify-between px-3 lg:hidden"><Brand compact /><button className="rounded-lg p-2" onClick={onClose} aria-label="Close navigation"><X /></button></div><p className="px-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Portal</p><nav className="mt-3 space-y-1">{entries.map((entry) => { const Icon = entry.icon; return <button key={entry.id} onClick={() => { onChange(entry.id); onClose(); }} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-bold ${view === entry.id ? "bg-[#d9f0ef] text-teal" : "text-slate-700 hover:bg-slate-100"}`}><Icon size={21} />{entry.label}</button>; })}</nav><div className="mt-auto border-t border-slate-200 px-3 pt-5"><button className="flex min-h-11 items-center gap-3 text-base font-bold text-slate-600"><CircleHelp size={21} />Help and support</button><button className="mt-2 flex min-h-11 items-center gap-3 text-base font-bold text-slate-600"><LogOut size={21} />Sign out</button></div></>;
  return <><aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-7 lg:flex">{content}</aside>{open && <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/40" onClick={onClose} /><aside className="absolute inset-y-0 left-0 flex w-[18rem] flex-col bg-white px-4 py-7 shadow-2xl">{content}</aside></div>}</>;
}

function InvestmentsView({ role, name, projects, investments, onCreate, onOpen }: { role: Role; name: string; projects: Project[]; investments: Investment[]; onCreate: () => void; onOpen: (investment: Investment) => void }) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("all");
  const filtered = investments.filter((investment) => (projectId === "all" || investment.projectId === projectId) && `${investment.ownerName} ${investment.projectName} ${investment.reference}`.toLowerCase().includes(query.toLowerCase()));
  return <section><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-base font-bold text-teal">{role === "admin" ? "Administration" : `Welcome back, ${name.split(" ")[0]}`}</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{role === "admin" ? "Investment collections" : "My project evidence"}</h1><p className="mt-3 max-w-2xl text-lg leading-7 text-slate-600">{role === "admin" ? "Find and review collections submitted across all projects." : "Choose a project collection to view or add your evidence."}</p></div><button onClick={onCreate} className="button-primary shrink-0"><Plus size={21} />Create investment</button></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat label={role === "admin" ? "Total collections" : "My collections"} value={String(investments.length)} note="Across active projects" /><Stat label="Files received" value={String(investments.reduce((sum, item) => sum + item.fileCount, 0))} note="Uploaded evidence" /><Stat label="Active projects" value={String(projects.filter((project) => project.status === "active").length)} note="Available to select" /></div><div className="panel mt-8 overflow-hidden"><div className="border-b border-slate-200 p-5 sm:p-6"><div className="flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={21} /><span className="sr-only">Search collections</span><input className="field-input pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={role === "admin" ? "Search by investor, project or reference" : "Search my projects"} /></label><select className="field-input max-w-full md:w-64" value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Filter by project"><option value="all">All projects</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></div></div><div className="divide-y divide-slate-200">{filtered.length ? filtered.map((investment) => <button key={investment.id} onClick={() => onOpen(investment)} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 sm:p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#d9f0ef] text-teal"><FolderOpen size={24} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-3 gap-y-1"><strong className="text-lg text-ink">{investment.projectName}</strong><span className="text-sm font-bold text-slate-500">{investment.reference}</span></span>{role === "admin" && <span className="mt-1 block text-base text-slate-600">{investment.ownerName}</span>}<span className="mt-1 block text-sm text-slate-500">{investment.fileCount} {investment.fileCount === 1 ? "file" : "files"} · Last activity {formatDate(investment.lastActivityAt)}</span></span><ChevronRight className="shrink-0 text-slate-500" /></button>) : <div className="p-10 text-center"><FolderOpen className="mx-auto text-slate-400" size={34} /><p className="mt-3 text-lg font-bold">No collections found</p><p className="mt-1 text-slate-600">Try another search or create a collection.</p></div>}</div></div></section>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <div className="panel p-5"><p className="text-sm font-bold text-slate-600">{label}</p><p className="mt-2 text-3xl font-extrabold text-ink">{value}</p><p className="mt-1 text-sm text-slate-500">{note}</p></div>; }

function ProjectsView({ projects, onCreate }: { projects: Project[]; onCreate: () => void }) { return <section><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-base font-bold text-teal">Administration</p><h1 className="mt-1 text-4xl font-extrabold tracking-tight">Projects</h1><p className="mt-3 text-lg text-slate-600">Projects are shown in the investor&apos;s project list.</p></div><button onClick={onCreate} className="button-primary"><Plus size={21} />Add project</button></div><div className="panel mt-8 overflow-hidden"><div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-extrabold text-slate-600"><span>Project</span><span className="hidden sm:block">Collections</span><span>Status</span></div>{projects.map((project) => <div key={project.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-5"><span><strong className="block text-lg">{project.name}</strong><span className="text-sm font-bold text-slate-500">{project.code}</span></span><span className="hidden text-base text-slate-600 sm:block">{project.investorCount}</span><span className={`status-pill ${project.status === "active" ? "bg-teal-50 text-teal" : "bg-slate-100 text-slate-600"}`}>{project.status === "active" ? "Active" : "Archived"}</span></div>)}</div></section>; }

function PeopleView({ people, onToggle }: { people: Person[]; onToggle: (id: string, key: "isActive" | "isApproved") => void | Promise<void> }) { const [query, setQuery] = useState(""); const list = people.filter((person) => `${person.name} ${person.phone}`.toLowerCase().includes(query.toLowerCase())); return <section><div><p className="text-base font-bold text-teal">Administration</p><h1 className="mt-1 text-4xl font-extrabold tracking-tight">Users</h1><p className="mt-3 text-lg text-slate-600">Review registration approval and account access.</p></div><label className="relative mt-8 block max-w-xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={21} /><span className="sr-only">Search users</span><input className="field-input pl-12" placeholder="Search by name or phone number" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="panel mt-6 divide-y divide-slate-200 overflow-hidden">{list.map((person) => <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" key={person.id}><div><strong className="text-lg">{person.name}</strong><p className="mt-1 text-base text-slate-600">{person.phone} · {person.investmentCount} collections</p></div>{person.role === "admin" ? <span className="status-pill bg-slate-100 text-slate-600">Administrator</span> : <div className="flex flex-wrap gap-3"><Toggle label="Approved" checked={person.isApproved} onChange={() => void onToggle(person.id, "isApproved")} /><Toggle label="Active" checked={person.isActive} onChange={() => void onToggle(person.id, "isActive")} /></div>}</div>)}</div></section>; }

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) { return <button onClick={onChange} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${checked ? "border-teal bg-teal-50 text-teal" : "border-slate-300 bg-white text-slate-600"}`}><span className={`h-3 w-3 rounded-full ${checked ? "bg-teal" : "bg-slate-300"}`} />{label}: {checked ? "Yes" : "No"}</button>; }

function SettingsView({ previewMode, onToast }: { previewMode: boolean; onToast: (message: string) => void }) { const [approval, setApproval] = useState(false); async function changeApproval() { const next = !approval; if (!previewMode) { try { const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requireRegistrationApproval: next }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Setting could not be updated."); } catch (caught) { onToast(caught instanceof Error ? caught.message : "Setting could not be updated."); return; } } setApproval(next); onToast(next ? "New registrations will need approval." : "New registrations will be approved automatically."); } return <section><div><p className="text-base font-bold text-teal">Administration</p><h1 className="mt-1 text-4xl font-extrabold tracking-tight">Settings</h1><p className="mt-3 text-lg text-slate-600">Control how new registrations are handled.</p></div><div className="panel mt-8 max-w-2xl p-6"><div className="flex gap-4"><ShieldCheck className="mt-1 shrink-0 text-teal" size={28} /><div className="flex-1"><h2 className="text-xl font-extrabold">Require approval for new registrations</h2><p className="mt-2 text-base leading-6 text-slate-600">When turned off, new registrations are approved automatically. Existing user approvals do not change.</p><button className={`mt-5 inline-flex min-h-12 items-center gap-3 rounded-xl px-4 font-bold ${approval ? "bg-teal text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => void changeApproval()}><span className={`relative h-6 w-11 rounded-full ${approval ? "bg-white/30" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${approval ? "left-6" : "left-1"}`} /></span>{approval ? "Approval required" : "Automatic approval"}</button></div></div></div><div className="panel mt-5 max-w-2xl p-6"><h2 className="text-xl font-extrabold">Storage allowance</h2><p className="mt-2 text-base text-slate-600">Each investor can store up to <strong>250 MB</strong> across all their project collections.</p></div></section>; }

function InvestmentDrawer({ previewMode, investment, files, storageRemaining, onClose, onFile }: { previewMode: boolean; investment: Investment; files: EvidenceFile[]; storageRemaining: number; onClose: () => void; onFile: (file: File, categoryId: string, folderId?: string) => Promise<void> }) { const [previewFile, setPreviewFile] = useState<EvidenceFile | null>(null); const [category, setCategory] = useState("contract"); const categoryFiles = files.filter((file) => file.categoryId === category); const selected = evidenceCategories.find((item) => item.id === category)!; return <div className="fixed inset-0 z-40 overflow-hidden"><button aria-label="Close collection" className="absolute inset-0 bg-slate-950/45" onClick={onClose} /><section role="dialog" aria-modal="true" aria-label={`${investment.projectName} evidence`} className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-8"><div><p className="text-sm font-bold text-teal">{investment.reference}</p><h2 className="mt-1 text-2xl font-extrabold text-ink">{investment.projectName}</h2><p className="mt-1 text-base text-slate-600">Choose a folder to view or upload evidence.</p></div><button className="rounded-xl p-3 text-slate-600 hover:bg-slate-100" onClick={onClose} aria-label="Close"><X /></button></header><div className="flex min-h-0 flex-1 flex-col md:flex-row"><aside className="border-b border-slate-200 bg-slate-50 p-3 md:w-64 md:overflow-y-auto md:border-b-0 md:border-r">{evidenceCategories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${category === item.id ? "bg-white text-teal shadow-sm" : "text-slate-700 hover:bg-white/70"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-extrabold ${category === item.id ? "bg-teal text-white" : "bg-slate-200 text-slate-600"}`}>{item.number}</span><span className="min-w-0 flex-1 truncate text-sm font-bold">{item.name}</span><span className="text-xs font-bold text-slate-500">{files.filter((file) => file.categoryId === item.id).length}</span></button>)}</aside><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8"><div><h3 className="text-xl font-extrabold">{selected.name}</h3><p className="mt-1 text-base text-slate-600">{selected.hint}</p></div><div className="mt-6 space-y-3">{categoryFiles.length ? categoryFiles.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><FileText size={22} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-base">{file.name}</strong><span className="mt-1 block text-sm text-slate-500">{file.type} · {formatBytes(file.size)} · {formatDate(file.uploadedAt)}</span></span><button className="rounded-lg px-3 py-2 font-bold text-teal hover:bg-teal-50" onClick={() => setPreviewFile(file)}>View<span className="sr-only"> {file.name}</span></button></div>) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-base text-slate-600">No files have been added to this folder yet.</div>}</div><UploadBox categoryId={category} folderId={investment.folderIds?.[category]} storageRemaining={storageRemaining} onFile={onFile} /></div></div></section>{previewFile && <EvidencePreview key={previewFile.id} file={previewFile} previewMode={previewMode} onClose={() => setPreviewFile(null)} />}</div>; }

function UploadBox({ categoryId, folderId, storageRemaining, onFile }: { categoryId: string; folderId?: string; storageRemaining: number; onFile: (file: File, categoryId: string, folderId?: string) => Promise<void> }) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const busy = useRef(false);
  async function upload(selected: File[]) {
    if (busy.current || !selected.length) return;
    if (selected.reduce((sum, file) => sum + file.size, 0) > storageRemaining) { setProgress("These files exceed your remaining storage. Choose fewer files."); return; }
    busy.current = true;
    try { for (let index = 0; index < selected.length; index++) { setProgress(`Uploading ${index + 1} of ${selected.length}: ${selected[index].name}`); await onFile(selected[index], categoryId, folderId); } }
    finally { busy.current = false; setProgress(""); }
  }
  function choose(event: ChangeEvent<HTMLInputElement>) { const selected = Array.from(event.target.files ?? []); event.target.value = ""; void upload(selected); }
  return <div className="mt-6"><label onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy.current ? "none" : "copy"; setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }} className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-teal px-5 py-8 text-center transition focus-within:ring-2 focus-within:ring-teal ${dragging ? "bg-[#d9f0ef]" : "bg-teal-50"}`}>
    <Upload size={28} className="text-teal" /><strong className="mt-3 text-lg">{busy.current ? "Uploading evidence…" : "Drop files here or choose files"}</strong><span className="mt-1 text-base text-slate-600">Choose files from your phone or computer</span><span className="mt-3 text-sm font-bold text-slate-500">{formatBytes(storageRemaining)} remaining</span><input aria-label="Upload evidence" type="file" className="sr-only" multiple disabled={busy.current} onChange={choose} />
  </label><p role="status" className="mt-2 break-words text-sm text-slate-600">{progress}</p></div>;
}

function EvidencePreview({ file, previewMode, onClose }: { file: EvidenceFile; previewMode: boolean; onClose: () => void }) {
  const [url, setUrl] = useState(file.localUrl ?? "");
  const [error, setError] = useState("");
  const [mime, setMime] = useState(file.mimeType ?? "");
  useEffect(() => {
    if (file.localUrl) return;
    if (previewMode) { setError("This sample file has no stored content. Upload a file to try the preview. Preview uploads last only until you refresh."); return; }
    const controller = new AbortController(); let objectUrl = "";
    void (async () => { try {
      const response = await fetch(`/api/files/${file.id}`, { signal: controller.signal });
      if (!response.ok) throw new Error("This file could not be opened. Please try again.");
      const blob = await response.blob(); if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setMime(blob.type); setUrl(objectUrl);
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "This file could not be opened."); } })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.localUrl, previewMode]);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); }, [onClose]);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = /^(image\/(jpeg|png|gif|webp|avif|bmp))$/.test(mime) || /^(jpe?g|png|gif|webp|avif|bmp)$/.test(extension) ? "image" : mime.startsWith("audio/") || /^(mp3|wav|ogg|m4a|aac|flac)$/.test(extension) ? "audio" : mime.startsWith("video/") || /^(mp4|webm|mov)$/.test(extension) ? "video" : mime === "application/pdf" || extension === "pdf" ? "pdf" : "other";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`} className="flex max-h-full w-full max-w-4xl flex-col rounded-2xl bg-white p-5"><header className="flex items-center justify-between gap-3"><h2 className="break-all text-lg font-bold">{file.name}</h2><button autoFocus aria-label="Close preview" onClick={onClose} className="rounded-lg p-3"><X /></button></header><div className="min-h-0 overflow-auto py-4">
    {error ? <p role="alert">{error}</p> : !url ? <p role="status">Loading file…</p> : kind === "image" ? <img src={url} alt={file.name} className="mx-auto max-h-[65vh] object-contain" /> : kind === "audio" ? <audio controls src={url} className="w-full" onError={() => setError("Your browser cannot play this audio format. Download the file to open it.")} /> : kind === "video" ? <video controls src={url} className="max-h-[65vh] w-full" onError={() => setError("Your browser cannot play this video format. Download the file to open it.")} /> : kind === "pdf" ? <iframe sandbox="" title={file.name} src={url} className="h-[65vh] w-full" /> : <p>This file format cannot be previewed here. Download it to open it on your device.</p>}
  </div>{url && <a href={url} download={file.name} className="button-primary self-start">Download file</a>}</section></div>;
}


function CreateInvestmentDialog({ projects, investments, onClose, onCreate }: { projects: Project[]; investments: Investment[]; onClose: () => void; onCreate: (projectId: string) => void | Promise<void> }) { const [projectId, setProjectId] = useState(""); return <Modal title="Create an investment" subtitle="Choose the project for this evidence collection." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (projectId) void onCreate(projectId); }} className="mt-6"><label className="field-label" htmlFor="project">Project</label><select id="project" className="field-input" required value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Choose a project</option>{projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}{investments.some((investment) => investment.projectId === project.id) ? " — collection exists" : ""}</option>)}</select><p className="mt-3 text-sm leading-5 text-slate-600">A collection has seven folders for your contract, payments, police report and other evidence.</p><button className="button-primary mt-7 w-full"><FilePlus2 size={20} />Create evidence collection</button></form></Modal>; }

function CreateProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void | Promise<void> }) { const [name, setName] = useState(""); return <Modal title="Add a project" subtitle="Investors will see active projects in their selection list." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) void onCreate(name.trim()); }} className="mt-6"><label className="field-label" htmlFor="project-name">Project name</label><input id="project-name" className="field-input" placeholder="For example, Project Evergreen" value={name} onChange={(event) => setName(event.target.value)} required autoFocus /><button className="button-primary mt-7 w-full"><Plus size={20} />Add project</button></form></Modal>; }

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 sm:items-center sm:justify-center sm:p-6"><button className="absolute inset-0" onClick={onClose} aria-label="Close dialog" /><section role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"><button className="absolute right-4 top-4 rounded-xl p-2 text-slate-600 hover:bg-slate-100" onClick={onClose} aria-label="Close"><X /></button><h2 className="pr-10 text-2xl font-extrabold">{title}</h2><p className="mt-2 text-base leading-6 text-slate-600">{subtitle}</p>{children}</section></div>; }

function CheckIcon() { return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-xs">✓</span>; }
