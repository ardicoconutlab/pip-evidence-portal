import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function getGoogleCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return undefined;
  try { return JSON.parse(raw) as Record<string, string>; } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON."); }
}

export function getDriveClient() {
  const credentials = getGoogleCredentials();
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return { auth, drive: google.drive({ version: "v3", auth }) };
}

export async function createDriveFolder(name: string, parentId: string) {
  const { drive } = getDriveClient();
  const result = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME_TYPE, parents: [parentId] },
    supportsAllDrives: true,
    fields: "id",
  });
  if (!result.data.id) throw new Error("Google Drive did not return a folder ID.");
  return result.data.id;
}

export async function createDriveUploadSession({ name, mimeType, parentId }: { name: string; mimeType: string; parentId: string }) {
  const { auth } = getDriveClient();
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Could not access Google Drive.");
  const safeName = name.replace(/[\\/\0]/g, "_");
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType || "application/octet-stream",
    },
    body: JSON.stringify({ name: safeName, parents: [parentId] }),
  });
  if (!response.ok) throw new Error("Google Drive could not prepare this upload.");
  const url = response.headers.get("location");
  if (!url) throw new Error("Google Drive did not create an upload session.");
  return url;
}
