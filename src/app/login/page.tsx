import { AuthScreen } from "@/components/auth-screen";
import { isSupabaseConfigured } from "@/lib/config";

export default function LoginPage() {
  return <AuthScreen previewMode={!isSupabaseConfigured} />;
}
