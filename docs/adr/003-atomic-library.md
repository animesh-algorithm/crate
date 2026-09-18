# ADR-003: Atomic owner library snapshots

Status: accepted implementation default.

Decision: PostgreSQL stores a validated JSONB library per account, with incremental item patches, a row lock, and expected revision. Ten initial accounts and bounded libraries make this simpler than item/join-table migrations. RLS handles reads, RPC derives owner and exclusively handles writes.

Consequences: collection metadata travels with writes and JSONB validation scales with library size. Cloud startup reads a bounded snapshot. Larger capacity may justify a relational migration later; stable identities and versioned exports make it possible. Tests must cover server constraints and permissions directly, not only the browser validator.
