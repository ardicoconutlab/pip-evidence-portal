import type { EvidenceFile, Investment, Person, Project } from "@/types/portal";

export const evidenceCategories = [
  { id: "contract", number: "01", name: "Contract", hint: "Agreements, letters and terms" },
  { id: "payment", number: "02", name: "Payment", hint: "Receipts, transfers and statements" },
  { id: "evidence_3", number: "03", name: "Evidence Three", hint: "To be confirmed" },
  { id: "evidence_4", number: "04", name: "Evidence Four", hint: "To be confirmed" },
  { id: "evidence_5", number: "05", name: "Evidence Five", hint: "To be confirmed" },
  { id: "police_report", number: "06", name: "Police Report", hint: "Reports already submitted" },
  { id: "other", number: "07", name: "Others", hint: "Any other relevant material" },
] as const;

export const demoProjects: Project[] = [
  { id: "prj-001", code: "PRJ-001", name: "Project Alpha", status: "active", investorCount: 32 },
  { id: "prj-002", code: "PRJ-002", name: "Project Beacon", status: "active", investorCount: 18 },
  { id: "prj-003", code: "PRJ-003", name: "Project Crest", status: "active", investorCount: 11 },
  { id: "prj-004", code: "PRJ-004", name: "Project Delta", status: "archived", investorCount: 7 },
];

export const demoFiles: EvidenceFile[] = [
  {
    id: "file-001",
    investmentId: "inv-001",
    categoryId: "contract",
    name: "Investment agreement.pdf",
    type: "PDF",
    size: 2_400_000,
    uploadedAt: "2026-09-27T10:30:00.000Z",
    status: "available",
  },
  {
    id: "file-002",
    investmentId: "inv-001",
    categoryId: "payment",
    name: "Bank transfer receipt.jpg",
    type: "JPG",
    size: 1_800_000,
    uploadedAt: "2026-09-28T09:00:00.000Z",
    status: "available",
  },
  {
    id: "file-003",
    investmentId: "inv-002",
    categoryId: "other",
    name: "WhatsApp conversation.pdf",
    type: "PDF",
    size: 4_200_000,
    uploadedAt: "2026-09-25T16:15:00.000Z",
    status: "available",
  },
];

export const demoInvestments: Investment[] = [
  {
    id: "inv-001",
    reference: "INV-000123",
    projectId: "prj-001",
    projectName: "Project Alpha",
    ownerId: "user-001",
    ownerName: "Mary Tan",
    createdAt: "2026-09-26T10:00:00.000Z",
    lastActivityAt: "2026-09-28T09:00:00.000Z",
    fileCount: 2,
  },
  {
    id: "inv-002",
    reference: "INV-000124",
    projectId: "prj-002",
    projectName: "Project Beacon",
    ownerId: "user-001",
    ownerName: "Mary Tan",
    createdAt: "2026-09-22T10:00:00.000Z",
    lastActivityAt: "2026-09-25T16:15:00.000Z",
    fileCount: 1,
  },
  {
    id: "inv-003",
    reference: "INV-000125",
    projectId: "prj-001",
    projectName: "Project Alpha",
    ownerId: "user-002",
    ownerName: "David Lim",
    createdAt: "2026-09-18T10:00:00.000Z",
    lastActivityAt: "2026-09-24T11:20:00.000Z",
    fileCount: 4,
  },
  {
    id: "inv-004",
    reference: "INV-000126",
    projectId: "prj-003",
    projectName: "Project Crest",
    ownerId: "user-003",
    ownerName: "Siti Rahman",
    createdAt: "2026-09-15T10:00:00.000Z",
    lastActivityAt: "2026-09-21T08:30:00.000Z",
    fileCount: 3,
  },
];

export const demoPeople: Person[] = [
  { id: "user-001", name: "Mary Tan", phone: "+65 8123 4567", role: "investor", isApproved: true, isActive: true, investmentCount: 2 },
  { id: "user-002", name: "David Lim", phone: "+65 8765 4321", role: "investor", isApproved: true, isActive: true, investmentCount: 1 },
  { id: "user-003", name: "Siti Rahman", phone: "+65 9234 5678", role: "investor", isApproved: false, isActive: true, investmentCount: 1 },
  { id: "admin-001", name: "Aisha Admin", phone: "+65 8111 2233", role: "admin", isApproved: true, isActive: true, investmentCount: 0 },
];
