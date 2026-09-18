# ADR-005: Google-only accounts

Status: accepted $0 implementation default.

Decision: Supabase Auth Google OAuth PKCE only. Device-only access is available without account activation. No magic links/readiness emails or custom SMTP dependency at launch. Sign-in never silently transfers a local library.

Consequences: Google account required for synchronization. Configure exact redirects and test deployed session restoration. Users can explicitly export/restore when moving device-only data online. An operator must identify itself and provide privacy contact before public activation.
