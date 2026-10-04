# Evidence Portal

Evidence Portal collects project evidence from investors. It is built with Next.js for Vercel, Supabase for authentication and data, Twilio through Supabase for SMS codes, and a private Google Workspace Shared Drive for files.

## What is included

- Registration with full name and Singapore mobile number; new registrations are approved automatically.
- Passwordless SMS login for registered phone numbers.
- Investor collections: one collection per investor and project.
- Seven standard evidence folders: Contract, Payment, Evidence Three, Evidence Four, Evidence Five, Police Report, and Others.
- Support for all file formats, with a 250 MB total allowance per investor.
- 4 MB resumable upload chunks so uploads work within Vercel Function limits.
- Administrator views for investments, projects, users, and registration approval settings.
- Database-level access rules so investors can see only their own collections and files.
- `/preview`, a local sample-data review route that never reads or writes production data.

## Start locally

1. Copy `.env.example` to `.env` and fill in the values below.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000/login` for the live login flow, or `http://localhost:3000/preview` to review the interface without credentials.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
3. In **Authentication → Providers**, enable Phone authentication and configure Twilio there. The application does not need Twilio credentials in its own environment file.
4. In **Authentication → URL Configuration**, add the local and production application URLs.
5. Register the first administrator through the portal, then in the SQL Editor run the following with their actual phone number:

```sql
update public.profiles
set role = 'admin'
where phone = '+65XXXXXXXX';
```

The code marks registrations as confirmed in Supabase when they are created. This matches the agreed flow: registration is not OTP-verified, while each login uses an SMS OTP.

## Google Drive setup

1. Use a Google Workspace **Shared Drive**, not a person&apos;s My Drive.
2. Create the chosen root folder inside that Shared Drive.
3. Enable Google Drive API in a Google Cloud project.
4. Create a dedicated service account and give it access to the Shared Drive with permission to create folders and upload files.
5. Set `GOOGLE_DRIVE_SHARED_DRIVE_ID` and `GOOGLE_DRIVE_ROOT_FOLDER_ID` using the Drive and folder IDs from their URLs.
6. For local development, set `GOOGLE_APPLICATION_CREDENTIALS` to the path of the service-account JSON file. For Vercel, set `GOOGLE_SERVICE_ACCOUNT_JSON` to the complete JSON content as a protected environment variable.

The portal creates this structure automatically:

```text
Root folder/
└── Project name — PRJ-001/
    └── Investor name — INV-000123/
        ├── 01 Contract/
        ├── 02 Payment/
        ├── 03 Evidence Three/
        ├── 04 Evidence Four/
        ├── 05 Evidence Five/
        ├── 06 Police Report/
        └── 07 Others/
```

Investors do not need Google accounts and are never given direct Drive access.

## Environment values

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project API keys |
| `SUPABASE_SECRET_KEY` | Supabase project API keys; server only |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string; local administration only |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project |
| `GOOGLE_DRIVE_SHARED_DRIVE_ID` | Shared Drive URL |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root folder URL |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local path to a service-account JSON file |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service-account JSON content for Vercel |
| `NEXT_PUBLIC_APP_URL` | Local or deployed portal URL |
| `DEFAULT_USER_STORAGE_LIMIT_BYTES` | `250000000` by default |

Twilio configuration belongs in Supabase: **Account SID**, **Auth Token**, and **Messaging Service SID**. Complete Singapore sender registration before going live so recipients do not see an unexpected sender label.

## Deploy to Vercel

1. Push this directory to a private Git repository.
2. Import the repository into Vercel.
3. Add all required values from `.env.example` under **Project Settings → Environment Variables**.
4. Set `GOOGLE_SERVICE_ACCOUNT_JSON`; do not use a local credentials file in Vercel.
5. Add the Vercel domain to Supabase Auth&apos;s allowed URLs.
6. Deploy, then register the first administrator and promote their role using the SQL statement above.

Vercel Functions limit individual request bodies to 4.5 MB. The portal keeps each file transfer below that limit by splitting it into 4 MB chunks and forwarding the chunks to a Google Drive resumable upload session.

## Checks run

```text
npm run lint
npx tsc --noEmit
npm run build
```
