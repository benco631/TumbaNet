# TumbaNet

The official network of the Tumbas. Built on Next.js 14, NextAuth, Prisma +
PostgreSQL (primary data store) and Firebase (auth helper + admin SDK).

This README documents how to run TumbaNet locally and how to operate the
**production** and **staging** environments side by side on Vercel.

---

## Local development

```bash
npm install
cp .env.example .env       # then fill in values
npm run db:push            # sync Prisma schema to your local DB
npm run dev                # http://localhost:3000
```

For local dev, point `DATABASE_URL` at any Postgres instance you control
(local Postgres, a personal Neon branch, etc.) and point the Firebase vars at
your staging Firebase project. Use `APP_ENV=staging` if you want to exercise
the staging gate locally.

---

## Environments

TumbaNet supports two runtime environments selected by the `APP_ENV` variable:

| `APP_ENV`     | Audience            | Gate                                  |
| ------------- | ------------------- | ------------------------------------- |
| `production`  | Public users        | None — open to anyone with an account |
| `staging`     | Internal team only  | `TEAM_ALLOWED_EMAILS` allowlist       |

When `APP_ENV` is not set, the app defaults to `production` behavior — i.e. no
staging gate is applied. Production deployments are never affected by the
staging logic.

### Staging gate (how it works)

- Implemented in [`src/middleware.ts`](src/middleware.ts) and short-circuits
  immediately when `APP_ENV !== "staging"`.
- For non-allowlisted users it rewrites HTML requests to
  [`/staging-blocked`](src/app/staging-blocked/page.tsx) and returns
  `403 { error: "Staging access only" }` for `/api/*` calls.
- Public paths that bypass the gate so users can sign in/out:
  `/login`, `/register`, `/api/auth/*`, `/api/register`, `/staging-blocked`.
- The allowlist (`TEAM_ALLOWED_EMAILS`) is comma-separated, case-insensitive,
  matched against the email on the NextAuth JWT.

---

## Environment variables

All variables come from the runtime environment — there are no hardcoded
URLs, secrets, or Firebase configs in the source.

### App + auth gate

| Variable                | Required | Purpose                                                                 |
| ----------------------- | -------- | ----------------------------------------------------------------------- |
| `APP_ENV`               | optional | `production` (default) or `staging`. Drives the staging gate.           |
| `NEXTAUTH_SECRET`       | yes      | NextAuth JWT signing secret. Generate: `openssl rand -base64 32`.       |
| `NEXTAUTH_URL`          | yes      | Public URL of this deployment (e.g. `https://tumbanet.vercel.app`).     |
| `TEAM_ALLOWED_EMAILS`   | staging  | Comma-separated allowlist. Required only when `APP_ENV=staging`.        |

### Database (Prisma + PostgreSQL — primary data store)

