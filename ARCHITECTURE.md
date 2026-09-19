# Architecture

## Runtime and boundaries

A static React application served by Vercel Hobby. Browser IndexedDB is the offline cache and authority for device-only libraries. Optional Supabase Free PostgreSQL is the cloud authority for signed-in libraries; its RPC functions enforce ownership, activation capacity, quotas, and compare-and-swap revisions. Vercel Hobby is permitted only for personal, non-commercial use under its current terms; public activation is blocked unless that remains true. No paid runtime, D1, R2, Vectorize, Better Auth, Resend, OpenAI, or cloud queue is required.

```mermaid
flowchart LR
 Export[Instagram JSON on device] --> Parser[Import browser worker]
 Parser --> Preview[Preview and confirmation]
 Preview --> Local[IndexedDB library]
 Local --> UI[Library and exact search]
 Local --> Model[Local embedding worker]
 Model --> Cache[Local vectors and checkpoints]
 Cache --> Group[Organization browser worker]
 Group --> Proposal[Collection proposal]
 Proposal --> Local
 Local <-->|Private text and edits only| DB[Supabase RLS and revision RPC]
 Google[Google sign-in] --> Auth[Supabase Auth]
 Auth --> DB
```

## Data model

Types and Zod validators in src/lib/model.ts describe Item, Collection, Library, ImportRecord, Intent. An item holds canonical shortcode/URL, independent fbid, distinct captions, creator, hashtags, unknown-semantics export timestamp, import date, favorite/archive/note/tags/intent, memberships, and explicit exclusions. Collections have stable ID, name, parent, manual-override marker, deterministic style. Libraries include source items, collections, removal tombstones, suppressed automatic collection IDs, bounded import history, and local revision.

Cloud persistence uses one validated JSONB snapshot per owner, rather than duplicating thousands of relational item rows and join tables for ten initial libraries. The API sends changed items/removals plus collection metadata, not full item data on every edit. PostgreSQL merges patches atomically under a row lock. This deliberate simplification is recorded in ADR-003. An eventual relational migration can preserve stable identities and behavior. Do not mistake a JSONB document for lack of server validation: constraints and security-definer functions are the authority.

IndexedDB stores owner-keyed snapshots, up to ten prior local versions, owner/item/source-hash vectors, and separate owner-keyed proposal drafts. Model assets use the browser HTTP/Cache API mechanisms from Transformers.js. No original uploaded files or image assets are retained.

## Import and invariants

The browser worker accepts a bounded JSON string, parses the observed label_values format, validates post links, normalizes supported fields, reports row-specific invalid entries, and computes a SHA-256 digest. The UI previews before committing. Local transaction validates the resulting library, appends import metadata, and checkpoints history. Duplicate source identities coalesce caption variants within an upload; reimports update source fields while retaining all personal state. Items absent from an export remain. Tombstones suppress surprise restoration. The 5,000 count includes archive.

Cloud allowance is 5,000 saves and 15 MiB normalized item text; JSON serialization differs slightly between browser and PostgreSQL, so the server's stricter bound can reject a near-limit local change. That change remains exportable locally, never silently dropped. Items and collection identities must be unique; nesting is at most one level; memberships must resolve to collections; URLs are restricted to original Instagram p/reel/tv posts.

## Organization and search

Pinned model: Xenova/multilingual-e5-small commit 761b726dd34fb83930e26aab4e9ac3899aa1fa78; upstream intfloat multilingual-e5-small MIT. Quantized ONNX model 118,308,185 bytes plus tokenizer/runtime; preserve license notices. Transformers.js feature-extraction uses mean pooling, normalization, and E5 query:/passage: prefixes. WASM is used consistently initially; WebGPU is not advertised as verified. No private text goes to model hosting servers. Model loading has no private URL-derived fetches.

Completed vectors are cached per owner/item and SHA-256(model revision + source captions/hashtags + note/tags). Failed results are not cached as successful empties. Closing/canceling terminates inference, preserves completed vectors, and rejects pending calls. Re-running checks caches and resumes. There is no server lease or autonomous progress while closed.

Automatic proposals start with supported topic candidates, merge humor synonyms, and keep Study, Productivity, and AI Tools separate. Repeated meaningful personal tags can surface other interests. Caption/hashtag/personal evidence anchors at least five saves per suggestion; the cached model may conservatively expand a supported group if its text does not contradict another anchored topic. The text-only fallback uses direct evidence. Generic and promotional names are rejected, redundant groups merged, and at most three automatic memberships are proposed. Sparse saves stay Unsorted. These defaults need private owner-reviewed precision and coverage evaluation before quality claims. Manual subcollections and intent remain available.

Suggestion publication preserves all manually edited collections and memberships and obeys explicit exclusions. The proposal UI adds only selected, individually reviewed groups and preserves existing groups and memberships; children require a selected reviewed parent. Current semantic graph produces one primary membership, while source-word mode supports overlapping memberships. Manual membership remains unlimited. No LLM prompts, inference tools, or structured generative outputs exist in the zero-budget architecture; imported instructions cannot control a model tool agent.

