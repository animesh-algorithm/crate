# Free deployment and operations

## Before public activation

- Create a Supabase Free project and a Vercel Hobby project only if the deployment is personal and non-commercial under Vercel's current terms. No trial dependencies, payment-enabled overages, custom-domain purchases, or paid inference keys.
- Apply both SQL migrations in order; configure public URL/key, exact Google OAuth callbacks, allowed app redirects, and APP_ORIGIN for deletion. Review the additive organization migration against an existing library backup before deployment.
- Deploy deletion function; verify no token/wrong token/wrong origin/valid account deletion. Verify user A cannot read or mutate B through direct RPC or table requests.
- Publish operator name, privacy contact, and jurisdiction-appropriate terms. The repository contains product policy text, not a claim of legal review.
- Verify `vercel.json` response headers and SPA deep links in the deployed site, OAuth callback refresh, user session restoration, mobile navigation, cross-device conflicts, and export/restore.
- Measure model execution on representative phones/desktops and organization quality against private owner-reviewed examples. Never commit those examples.
- Establish encrypted manual database exports and deletion-ledger retention/recovery. Supabase Free does not supply the paid backup guarantee. Rehearse restore before activation.
- Once verified, set accepting=true in release_config. Default max_libraries=10. Existing libraries remain accessible when accepting=false.

## Free-tier headroom

Review Supabase usage dashboard before increasing slots and at least weekly while active. Pause new activation/imports at 350 MB DB or 4 GB monthly egress:

```sql
update public.release_config set accepting=false, importing=false where id=true;
```

This leaves existing reads and non-additive edits available within remaining capacity. Local changes remain cached/exportable if server rejects additions. Deletion and source export must remain possible where platform availability permits. Restore admissions only after verifying actual usage. Never evade inactivity pausing with synthetic keepalive requests. No guaranteed scale or uptime is advertised.

## Incident recovery

Model/download failure: exact search/manual browsing remain usable; retry later. Browser storage cleared: restore user export or reload cloud library; rebuild vectors. Sync failure: preserve dirty snapshot, retry in Settings. Revision conflict: export then choose explicit local/remote version; no silent last writer wins. OAuth failure: inspect deployed origin, Google configuration, Supabase redirect allowlist and session restoration without logging tokens. Capacity full: close admissions, communicate available device-only mode, do not auto-upgrade.

## Backups and deletion

Make protected manual exports periodically and before migration. Encrypt at rest; operator-controlled offline storage, no public artifacts. Retain at most 30 days. Deletion ledger stores owner/time/kind only and is restricted from clients. Keep a current deletion-ledger copy separately from older library exports. Before restoring access, apply account deletion records by removing matching auth and library owners. For library-only deletion records, clear library snapshots older than the deletion time while retaining the account and newer post-deletion data. Then test ownership and deletion again. Account live deletion cascades library and records a ledger entry. Offline device caches cannot be remotely guaranteed erased; the policy says so.

## Release and rollback

CI validates typecheck/unit-SQL/browser/build. Import the GitHub repository into Vercel, deploy the static `dist` output with public build variables, and keep preview and production credentials separate. Save an encrypted pre-migration export. Prefer additive migrations; deploy compatible code before destructive schema changes. Roll back the frontend to a known good Vercel deployment if necessary; restoring a database requires deletion reconciliation, not blindly importing old exports. Environment secrets are names only in docs; service role exists solely inside Supabase functions.

## Telemetry

No analytics, replay, private content/query logs, or inference traces. Provider dashboards plus local structured failure classes suffice initially. Record safe counts, duration, release version, affected operation, and reproducible error codes when diagnosing. Never include private captions, export payloads, OAuth URLs with tokens, or notes in tickets.

## Sources to recheck

- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits
- https://vercel.com/docs/frameworks/frontend/vite
- https://supabase.com/pricing
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp
- https://huggingface.co/docs/transformers.js/en/index
