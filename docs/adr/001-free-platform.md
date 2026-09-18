# ADR-001: Free platform

Status: accepted.

Context: the budget changed from $25/month to $0 at launch. Paid Workers, provider AI, domain purchases, and trial-dependent services violate this requirement.

Decision: static React/Vite on Cloudflare Pages Free, optional Supabase Free PostgreSQL/Auth, device-only mode without credentials. No service enables automatic paid upgrades.

Consequences: public beta has capacity limits, possible inactivity pauses, no paid availability guarantee or automatic recovery backups. Hosting is independent of personal processing. Existing free-tier prices must be reverified before public activation.
