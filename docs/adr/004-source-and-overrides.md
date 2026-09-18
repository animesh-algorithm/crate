# ADR-004: Source and personal choices

Status: accepted confirmed requirement.

Decision: source caption variants remain distinct. Reimports update source fields and retain absent items/personal edits. Manual collection names and memberships survive organization; explicit exclusions prevent return. Removed saves have tombstones. Collection deletion retains saves; merge unions distinct memberships; split uses selected moves/copies. Export dates have unverified semantics and are never labeled publication dates.

Consequences: uncertain saves remain usable in Unsorted and can receive notes. No scraping or inferred missing facts. Ten local revision snapshots support undo; explicit restore can reinstate tombstoned saves.
