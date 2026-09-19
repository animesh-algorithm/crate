# Verification

## Admission-state and Firestore rule correction, 2026-09-19

Unit coverage distinguishes a confirmed closed release from a failed availability check, keeping both fail-closed while offering retry only for the latter. Firestore emulator coverage verifies missing/closed admission denial, schema-valid open admission, owner isolation, existing-owner synchronization after admissions close, manifest revision increments, and malformed or oversized document rejection. The emulator is local evidence only; no rules or release document were deployed by this change, and production admission remains closed until the live release checklist passes.

## Firebase authentication CSP correction, 2026-09-19

The production policy now allows the single Google API script origin used by Firebase Google sign-in while retaining the same-origin default, restricted Firebase auth frame, and prohibition on general `unsafe-eval`. A configuration regression test checks those boundaries. `npm run check` passes with 23 tests and two private checks skipped; the Chromium suite passes ten tests with the opt-in model test skipped. This is local configuration evidence only. A fresh deployment and real Google account are still required to verify the response header and complete OAuth flow.

## Search input correction, 2026-09-19

Search now runs only on Enter or the Search button, not during typing or after a pause. The regression test first failed against the prior delayed live search, then passed after removing automatic submission. It checks retained text/focus, explicit submission, reload persistence, mobile/desktop screenshots, horizontal overflow, and axe accessibility. `npm run check` passes (29 tests passed, two private checks skipped). The full Chromium suite passes ten tests with the opt-in model test skipped. This is local fixture evidence, not verification on the user's actual library or a deployed service.

## Automated checks

`npm run check` runs TypeScript, meaningful domain tests, and production build. Firestore rules and Firebase Authentication require independent live verification; local tests do not establish deployed access control. `npm run test:e2e` runs Chromium browser tests and axe with target-width screenshots in ignored test-results.

Domain coverage: canonical identities/unsafe links, caption variants, malformed roots and entries, personal edits on reimport, absent saves, tombstones, atomic quota rejection, merge/delete source preservation, invalid hierarchy, insufficient context, manual overrides, user-context search.

Firebase release coverage still required: closed admission gate, direct cross-account read isolation, denied writes, compare-and-swap conflicts, and authenticated account deletion. These need emulator or live-project evidence; the former SQL simulation was removed with Supabase.

Browser coverage: import preview/consent, search, notes, reload persistence, favorites, export download, tombstone reimport, sample isolation, collection creation, responsive overflow and axe at 375/768/1024/1440.

## Manual and release evidence

Inspect generated screenshots against DESIGN.md/reference. Keyboard navigation, native-dialog Escape/focus, reduced motion, 200% zoom, small viewports, real Safari/Firefox/Edge and phones. Test local storage errors and offline behavior. Run model smoke test with pinned files and actual vectors; test cancel/retry and changed-source cache invalidation. Model download size has been verified from the pinned artifact response; performance/precision claims need actual measurements.

Private evaluation: 150 owner-reviewed saves stratified by sparse/multiple captions, language, and topic ambiguity; 40 remembered-save queries. Target automatic precision 85% and recall@10 85%; record coverage and unsupported/unsorted rate to avoid passing by organizing nothing. Include prompt-looking text as inert evidence; no generative tools exist. Keep personal evaluation files out of git.

Cloud release requires live Google session/callback, deployed Firestore owner rules, cross-device conflicts, provider quota validation, authenticated account deletion, recovery reconciliation, actual provider usage, and operator legal/contact configuration. No local-only pass establishes those external outcomes.

## Current measured results

Local verification on 2026-09-19:

- TypeScript and production build pass. Vercel deployment artifact limits and deployed headers require independent verification.
- 21 domain, storage, and private-import checks previously passed, including read-only validation of the external 1,749-record personal export (no skipped rows or duplicates). Firebase rule verification is separate live evidence, not covered by those local checks.
- All five production Chromium browser tests pass. Coverage exercises import/reimport, search, edits, persistence, collection moves/merges/successive undo, export/restore, deletion, and the pinned model. Model smoke inference produces eight finite, normalized 384-dimensional vectors and related search runs under production security headers; no asyncify assets are requested.
- Responsive screenshots and axe checks pass at 375, 768, 1024, and 1440 pixels. Desktop and mobile screenshots were inspected against the design direction.
- Full npm dependency audit reports zero vulnerabilities.

Google OAuth, deployed Firebase rules/deletion, public hosting, backup recovery, real phones, and the owner-reviewed semantic quality targets remain unverified. Model smoke inference is not evidence of 85% precision or recall.