| Variable        | Required | Purpose                                                                       |
| --------------- | -------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`  | yes      | Postgres connection string used by Prisma at runtime (pooled).                |
| `DIRECT_URL`    | yes      | Direct (non-pooled) connection string used for `prisma db push` / migrations. |

### Firebase (client SDK — public, exposed to the browser)

Read by [`lib/firebase.ts`](lib/firebase.ts). Values come from
**Firebase Console → Project Settings → Your apps → Web app SDK config**.

| Variable                                    | Required |
| ------------------------------------------- | -------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`              | yes      |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`          | yes      |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`           | yes      |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`       | yes      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`  | yes      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`               | yes      |

### Firebase Admin (server-side — keep secret)

Read by [`lib/firebase-admin.ts`](lib/firebase-admin.ts). Values come from a
service account JSON downloaded via **Firebase Console → Project Settings →
Service accounts → Generate new private key**.

| Variable                | Required | Notes                                              |
| ----------------------- | -------- | -------------------------------------------------- |
| `FIREBASE_PROJECT_ID`   | yes      | Same project ID as the client SDK above.           |
| `FIREBASE_CLIENT_EMAIL` | yes      | From the service account JSON.                     |
| `FIREBASE_PRIVATE_KEY`  | yes      | Keep newlines escaped as `\n` when stored in env.  |

See [`.env.example`](.env.example) for a working template.

---

## Creating the two databases

You need **two completely separate Postgres databases** — one for production
data, one for staging tests. Never share a database between environments.

### Recommended: Neon (via Vercel Storage)

1. In the Vercel dashboard, open **Storage → Create Database → Neon Postgres**.
2. Create the first database: name it `tumbanet-prod`. Copy the pooled
   `DATABASE_URL` and the unpooled `DIRECT_URL`.
3. Create a second database: `tumbanet-staging`. Copy its `DATABASE_URL` and
   `DIRECT_URL` separately.
4. Apply the schema to each database from your machine (one-time, and after
   every schema change):

   ```bash
   # Production schema
   DATABASE_URL="<prod pooled url>" DIRECT_URL="<prod direct url>" npm run db:push

   # Staging schema
   DATABASE_URL="<staging pooled url>" DIRECT_URL="<staging direct url>" npm run db:push
   ```

   Prisma reads `DATABASE_URL` from whichever environment you invoke it under
   ([`prisma/schema.prisma`](prisma/schema.prisma) declares
   `url = env("DATABASE_URL")`), so the same command works for both — only the
   env values change.

> Any other Postgres provider (Supabase, RDS, Railway, self-hosted) works the
> same way: provision two databases, capture two pairs of URLs.

---

## Creating the two Firebase projects

You need **two completely separate Firebase projects** — production and
staging never share Firebase auth users, storage buckets, or rules.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and
   click **Add project**. Name the first one **`tumbanet-production`**.
2. Repeat for **`tumbanet-staging`**.
3. For each project:
   - Enable the auth providers you use (Email/Password etc.) under
     **Authentication → Sign-in method**.
   - Register a Web app under **Project settings → Your apps → Web**. Copy the
     SDK config — those six values become the
     `NEXT_PUBLIC_FIREBASE_*` env vars for that environment.
   - Under **Project settings → Service accounts**, click
     **Generate new private key**. The downloaded JSON gives you
     `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`
     for that environment.
4. Configure Firestore / Storage rules per project as needed. Apply identical
   rules to both unless you intentionally want them to differ.

> Production Vercel only ever sees the production Firebase config. Staging
> Vercel only ever sees the staging Firebase config. They cannot read or write
> each other's auth users, storage objects, or Firestore documents.

---

## Vercel setup

You will run **one Vercel project with two deployments**: production tracks
`main`, staging tracks the `staging` branch.

### 1. Production environment variables

In Vercel → Project → **Settings → Environment Variables**, add the following
to the **Production** environment:

| Name                                       | Value                                                |
| ------------------------------------------ | ---------------------------------------------------- |
| `APP_ENV`                                  | `production`                                         |
| `DATABASE_URL`                             | Production Neon pooled connection string             |
| `DIRECT_URL`                               | Production Neon direct connection string             |
| `NEXTAUTH_SECRET`                          | A unique secret (different from staging)             |
| `NEXTAUTH_URL`                             | `https://<your-prod-domain>`                         |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | From the **production** Firebase web app config      |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | From the **production** Firebase web app config      |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | `tumbanet-production`                                |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | From the **production** Firebase web app config      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From the **production** Firebase web app config      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | From the **production** Firebase web app config      |
| `FIREBASE_PROJECT_ID`                      | `tumbanet-production`                                |
| `FIREBASE_CLIENT_EMAIL`                    | Production service account email                     |
| `FIREBASE_PRIVATE_KEY`                     | Production service account private key (`\n` escaped)|

`TEAM_ALLOWED_EMAILS` is not needed in production.

### 2. Staging environment variables

Add the following to the **Preview** environment, scoped to the `staging`
branch (Vercel lets you scope each variable to a specific git branch):

