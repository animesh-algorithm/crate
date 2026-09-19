# Product specification

## Definition and authority

Crate helps a consumer find an Instagram save they remember and maintain a private personal library. The user's latest $0 launch requirement supersedes the prior $25 hosting/AI architecture. The original source/reference and confirmed product decisions still govern journeys and organization. No staged paid roadmap is implied: this is the complete intended free release, with its operational limits exposed honestly.

Confirmed: private consumer accounts; collections with optional subcollections and multiple membership; natural-language plus exact search; unclear saves in Unsorted; full organization editing; optional separate intent; details then Instagram link; source-preserving additive reimports; JSON only; immediate browsing; no billing or sharing. Changed for $0: Google-only instead of Google plus magic links; no email completion; device processing instead of paid provider/queues; model cache resumes when browser reopened; no monthly paid AI allowance or monthly refresh restriction.

## Journeys and screens

1. Public empty Library explains value without requiring sign-in. Import or explore a synthetic sample. Sample state is isolated and visibly identified.
2. Add saves → choose saved_posts.json → validate on device → preview additions/updates/already-present/removed/invalid → download issue report → explicit consent → commit atomically → browse immediately. Invalid root leaves library unchanged. Individual broken entries require valid-part acknowledgement. Quotas never silently truncate.
3. Library shows editorial collections, recently saved, daily rediscovery, and an all-saves route. Unorganized library suggests finding connections or manual collection creation.
4. Find connections on `/organize`: the on-device model is recommended after a disclosed download, with a smaller text-only fallback. Keep the browser open while processing; pause is safe and completed vectors are cached. Owner-keyed proposal drafts persist privately across navigation and reload. Review snippets and source text, then edit and save each collection separately; other drafts can wait. Custom category definitions persist for explicit future runs, with only those categories proposed. Weak matches remain Unsorted.
5. Search exact captions, creator, tags, URLs, notes, collection names. Related search uses local multilingual embeddings where prepared. Persistent URL query/creator/intent/format/collection/view/sort/layout filters. No chat answer and no fabricated summary. No results asks for other source words; it does not broaden silently.
6. Save details preserve full original captions, hashtags, creator, export date, note/tags, optional intent, memberships, favorite/archive/remove, and original link. Lack of text is explicit, not a claimed unavailable/deleted post.
7. Collection page includes descendants, distinct member counts, subcollection links, search, multi-select, move/copy, archive, rename/merge/delete. Split is selecting saves and creating a new collection, optionally moving them from the source.
8. Settings: account, pending sync/conflict resolution, import activity, export/restore, undo, library/account deletion, privacy and terms. Help, auth callback, 404, errors are addressable routes.

## Import contract

Accept root arrays of entries with label_values. Read URL href/value; repeated Caption values remain distinct; nested Owner Username/Name; Hashtags Name; numeric timestamp; fbid stored independently. Accept only HTTPS instagram.com/www.instagram.com p/reel/tv links. Strip tracking. Shortcode is per-account identity. Never fetch arbitrary caption links.

Limits: 25 MiB file, 5,000 active saves INCLUDING archived, 15 MiB normalized item data, 500 collections, one nesting level. Source captions/hashtags/creator/date update on reimport; personal notes/tags/intent/state/memberships/exclusions remain. Absent saves remain. Identical source causes no model recomputation. Removed saves leave tombstones until explicit undo or backup restore. Export timestamps are labeled Export date; their meaning is not verified as publication date.

Import order date sort falls back to import date. Sort newest/oldest/imported/creator; query relevance takes precedence. Filters include favorite/archive/unsorted, creator, manual intent, exported post format, collections. Multilingual related search and estimated language filters are supported. Language estimation uses sufficiently long captions and can be wrong; short or unclear text stays unknown. Derived English summaries are not generated. Export-date range filters are supported; they do not imply validated publication dates.

## Organization and override contract

Topics are discovered from evidence, never a fixed topic taxonomy or creator identity. Minimum automatic group size five; weak/no text remains Unsorted. Optional manually chosen intent Learn/Try/Buy/Visit/Enjoy is separate; do not infer a user's motivation. Maximum three automatic memberships per save; manual memberships unlimited. Subcollections can be created manually. Semantic groups with at least 40 saves may propose coherent child groups of at least five saves, with one-level enforcement. Sparse libraries do not receive fabricated hierarchies.

Manual rename/membership changes mark affected collections as manual. Manual collections and memberships survive organization; explicit exclusions prevent future automatic return. Reviewed proposals are saved individually; same-identity automatic collections show a replacement warning, while manual edits and memberships stay. Deletion preserves saves and suppresses deleted automatic collection identities from future proposals. Merge preview explains destination name and union of source plus descendant memberships; split preserves other saves. Ten local revisions support undo. Removal has explicit confirmation; archive is reversible and excludes rediscovery.

## Data rights and reliability

Original file never leaves device. Online accounts synchronize normalized source and edits only. Device vectors never go to cloud. No Instagram credentials, scraping, automatic synchronization with Instagram, media generation, transcription, collaboration, public sharing, billing, replay, or ads. No private text goes to an inference provider.

Use transactions for local writes and cloud compare-and-swap revisions. Offline/failed synchronization preserves local data and indicates pending state. Conflicting cloud revisions require an explicit local/remote choice after export advice. Signing out clears cloud-account caches and is disabled with pending data. Device-only data is not silently migrated into an account. Account deletion is server-authorized and cascades live library data; cached copies on other offline devices are disclosed.

## Acceptance

Meaningful parser/domain, SQL ownership/quota/revision, and browser tests pass. Responsive accessible layouts at target widths. Restore/export round-trip all source and edits. Browser model is pinned, tested with real text, and failure leaves exact search usable. Private quality evaluation: 150 stratified saves, 40 queries; targets precision 85% and recall@10 85%, measured alongside coverage. Healthy exact search p95 <1s and related query <2s after device preparation are targets, not verified universal guarantees. No universal 15-minute browser organization promise. Public release requires live OAuth/deletion/RLS, operator legal/contact information, measured free-tier capacity, and backup/recovery verification.

Reel previews: explicit Preview reel opens an Instagram-hosted player from cards, details, or collection reviews. Cards display lazy-loaded Instagram previews while browsing; clicking one opens the interactive player in a modal. Closing removes the modal player and retains the card preview. An internet connection is needed and Instagram may restrict availability. Open on Instagram remains available. This is live third-party display, with no media stored by Crate.

## Public landing boundary

The root route is always a public, privacy-safe marketing story, including when a local or signed-in library exists. The functional product is under `/app`. Import uses the existing preview and explicit-consent flow and enters `/app` only after a successful commit. Sample exploration also enters `/app`; returning users receive an explicit Open Crate action. Marketing search and drag interactions are fictional, ephemeral demonstrations and never write to IndexedDB or Firebase.

Legacy `/search`, `/saves`, `/organize`, `/settings`, `/help`, `/privacy`, and `/terms` routes redirect to matching `/app/*` routes. `/collection/:id` and `/save/:id` preserve dynamic IDs, and all redirects retain query strings. `/auth/callback` waits for the existing Firebase redirect handling and then enters `/app`.
