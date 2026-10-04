-- Evidence Portal initial schema. Run this in Supabase before enabling live mode.
create extension if not exists pgcrypto;

create type public.app_role as enum ('investor', 'admin');
create type public.project_status as enum ('active', 'archived');
create type public.file_status as enum ('uploading', 'available', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null unique check (phone ~ '^\\+65[3689][0-9]{7}$'),
  role public.app_role not null default 'investor',
  is_approved boolean not null default true,
  is_active boolean not null default true,
  storage_limit_bytes bigint not null default 250000000 check (storage_limit_bytes > 0),
  used_storage_bytes bigint not null default 0 check (used_storage_bytes >= 0),
  reserved_storage_bytes bigint not null default 0 check (reserved_storage_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  id boolean primary key default true check (id),
  require_registration_approval boolean not null default false,
  default_user_storage_limit_bytes bigint not null default 250000000 check (default_user_storage_limit_bytes > 0),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique check (char_length(name) between 2 and 160),
  status public.project_status not null default 'active',
  drive_folder_id text unique,
  drive_status text not null default 'pending' check (drive_status in ('pending', 'ready', 'failed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence_categories (
  id text primary key,
  position smallint not null unique check (position between 1 and 7),
  name text not null,
  hint text,
  created_at timestamptz not null default now()
);

insert into public.evidence_categories (id, position, name, hint) values
  ('contract', 1, 'Contract', 'Agreements, letters and terms'),
  ('payment', 2, 'Payment', 'Receipts, transfers and statements'),
  ('evidence_3', 3, 'Evidence Three', 'To be confirmed'),
  ('evidence_4', 4, 'Evidence Four', 'To be confirmed'),
  ('evidence_5', 5, 'Evidence Five', 'To be confirmed'),
  ('police_report', 6, 'Police Report', 'Reports already submitted'),
  ('other', 7, 'Others', 'Any other relevant material')
on conflict (id) do nothing;

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  owner_id uuid not null references public.profiles(id),
  project_id uuid not null references public.projects(id),
  drive_folder_id text unique,
  drive_status text not null default 'pending' check (drive_status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, project_id)
);

create table public.investment_folders (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  category_id text not null references public.evidence_categories(id),
  drive_folder_id text unique,
  drive_status text not null default 'pending' check (drive_status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  unique (investment_id, category_id)
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete restrict,
  folder_id uuid not null references public.investment_folders(id) on delete restrict,
  category_id text not null references public.evidence_categories(id),
  uploaded_by uuid not null references public.profiles(id),
  original_name text not null check (char_length(original_name) between 1 and 512),
  mime_type text,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 250000000),
  drive_file_id text unique,
  sha256_checksum text,
  status public.file_status not null default 'uploading',
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  evidence_file_id uuid not null unique references public.evidence_files(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  drive_upload_url text not null,
  uploaded_bytes bigint not null default 0 check (uploaded_bytes >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investments_owner_id_idx on public.investments(owner_id);
create index investments_project_id_idx on public.investments(project_id);
create index evidence_files_investment_id_idx on public.evidence_files(investment_id);
create index upload_sessions_owner_id_idx on public.upload_sessions(owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger investments_updated_at before update on public.investments for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.upload_sessions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  approval_required boolean;
  user_limit bigint;
begin
  select require_registration_approval, default_user_storage_limit_bytes
  into approval_required, user_limit from public.app_settings where id = true;
  insert into public.profiles (id, full_name, phone, is_approved, storage_limit_bytes)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Unnamed user'),
    new.phone,
    not coalesce(approval_required, false),
    coalesce(user_limit, 250000000)
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_active and is_approved);
$$;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.projects enable row level security;
alter table public.evidence_categories enable row level security;
alter table public.investments enable row level security;
alter table public.investment_folders enable row level security;
alter table public.evidence_files enable row level security;
alter table public.upload_sessions enable row level security;

create policy "profiles: self or admin can view" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "settings: admin can view" on public.app_settings for select using (public.is_admin());
create policy "projects: active users can view" on public.projects for select using (public.is_active_user());
create policy "categories: active users can view" on public.evidence_categories for select using (public.is_active_user());
create policy "investments: owner or admin can view" on public.investments for select using (owner_id = auth.uid() or public.is_admin());
create policy "folders: owner or admin can view" on public.investment_folders for select using (public.is_admin() or exists (select 1 from public.investments i where i.id = investment_id and i.owner_id = auth.uid()));
create policy "files: owner or admin can view" on public.evidence_files for select using (public.is_admin() or exists (select 1 from public.investments i where i.id = investment_id and i.owner_id = auth.uid()));
create policy "sessions: owner can view" on public.upload_sessions for select using (owner_id = auth.uid() or public.is_admin());

-- All writes are performed by server routes using the Supabase secret key after
-- checking the signed-in user. Browser clients are intentionally read-only.

create or replace function public.reserve_storage(p_owner_id uuid, p_bytes bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  profile_row public.profiles;
begin
  select * into profile_row from public.profiles where id = p_owner_id for update;
  if profile_row.id is null or p_bytes < 1 then return false; end if;
  if profile_row.used_storage_bytes + profile_row.reserved_storage_bytes + p_bytes > profile_row.storage_limit_bytes then return false; end if;
  update public.profiles set reserved_storage_bytes = reserved_storage_bytes + p_bytes where id = p_owner_id;
  return true;
end;
$$;

create or replace function public.complete_storage_reservation(p_file_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  file_row public.evidence_files;
begin
  select * into file_row from public.evidence_files where id = p_file_id for update;
  if file_row.id is null or file_row.status <> 'available' then return false; end if;
  update public.profiles
  set reserved_storage_bytes = greatest(reserved_storage_bytes - file_row.byte_size, 0),
      used_storage_bytes = used_storage_bytes + file_row.byte_size
  where id = file_row.uploaded_by;
  return true;
end;
$$;

create or replace function public.release_storage_reservation(p_owner_id uuid, p_bytes bigint)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set reserved_storage_bytes = greatest(reserved_storage_bytes - p_bytes, 0) where id = p_owner_id;
$$;

revoke all on function public.reserve_storage(uuid, bigint) from public, anon, authenticated;
revoke all on function public.complete_storage_reservation(uuid) from public, anon, authenticated;
revoke all on function public.release_storage_reservation(uuid, bigint) from public, anon, authenticated;
grant execute on function public.reserve_storage(uuid, bigint) to service_role;
grant execute on function public.complete_storage_reservation(uuid) to service_role;
grant execute on function public.release_storage_reservation(uuid, bigint) to service_role;
