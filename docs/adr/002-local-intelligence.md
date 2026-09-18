# ADR-002: Device-local intelligence

Status: accepted, performance and quality release evaluation pending.

Decision: pin quantized multilingual E5-small for local related search and nearest-neighbor/Louvain grouping. Use shared source-word groups without a model download. Labels are extracted from evidence; no generated summaries. No private text goes to an AI provider.

Consequences: first-use download around 120 MB plus runtime, device memory/time/battery cost, browser must remain open while working, completed vectors resume from IndexedDB. Exact search is always independent. Device compatibility and quality must be measured; free cloud inference credits are not a dependable completion guarantee.

Implementation: Transformers.js 4 uses locally bundled standard WASM (about 14 MB), with unused asyncify assets excluded to stay within the static hosting per-file limit. The model revision is pinned and production CSP permits WASM execution while keeping script assets local. Captions beyond the tokenizer context window are truncated for embeddings; full source remains in exact search. Large semantic groups may propose one level of evidence-derived subcollections; intent stays manual.
