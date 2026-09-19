# Architecture decisions

Confirmed product decisions are in SPEC.md. Defaults introduced by the $0 constraint are documented explicitly below. No pricing allowance is a promise of unlimited capacity; check current primary provider documentation before public activation.

| ADR | Decision                                                        | Status                                            |
| --- | --------------------------------------------------------------- | ------------------------------------------------- |
| 001 | Free static hosting and optional Supabase Free accounts         | Accepted for $0 launch                            |
| 002 | Local embeddings and evidence-derived organization, no paid LLM | Accepted; quality evaluation pending              |
| 003 | Owner-keyed JSONB with incremental atomic patches               | Accepted implementation simplification            |
| 004 | Source-preserving imports and explicit personal overrides       | Accepted confirmed product contract               |
| 005 | Google-only auth, no transactional email                        | Accepted $0 default                               |
| 006 | Capacity-bounded launch, explicit free-service limitations      | Accepted; public activation requires verification |
| 012 | Vercel Hobby replaces Cloudflare Pages for static hosting       | Accepted; eligibility gate added                  |
| 013 | Firebase Auth and Firestore replace Supabase cloud services     | Accepted; online activation remains closed        |
| 016 | Account-first onboarding and searchable device suggestions     | Accepted; live activation remains gated           |

The prior Cloudflare Workers Paid/D1/R2/Queues/Vectorize/OpenAI/Resend architecture is superseded. Prior no-training provider requirements are satisfied more strongly for inference content by processing entirely on-device; authentication and normalized online storage still have their own processors. The original monthly AI allowance and full-refresh restriction disappear because no metered AI calls exist.

## ADR-007: Reviewed, additive collection proposals

Accepted user decision, 2026-09-19. Proposal browsing shows primary collections first, with children inside their parent. Users inspect actual saves and choose each reviewed collection before applying the selected set. A child requires its reviewed parent. Applying proposals is additive and retains existing collections and memberships; undo remains available. Review acknowledgement records a user action, not a claim that every caption was read. Review choices live only in the current dialog.

Measured source evidence: the external personal export contains nested Owner and Hashtags dictionaries; the parser reads these bounded nested fields as inert text. All 1,749 media arrays are empty, so no source thumbnails can be displayed from that file. No Instagram retrieval or invented imagery is introduced. Existing imports need reimport to populate corrected creator and hashtag metadata while preserving personal edits.

## ADR-008: Preserve creator display names and profile links

Accepted implementation, 2026-09-19. Keep the existing creator username field and add optional creatorName and creatorUrl fields, preserving compatibility with prior libraries. Cards and proposal reviews show the display name; save details also expose the creator website link. The Owner URL field contains external website/bio links. Only HTTP(S) URLs without embedded credentials are retained and permitted by the shared library schema. Display names are searchable as creator text. Reimport comparisons include both fields and update source metadata while preserving personal edits. No profile requests or imagery retrieval are introduced. Measured external export evidence: all 1,749 Owner dictionaries contain Username, Name, and URL fields, with 1,694 nonempty names and 972 nonempty website links.

## ADR-009: On-demand Reel embeds

Accepted user decision, 2026-09-19. Reel cards, details, and proposal reviews offer Preview reel. Only explicit activation mounts an Instagram-hosted iframe, derived from the validated canonical Reel URL; closing removes it. No media downloads, thumbnail scraping, Meta SDK, API tokens, paid services, or background preview requests. CSP permits frames only from www.instagram.com while keeping application scripts restricted. The iframe uses no-referrer, a sandbox without top navigation, and fullscreen/encrypted-media permissions. External content can make its own network requests and use Instagram cookies; privacy copy explains this boundary. Instagram availability, public visibility, creator embed settings, and browser restrictions can affect playback. A permanent Open on Instagram fallback remains because cross-origin content cannot reliably be inspected for failures. Browser tests mock the remote player and validate the UI and CSP, not live Instagram playback.

## ADR-010: Inline Reel card previews

Accepted user change, 2026-09-19; supersedes ADR-009's activation-only rule for card previews. Reel cards and proposal review cards display a lazy-loaded Instagram embed before the caption. The card player is inert, hidden from accessibility navigation, and covered by a labeled button that opens the interactive player in a modal. No thumbnail is invented or scraped; source media arrays are empty. Inline embeds contact Instagram as cards approach the viewport; privacy copy discloses this. Detail pages retain the explicit preview button. Modal close removes the interactive player while leaving the card preview. Cross-origin failures cannot be reliably detected: availability copy and the modal's external fallback remain. Fixture tests establish the card/modal behavior, overflow and accessibility, not actual third-party media availability.

## ADR-011: Device drafts and selective replacement