MiniSearch indexes captions/hashtags/notes/tags, creators, URLs, and collection names. Related search combines lexical and local vector top-50 rankings through reciprocal-rank fusion, thresholding semantic matches at 0.72. Filters are applied to authorized local items. Cached vectors with changed hashes are ignored. Query text and vectors are never sent to a provider. Search runs after library loading; pagination of initial cloud snapshots is unnecessary at the bounded 15 MiB size, but update traffic is incremental. A new device rebuilds its private index.

## Public interfaces

Browser import worker request: raw JSON string; response {preview:{items,issues,duplicates,total,digest}} or {error}. Inference worker request {id,text}; response {id,vector} or safe error; download events {type:'download',loaded,total}. Organization worker request {items,vectors?}; response {groups} or safe error.

Supabase RPC:

- open_library(): authenticated only; returns {state,revision}. Atomically checks release accepting flag and maximum slots for first activation. Existing accounts remain accessible when new activation closes.
- patch_library(expected_revision,patch): changed item objects, removed IDs, collections, tombstones, imports. Auth derives owner; caller cannot target another account. Atomically merges, validates, checks quota, publishes revision, returns revision. Wrong revision raises REVISION_CONFLICT. No unauthenticated mutations or direct table writes are granted.
- delete-account edge function: POST, exact configured Origin, bearer token verified through auth.getUser, then admin deletes that exact user. No target owner parameter. Cascading library deletion and private deletion-ledger trigger accompany it.

Application routes: /, /organize, /saves, /search, /collection/:id, /save/:id, /settings, /help, /privacy, /terms, /auth/callback, 404. Query filters are URL-addressable. Stable item IDs survive reimport and export.

## Synchronization and failures

Local changes save before network writes, remain visibly pending on failure, and can be exported. One local mutation lock avoids concurrent writes from this mounted app. Cloud revision checks prevent another device/tab from silently overwriting. Reload reads the remote baseline but preserves dirty local snapshots. Explicit conflict resolution offers local replacement or remote replacement; advise exporting first. No last-writer-wins surprise. Sign-out rejects unresolved pending state. A generation check discards stale owner-load responses.

Preview/file parsing, model download/inference, organization, storage exhaustion, auth, sync conflict, cloud capacity, and account deletion each have recoverable plain-language outcomes. Schema/network failures never manufacture classification or deleted-post states. Storage quota failure must not claim data saved. Original-source viewing remains available when smarter search fails.

## Security, privacy, and retention

Row Level Security plus restricted grants; private tables have no anonymous policies. Security-definer functions use empty search_path and authenticated derived ownership. Secrets only in Supabase function environment. OAuth PKCE and exact allowed redirects. JSX renders source as text; no dangerouslySetInnerHTML. Only validated HTTPS Instagram external links, noopener/noreferrer, no arbitrary scraping. Static CSP, frame denial, restrictive permissions, safe referrer policy. No private query/caption logs, analytics, replay, or provider LLM calls.

Raw upload stays in memory only. Normalized data persists until deletion; local history ten versions, local vectors bounded by saved identities. Model cache is public, not user content. Export contains full source and edits, not auth secrets. Sign-out removes the current account's private local stores. Account deletion cascades live cloud records and records a private owner/time/kind deletion record for backup restoration. Other offline devices can retain cached content; their removal is not remotely guaranteed. Manual recovery exports are encrypted on operator storage and expire within 30 days. Apply deletion ledger before restoring access.

## Deployment and cost

Use a free Vercel Hobby subdomain only while the deployment remains personal and non-commercial, plus a Supabase Free project, with no payment-enabled upgrades. Cloud activation disabled by default. Initial ten libraries; operator monitors DB at 350 MB and monthly egress at 4 GB, closing activation/imports for headroom. These are operational controls, not automated guarantees against provider policy changes. No keepalive traffic to evade inactivity pausing. CI checks/build/browser tests; output dist. Separate development and public project credentials. Additive migrations, protected backups, restore rehearsal, and live integration verification are required before activation. See OPERATIONS.md.

The runtime uses Transformers.js 4 and local standard WASM assets (about 14 MB). Unused asyncify WASM is excluded from the build to keep the static artifact lean; production browser tests verify this path under the deployed CSP. Model input is truncated to its tokenizer context window; exact search retains the full captions. Language filters use franc-min estimates on longer captions, with unknown retained for insufficient evidence.

On-demand Reel display uses a sandboxed Instagram iframe from a canonical Reel URL. CSP frame-src permits only https://www.instagram.com. No Meta script executes in the parent application and no Instagram media is fetched or retained by Crate. Card previews lazy-load Instagram embeds while browsing; their inert frames are covered by a modal-opening button. Preview dialogs mount only on explicit user activation and unmount on close; privacy copy discloses the third-party request and cookies. Creator website links retain validated HTTP(S) source URLs without credentials.
