export type Role = "investor" | "admin";
export type PortalView = "investments" | "projects" | "people" | "settings";
export type UploadStatus = "uploading" | "available" | "failed";

export interface Project {
  id: string;
  code: string;
  name: string;
  status: "active" | "archived";
  investorCount: number;
}

export interface Investment {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  lastActivityAt: string;
  fileCount: number;
  folderIds?: Record<string, string>;
}

export interface EvidenceFile {
  mimeType?: string;
  localUrl?: string;
  id: string;
  investmentId: string;
  categoryId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: UploadStatus;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  role: Role;
  isApproved: boolean;
  isActive: boolean;
  investmentCount: number;
}