| Name                                       | Value                                                |
| ------------------------------------------ | ---------------------------------------------------- |
| `APP_ENV`                                  | `staging`                                            |
| `DATABASE_URL`                             | Staging Neon pooled connection string                |
| `DIRECT_URL`                               | Staging Neon direct connection string                |
| `NEXTAUTH_SECRET`                          | A unique secret (different from production)          |
| `NEXTAUTH_URL`                             | The staging deployment URL                           |
| `TEAM_ALLOWED_EMAILS`                      | Comma-separated team emails, e.g. `alice@x.com,bob@x.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | From the **staging** Firebase web app config         |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | From the **staging** Firebase web app config         |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | `tumbanet-staging`                                   |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | From the **staging** Firebase web app config         |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From the **staging** Firebase web app config         |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | From the **staging** Firebase web app config         |
| `FIREBASE_PROJECT_ID`                      | `tumbanet-staging`                                   |
| `FIREBASE_CLIENT_EMAIL`                    | Staging service account email                        |
| `FIREBASE_PRIVATE_KEY`                     | Staging service account private key (`\n` escaped)   |

> **Critical:** make sure no production Firebase value leaks into the staging
> scope (and vice-versa). Vercel's per-branch scoping is the right tool — set
> production values on **Production**, set staging values on **Preview** with
> the branch filter pinned to `staging`.

### 3. Connecting branches to environments

In Vercel → Project → **Settings → Git**:

- **Production Branch**: `main` → every push to `main` deploys to the
  production URL with the production env vars (production database +
  production Firebase project).
- **Staging branch**: keep a long-lived `staging` branch. Vercel deploys
  every push to `staging` as a preview using the preview env vars scoped to
  that branch (staging database + staging Firebase project + email gate).

Optional but recommended: assign a stable custom domain (or Vercel alias) to
the latest `staging` deployment so the URL doesn't change on every push.

---

## Recommended workflow

```
feature branch → staging → main
       │           │         │
       │           │         └── Production deployment (public)
       │           │             prod database + prod Firebase project
       │           └──────────── Staging deployment (team-only)
       │                         staging database + staging Firebase project
       └──────────────────────── Local dev / Vercel preview
```

1. Branch off `staging` for any new feature: `git checkout -b feature/foo staging`.
2. Open a PR into `staging`. Merging deploys to the staging URL behind the
   email gate, against the staging database and staging Firebase project.
3. Test on staging. Iterate until happy.
4. Open a PR from `staging` → `main`. Merging deploys to production with the
   production database and production Firebase project.
5. Never commit directly to `main`. Never run experimental migrations against
   the production database, and never sign into the production Firebase
   project from a staging deployment.

---

## Prisma & migrations

The Prisma datasource is environment-driven:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

There are no hardcoded database URLs anywhere in the codebase. Every Prisma
command (`db push`, `migrate`, `studio`, `generate`) reads `DATABASE_URL`
from the current shell environment, so you control which database you hit
purely by which env values are loaded.

| Task                                | Command                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Sync schema to current DB           | `npm run db:push`                                                      |
| Open Prisma Studio                  | `npm run db:studio`                                                    |
| Regenerate Prisma client            | `npx prisma generate` (also runs automatically via `postinstall`)      |
| Apply schema to staging from CLI    | `DATABASE_URL=<staging> DIRECT_URL=<staging> npm run db:push`          |
| Apply schema to production from CLI | `DATABASE_URL=<prod> DIRECT_URL=<prod> npm run db:push`                |

**Always run schema changes against staging first**, verify in the staging
app, then apply the same change to the production database.

---

## Troubleshooting

- **Production users see the staging gate.** Confirm `APP_ENV=production` (or
  unset) in the Vercel **Production** environment, then redeploy.
- **Team members can't access staging.** Check that their email — exactly as
  they signed in — appears in `TEAM_ALLOWED_EMAILS`. The check is
  case-insensitive but must match the email NextAuth issues for that user.
- **`/api/*` returns `403 Staging access only` for an allowed user.** Make
  sure the user is signed in (the gate reads the NextAuth JWT). Sign out and
  back in; confirm the JWT cookie is set on the staging domain.
- **Schema drift between environments.** Re-run `npm run db:push` against the
  affected database with the matching `DATABASE_URL` / `DIRECT_URL`.
- **Firebase calls hit the wrong project.** Open the deployment's Vercel
  build logs and confirm `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches the
  expected project. The client SDK config is baked into the bundle at build
  time, so changing it in Vercel requires a redeploy.
- **`FIREBASE_PRIVATE_KEY` parse errors on the server.** Make sure newlines
  in the env var are escaped as `\n` — `lib/firebase-admin.ts` un-escapes
  them at runtime.
