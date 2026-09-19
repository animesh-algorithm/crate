# Crate

A private home for your Instagram saves. A free, browser-first application with optional Google accounts and private synchronization. Cream, purple, yellow, and sage editorial surfaces translate the supplied mobile reference into a responsive personal library.

## Run locally

Node 22.12+, Node 24, or Node 26+:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Without environment variables, the app stores your library on this device. “Take a look around first” opens a clearly marked synthetic sample library, separate from personal data. Real personal exports are never included in this repository.

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

npm and package-lock.json provide reproducible installs locally and in CI. Maintain one lockfile.

## Stack

React 19, TypeScript, Vite, React Router, CSS design tokens, Lucide, self-hosted DM Sans and Barlow Condensed. Dexie/IndexedDB stores local libraries, revisions, and search vectors. MiniSearch provides exact search. Transformers.js runs pinned quantized multilingual E5-small in a dedicated browser worker. Source-based collection suggestions work without downloading a model. Supabase Free provides PostgreSQL, Row Level Security, Google authentication, atomic revision checks, and an account-deletion function. Vercel Hobby serves static assets only while this remains a personal, non-commercial project under Vercel's current terms.

## Optional online accounts

1. Create a Supabase **Free** project. Apply `supabase/migrations/202609190001_library.sql`, then `supabase/migrations/202609190002_organization.sql`, using the SQL editor or Supabase CLI.
2. Copy `.env.example` to `.env`. Set the public URL and anon/publishable key. Never use a service-role key in Vite variables.
3. Configure Google OAuth in Google Cloud and Supabase. Google's callback is the Supabase `/auth/v1/callback` URL. Supabase's allowed app redirect is `https://YOUR-SITE.vercel.app/auth/callback`. Use exact origins, not production wildcards.
4. Set `APP_ORIGIN` for the deletion function, deploy `supabase/functions/delete-account`, and verify bearer-token validation with a real account. Supabase supplies its service-role secret inside the function only.
5. Import the GitHub repository into a Vercel Hobby project, use `npm run build` with `dist` as the output directory, and use `vercel.json` for the SPA fallback and security headers. Preview and production use separate project keys. Do not start a paid plan, trial, or paid overages. Reconfirm Vercel's personal/non-commercial Hobby eligibility immediately before public release.
6. Complete the public release checks in OPERATIONS.md. New cloud library activation is **closed by default**. Once checks pass, an operator may run `update public.release_config set accepting=true where id=true;`. Ten active libraries are allowed initially.

Device-only data is not silently uploaded when you sign in. Export the local library, sign in, then restore the backup to transfer it deliberately. Signing out of an online account clears its local cache; pending changes must first sync or be exported and explicitly resolved.

## Capabilities

Array-based Instagram saved JSON preview, malformed-entry report, canonical duplicate identity, source-caption variants, safe reimports, tombstones, 5,000 saves, 15 MiB source allowance, collections and one level of subcollections, multiple memberships, notes/tags/intent, move/copy/split/merge, favorites/archive, exact and related search, filter/sort/list layout, daily rediscovery, import history, ten local revisions, versioned export/restore, and deletion.

## Honest limits

Organization and related search run on the user's device. Keep the browser open while working; cached completed work resumes on another run. Initial smarter search downloads a 118,308,185-byte model plus tokenizer/runtime files. Slow phones may take significant time. No server-side AI, generative summaries, email delivery, Instagram retrieval, media thumbnails, or autonomous background completion is promised. No caption means no guessed topic. Supabase Free can pause after inactivity and has no paid backup guarantee. Provider free-tier terms and limits can change; operators must review them before release.

## Status

Local validation is recorded in TESTING.md. Live Google OAuth, deployed RLS, real-device model performance, semantic quality evaluation, domain configuration, and public service capacity require independent verification. Local tests do not establish a deployed production service.

Read SPEC.md, DESIGN.md, ARCHITECTURE.md, and ARCHITECTURE_DECISIONS.md for the complete product contract and changes from the paid plan.
