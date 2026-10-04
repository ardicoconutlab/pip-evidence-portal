import { FolderLock } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-navy">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
        <FolderLock size={24} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-lg font-extrabold">Evidence Portal</span>
        </span>
      )}
    </div>
  );
}
