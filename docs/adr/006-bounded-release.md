# ADR-006: Bounded public activation

Status: accepted default; live verification pending.

Decision: ten publicly assigned cloud library slots; 5,000 saves and 15 MiB normalized item data per account. Authenticated database code atomically checks initial activation and quotas. Activation closed by default until release checks pass; operator pauses admissions/imports near free-tier headroom thresholds. No paid fallback.

Consequences: capacity message instead of invitation or silent billing. Local libraries continue to work without online activation. Free-tier policy changes, bandwidth exhaustion, and inactivity pausing remain availability risks. Monitor real DB and egress usage and require a separate budget decision for upgrades.
