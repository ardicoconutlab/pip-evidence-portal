import { PortalExperience } from "@/components/portal-experience";

// Internal visual review route. It does not read or write any production data.
export default function PreviewPage() {
  return <PortalExperience previewMode />;
}
