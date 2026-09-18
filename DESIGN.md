# Design system

## Reference and composition

The supplied reference is authoritative for the visual family, not literal screen content. Warm cream, expressive purple, yellow, sage, charcoal, condensed display type, readable body type, layered objects, organic corners, circular controls, and intentional whitespace. Desktop uses an editorial masthead and asymmetric collections; mobile has tactile bottom navigation. No admin sidebar, stats, gradients, glass, technical status dashboard, invented media, or “AI” branding.

## Tokens

CSS in src/styles.css is the implementation authority:

| Role                     | Value   |
| ------------------------ | ------- |
| Canvas                   | #F7F3E8 |
| Warm surface             | #E9E4CF |
| Expressive purple        | #9062BF |
| Accessible action purple | #654091 |
| Yellow                   | #FFBD08 |
| Sage                     | #7D8D70 |
| Cyan reserved accent     | #42B7DF |
| Primary ink              | #332E33 |
| Secondary ink            | #686168 |
| Border                   | #D7D0C3 |
| Error                    | #A3313E |

Body DM Sans 400/500/600; display Barlow Condensed 400/600/700; self-hosted WOFF2, system fallback for multilingual glyphs. Body 11 metadata, 13 compact, 14 standard, 16–18 content; display 30/40/56/64/88 fluid. Body line-height 1.5–1.9; display 1.0–1.1. Selective headline weight changes replace decorative effects. Metadata must never hold essential content inaccessible at normal zoom.

Spacing rhythm 4/8/12/16/24/32/48/64/96 px. Local optical values in the stylesheet are explicit compositional adjustments. Surface radii 12/18/24/30/40 px, circles for compact actions. Thin warm borders, mostly no shadows; modal and mobile navigation have restrained depth. Warm neutral save cards are compact readable objects; expressive collection surfaces cycle four deterministic compositions: purple floral type, yellow concentric shape, sage editorial type, warm stacked paper. Decorative shapes are aria-hidden.

## Interaction and states

Primary purple action, bordered neutral secondary, red irreversible confirmation. Icon-only buttons have names; targets normally 44–48 px. Native dialogs provide focus containment, Escape, and restored focus. Original captions preserve line breaks. Cards truncate previews only; full detail retains all caption variants.

Empty library has one primary import action and a secondary sample-library action. Import has selection, actual reading, preview, explicit valid-part consent, error/report, commit. `/organize` offers a recommended on-device model, conservative text fallback, and explicit custom category path. It shows actual reviewed counts, download progress, pause/resume, and a persistent proposal gallery with individual collection reviews before saving. Do not say “you can leave” while device-local processing is active. Failures retain the library and provide actionable plain-language recovery.

## Responsive behavior

1440 px maximum canvas; 64 px desktop gutters, 36 px tablet, 20–24 px mobile. Collection grid 4 columns above 1150, 2 below; save grid 4/2/1. Breakpoints 1150, 767, 639. Mobile bottom navigation has reserved body space. Details are a two-column article/notes layout on desktop and a full route on mobile. Search filters wrap; long captions/filenames/hashtags break safely. A list presentation complements cards.

## Motion and accessibility

120–180 ms controls, 200 ms hover settling. No persistent motion or fake processing animation. Honor prefers-reduced-motion. WCAG 2.2 AA goal: contrast, semantics, focus, keyboard, dialog containment, live progress, meaningful labels, 200% zoom, no horizontal overflow, and touch targets. Automated axe checks support but do not replace manual keyboard/mobile review. Test production compositions at 375/768/1024/1440 and the smallest supported viewport.

Accessibility adjustment: purple collection surfaces use #8b5db9 beneath small white metadata; sage metadata uses #192216. These modest adjustments preserve the supplied palette while meeting checked text contrast.
