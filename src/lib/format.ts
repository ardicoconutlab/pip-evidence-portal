export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const mb = bytes / 1_000_000;
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
