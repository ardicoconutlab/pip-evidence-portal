export const MAX_STORAGE_BYTES = Number(
  process.env.DEFAULT_USER_STORAGE_LIMIT_BYTES ?? 250_000_000,
);

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const isDriveConfigured = Boolean(
  process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID &&
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID &&
    (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS),
);