## Reviewed collection and metadata update, 2026-09-19

`npm run check` passed before the Firebase migration (domain/storage checks, external private check skipped by default). The separate external private export check passes for all 1,749 saves, verifies creator coverage and nonempty hashtag coverage, and retains no source file in the repository. Development and production Chromium suites both pass seven tests; the opt-in model download test is skipped in these runs. Proposal tests use synthetic worker output to exercise parent/child navigation, separate review gates, additive selection, and existing collection preservation; they do not measure semantic grouping quality. Screenshot inspection, axe checks, and overflow checks pass at 375/768/1024/1440. Real export media arrays are empty; image retrieval remains unsupported.

Creator metadata verification: nested Owner names and safe profile URLs survive import/reimport, while invalid URL schemes are discarded and personal notes retained. Browser import checks display names and profile links, mobile/desktop screenshots, overflow, and detail accessibility. External export validation checks creator names and profile URLs without printing private content.

Reel preview QA: mocked remote iframe checks lazy inline card previews, card click opening a modal, canonical embed URL, fallback link, Escape/close and focus restoration, modal iframe removal while the inline preview remains, mobile/desktop screenshots, dialog/document overflow and axe. Repeat under the local production server to exercise CSP. These checks do not establish live Instagram playback; third-party restrictions can block individual reels.

## Organize page implementation, 2026-09-19

`npm run check` and the local Chromium suite validate the new `/organize` page, owner-keyed device proposals across reload, one-at-a-time saving, custom-only categories, exclusion-preserving replacement, source text preservation, and server-side validation of the new fields. Gallery and review screenshots were inspected at 375/768/1024/1440; axe and horizontal-overflow checks pass in synthetic fixtures. The opt-in `npm run test:model` passes under the local production server: eight 384-dimensional normalized vectors are cached and related search works. It does not measure organization relevance. The mocked proposal is not quality evidence. No owner-reviewed precision, coverage, or Unsorted rate is yet measured; do not claim the 85% target. No live OAuth/deletion/cloud deployment was tested.

An opt-in private evaluation test reads external `CRATE_PRIVATE_EXPORT` and `CRATE_PRIVATE_REVIEW` paths, plus optional `CRATE_PRIVATE_VECTORS` for model-assisted grouping. Review JSON is `{ "labels": { "shortcode": ["Food", "Study"] } }`, with an empty array for reviewed saves that should stay Unsorted. Use at least 150 stratified, owner-reviewed saves. Run `CRATE_PRIVATE_EXPORT=/private/path/saved_posts.json CRATE_PRIVATE_REVIEW=/private/path/review.json npm test -- --run tests/private-organize.test.ts` (optionally set a private vector path). It reports only aggregate relevant-assignment precision, coverage, and Unsorted rates, and fails below 85% precision. The files and review notes must remain outside the repository. The text-only result does not establish model-assisted quality.

## Marketing landing page, 2026-09-19

`tests/e2e/marketing.spec.ts` covers public import entry, sample and returning-user entry, every legacy redirect family with query/ID preservation, editable and empty demonstration search, keyboard and touch placement, reset, the three illustrated story chapters, one tracked Bar Sera element, the absence of sticky scroll-driven story state, responsive document overflow, local-only image requests, axe WCAG A/AA checks, reduced motion, and screenshots at 320/375/768/1024/1440. The existing import test establishes successful import navigation into `/app`, while the complete Chromium suite protects browse, organization, search, details, OAuth-adjacent settings, and persistence behavior under the new route prefix.

These are local fixture and browser results. They do not establish deployed Vercel rewrites, live Firebase redirect completion, OAuth, deletion, third-party reel behavior, or real-device performance. Those remain release checks.

## Account-first journey and searchable suggestions, 2026-09-19

Browser coverage now asserts one conversion CTA per landing section, `/app` entry, isolated sample access, grandfathered local IndexedDB access, the always-visible export guide, post-import organization prompt, dashboard Suggested Collections, direct suggestion routes, compact edit controls, scoped suggestion search, and global Saved/Suggested search filters. Firebase sign-in and release admission require mocked or live-project verification; a local cloud-unconfigured run establishes only the honest unavailable state and sample path.

`npm run check` passes with 23 tests and two private checks skipped. The full development and production-preview Chromium suites each pass 15 tests with the opt-in pinned-model test skipped. Axe and horizontal-overflow checks pass at 320/375/768/1024/1440, and the refreshed landing, app entry, dashboard, search, and suggestion-review screenshots were inspected. These results do not establish live Google OAuth, the deployed release document, or deployed Firestore rules.
