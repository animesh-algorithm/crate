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

React 19, TypeScript, Vite, React Router, CSS design tokens, Lucide, self-hosted DM Sans and Barlow Condensed. Dexie/IndexedDB stores local libraries, revisions, and search vectors. MiniSearch provides exact search. Transformers.js runs pinned quantized multilingual E5-small in a dedicated browser worker. Source-based collection suggestions work without downloading a model. Firebase Spark provides Google authentication and owner-isolated, revisioned Firestore snapshots. Vercel Hobby serves static assets only while this remains a personal, non-commercial project under Vercel's current terms.

## Optional online accounts

1. Use the `crate-a34ae` Firebase Spark project and deploy `firestore.rules`. Keep the release document closed until live verification is complete.
2. Copy `.env.example` to `.env`. Set the Firebase web configuration. These values are public identifiers; never expose a service-account credential.
3. Enable Google in Firebase Authentication, add `https://crate-nu-lilac.vercel.app` as an authorized domain, and verify a real account can sign in, sync its own library, and delete itself.
5. Import the GitHub repository into a Vercel Hobby project, use `npm run build` with `dist` as the output directory, and use `vercel.json` for the SPA fallback and security headers. Preview and production use separate project keys. Do not start a paid plan, trial, or paid overages. Reconfirm Vercel's personal/non-commercial Hobby eligibility immediately before public release.
5. Complete the public release checks in OPERATIONS.md. New cloud library activation is **closed by default**. Do not open the Firestore release gate until rules and real-account tests pass.

Device-only data is not silently uploaded when you sign in. Export the local library, sign in, then restore the backup to transfer it deliberately. Signing out of an online account clears its local cache; pending changes must first sync or be exported and explicitly resolved.

## Capabilities

Array-based Instagram saved JSON preview, malformed-entry report, canonical duplicate identity, source-caption variants, safe reimports, tombstones, 5,000 saves, 15 MiB source allowance, collections and one level of subcollections, multiple memberships, notes/tags/intent, move/copy/split/merge, favorites/archive, exact and related search, filter/sort/list layout, daily rediscovery, import history, ten local revisions, versioned export/restore, and deletion.

## Honest limits

Organization and related search run on the user's device. Keep the browser open while working; cached completed work resumes on another run. Initial smarter search downloads a 118,308,185-byte model plus tokenizer/runtime files. Slow phones may take significant time. No server-side AI, generative summaries, email delivery, Instagram retrieval, media thumbnails, or autonomous background completion is promised. No caption means no guessed topic. Firebase Spark limits and terms can change; operators must review them before release.

## Status

Local validation is recorded in TESTING.md. Live Google OAuth, deployed RLS, real-device model performance, semantic quality evaluation, domain configuration, and public service capacity require independent verification. Local tests do not establish a deployed production service.

Read SPEC.md, DESIGN.md, ARCHITECTURE.md, and ARCHITECTURE_DECISIONS.md for the complete product contract and changes from the paid plan.

## Public story and application routes

`/` is Crate’s public marketing story. The private library, import state, sample banner, errors, and save status live under `/app`. The landing page can open the existing import dialog; a successful import and “Take a look around first” both continue to `/app`. Returning visitors can use “Open Crate.” Old library URLs redirect to their `/app/*` equivalents while preserving query strings and save or collection IDs.

The marketing photographs and poster are bundled, fictional synthetic assets in `public/marketing`; they contain no personal exports, Instagram media, or runtime third-party requests. Marketing motion is route-local and honors reduced motion, compact touch layouts, low-end devices, and page visibility. No analytics or external service was added.

The public story describes Crate as “for Instagram saves” and uses one conversion action: “Organize my saves.” New personal libraries enter through Google sign-in, then an in-app Instagram export guide and the existing preview/consent import. Existing device-only libraries remain available and are never uploaded automatically; users export a backup, sign in, and explicitly restore it if they want to migrate. The sample library remains available from the app entry screen.

Suggested collections remain private device drafts until individually saved. They appear above saved collections on the dashboard, have searchable `/app/suggested/:id` views, and can also be included in global search with `scope=suggested`.

## About the creator

Created by [Animesh Sharma](https://animesh.cc). For product design and development work, visit [Hire Animesh](https://hire.animesh.cc).
