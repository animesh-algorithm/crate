# Free deployment and operations

## Before public activation

- Use the `crate-a34ae` Firebase Spark project and a Vercel Hobby project only while the deployment remains personal and non-commercial under Vercel's current terms. No trial dependencies, payment-enabled overages, custom-domain purchases, or paid inference keys.
- Deploy `firestore.rules`; keep `/config/release.accepting` absent or false until the live release checklist passes. Configure Firebase Google sign-in and authorize only exact production domains.
- Verify user A cannot read or mutate B through direct Firestore requests, a new user cannot create cloud data while the release gate is closed, revision conflicts preserve both copies, and account deletion removes the caller's Firestore data before Firebase Authentication deletion.
- Publish operator name, privacy contact, and jurisdiction-appropriate terms. The repository contains product policy text, not a claim of legal review.
- Verify `vercel.json` response headers and SPA deep links in the deployed site, OAuth callback refresh, user session restoration, mobile navigation, cross-device conflicts, and export/restore.
- Measure model execution on representative phones/desktops and organization quality against private owner-reviewed examples. Never commit those examples.
- Establish encrypted manual exports and recovery. Firestore has no operator-managed deletion ledger in this $0 client-only architecture. Rehearse restore before activation.
- Once verified, create the operator-owned `/config/release` document with `accepting: true`. Existing libraries remain readable, writable, and deletable when admissions later close.

## Free-tier headroom

Review Firebase Spark usage and billing dashboards before opening or maintaining admissions. Close admissions by changing the operator-owned `/config/release` document to `accepting: false` before any published free-tier limit is approached.

This leaves existing reads and non-additive edits available within remaining capacity. Local changes remain cached/exportable if server rejects additions. Deletion and source export must remain possible where platform availability permits. Restore admissions only after verifying actual usage. Never evade inactivity pausing with synthetic keepalive requests. No guaranteed scale or uptime is advertised.

## Incident recovery

Model/download failure: exact search/manual browsing remain usable; retry later. Browser storage cleared: restore user export or reload cloud library; rebuild vectors. Sync failure: preserve dirty snapshot, retry in Settings. Revision conflict: export then choose explicit local/remote version; no silent last writer wins. OAuth failure: inspect the deployed domain, Firebase authorized domains, and session restoration without logging tokens. Capacity full: close admissions, communicate available device-only mode, do not auto-upgrade.

## Backups and deletion

Make protected manual exports periodically and before migration. Encrypt at rest; operator-controlled offline storage, no public artifacts. Retain at most 30 days. Before restoring access, confirm it does not reintroduce an account the user deleted; client-only Firebase deletion does not create a server-side ledger. Account deletion removes its known Firestore snapshots before the active Firebase Authentication record. Offline device caches cannot be remotely guaranteed erased; the policy says so.

## Release and rollback

CI validates typecheck/unit/browser/build. Import the GitHub repository into Vercel, deploy the static `dist` output with public Firebase build variables, and keep preview device-only until a distinct preview Firebase project exists. Save an encrypted pre-migration export. Roll back the frontend to a known good Vercel deployment if necessary; restoring cloud data requires deletion reconciliation, not blindly importing old exports. Environment secrets are names only in docs; no Firebase service-account credential belongs in the browser.

## Telemetry

No analytics, replay, private content/query logs, or inference traces. Provider dashboards plus local structured failure classes suffice initially. Record safe counts, duration, release version, affected operation, and reproducible error codes when diagnosing. Never include private captions, export payloads, OAuth URLs with tokens, or notes in tickets.

## Sources to recheck

- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits
- https://vercel.com/docs/frameworks/frontend/vite
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/security/get-started
- https://huggingface.co/docs/transformers.js/en/index