Accepted user direction, 2026-09-19; supersedes ADR-007's dialog and batch approval. `/organize` holds an owner-keyed IndexedDB proposal separately from the synchronized library. Navigation/reload retains a proposal, but processing itself pauses on close. Smart mode uses the pinned model and caption/hashtag/personal evidence; text-only mode is a conservative fallback. Anchored topics merge humor synonyms and keep Study, Productivity, and AI Tools distinct. Strong recurring personal tags can surface other interests. These are implementation defaults, not measured semantic quality; owner-reviewed precision and coverage are still pending. Each suggestion is edited and saved independently. A same-identity automatic collection is replaced only after review; manually edited collections and exclusions take precedence. Custom category definitions are synchronized and exported with the library, while proposal drafts and embeddings never enter the cloud or backup. New fields are optional/defaulted for older version-1 libraries. The initial SQL migration and compatible additive migration validate them server-side; the latter has only local PostgreSQL verification and needs operator review before deployment. No deployment is authorized in this task.

## ADR-012: Vercel Hobby static hosting

Accepted user decision, 2026-09-19. Vercel Hobby replaces Cloudflare Pages as the static host. `vercel.json` is the deployment authority for Vite build output, SPA deep-link fallback, and security headers; Cloudflare-specific `_headers` and `_redirects` are removed. The project remains static and has no Vercel Functions, analytics, or paid features. Vercel's current Hobby terms restrict use to personal, non-commercial projects, so its eligibility is a release gate rather than an assumption. A commercial service, paid plan, trial, paid overages, or a changed eligibility status blocks public activation until a new hosting decision is explicitly approved and recorded.

## ADR-013: Firebase client-owned cloud sync

Accepted user decision, 2026-09-19; supersedes ADR-001 and the Supabase-specific parts of ADR-003. Supabase could not provide another $0 project because the account-wide free-project allocation was already consumed. Crate uses Firebase Spark with Google-only Firebase Authentication and Cloud Firestore in `asia-south1` (Mumbai). Gemini in Firebase and Google Analytics remain disabled.

Firestore rules isolate every `/users/{uid}` library path to its authenticated owner. A small manifest holds the active snapshot revision; snapshot chunks hold source-preserving library state. The browser writes chunks before atomically advancing the manifest revision, preserving explicit conflicts while avoiding Firestore's per-document size ceiling. New online-library creation remains denied until the operator changes the release gate.

No Cloud Functions, paid billing, Firebase hosting, service-account credential, deletion ledger, or server-side personal-data processor is introduced. Account deletion deletes the caller's Firestore snapshots and manifest, then that same active Firebase Authentication account; recent-login requirements may require another sign-in. Rule deployment and live authenticated create/read/update/delete verification remain release gates.

## ADR-014: Public story separated from the library

Accepted user direction, 2026-09-19. `/` is the public marketing surface and `/app/*` is the functional library. The route split is lazy so the marketing-only Motion dependency, choreography, and styles do not enter the library chunk. The shared provider can initialize in parallel, but the public story never blocks on library loading. Existing library URLs redirect compatibly with query strings and dynamic IDs preserved; Firebase redirect completion remains the authority before `/auth/callback` enters `/app`.

Marketing demonstrations are intentionally ephemeral. They use one continuous DOM representation of the fictional Bar Sera save, component-only search and drag state, and bundled responsive WebP assets generated for Crate. They do not access storage, alter personal libraries, fetch third-party media, add analytics, or change account isolation. Reduced-motion, compact-touch, low-end-device, and hidden-tab behavior are part of this boundary rather than optional polish.

## ADR-015: Illustration-led marketing chapters

Accepted user direction, 2026-09-19; supersedes ADR-014's scroll-choreographed story implementation while preserving its route and privacy boundaries. The public story uses three normal-flow, code-native illustrated chapters with one-time viewport entrance motion. Page scroll never controls story state, card position, or collection progression. The collection shelf is a responsive grid on wide layouts and native horizontal snap scrolling on compact layouts. Reduced-motion and low-end-device modes render the complete composition without entrance transforms. No new remote media, runtime request, or persisted state is introduced.

## ADR-016: Account-first onboarding and searchable device suggestions

Accepted user direction, 2026-09-19. New personal libraries enter `/app` through Google authentication before Instagram import. Existing device-only libraries are grandfathered; migration is an explicit export, sign-in, and restore operation, never a silent owner change. Authenticated empty accounts read the operator release document and cannot import while admissions are closed. The server-side Firestore rule remains authoritative for first-library creation.

Proposal drafts remain owner-keyed IndexedDB data and never join synchronized Library snapshots. The dashboard and `/app/suggested/:id` expose those groups as searchable Suggested Collections. Global `scope=all|saved|suggested` filtering deduplicates items and overlays draft membership without changing exact or related ranking. Saving one suggestion uses the existing source-preserving collection write and removes only that group from the draft.

## ADR-017: Fail-closed admission states and validated cloud snapshots

Accepted implementation correction, 2026-09-19. A confirmed closed release and a failed release check are distinct client states. Both keep first import closed, but a failed check offers a retry and does not claim that capacity is unavailable. The operator-owned release document remains the only switch for new online libraries.

Firestore rules validate the manifest, snapshot, and chunk shapes used by the client. New manifests and their staged snapshots require open admission; an owner with an existing manifest may continue creating replacement snapshots after admissions close. Manifest updates must advance exactly one revision and reference an existing owner snapshot. Chunk documents must belong to an existing snapshot, match their numeric document ID and declared range, and remain within the shared client/rules chunk bound. Owner-only read and deletion behavior is unchanged.
