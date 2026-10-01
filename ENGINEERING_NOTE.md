# Engineering Note: Architectural Decisions & System Review

### 1. How Quote Verification Works & Where It Could Fail
Our verification engine (`src/lib/quoteVerifier.ts`) enforces **zero trust** toward any offsets, page numbers, or locations reported by the LLM. It operates through a multi-stage deterministic pipeline:
1. **Multi-layer Text Normalization**: Both candidate quotes and the entire extracted document text are passed through unicode character normalization (`\u2018/\u2019` smart apostrophes, `\u201C/\u201D` double quotes, `\u2013/\u2014` em/en-dashes, `\u00AD` soft hyphens, `\u00A0` non-breaking spaces, and repeated whitespace/newlines).
2. **Two-Stage Matching Strategy**:
   - *Stage 1 (Exact Normalized Substring)*: Rapid scan over the normalized text to pinpoint direct quotes and map character offsets back to raw page numbers.
   - *Stage 2 (Sliding-Window Token Sequence)*: Splits quotes into alphanumeric token vectors and scans document tokens using a sliding window. This tolerates line-wrap breaks, hyphenation artifacts, and punctuation variances while enforcing an 85% match threshold to strictly reject paraphrases and hallucinations.
3. **Failure Modes & Edge Cases**:
   - **Severe OCR Degradation**: If an uploaded PDF has low-quality OCR where entire words are misrecognized (e.g. "l1ab1l1ty" for "liability"), exact and token-level verification will reject the quote as unverified.
   - **Heavy Cross-Table Fragmentations**: If a quote spans multiple fragmented table cells or footnotes interleaved with body text, token sequence continuity is interrupted.
   - **Ultra-Short Quotes (<5 words)**: Single phrases like "reasonable care" appear multiple times throughout a 100-page contract, leading to multiple valid candidate positions. We resolve this by binding the quote to the active clause context identified during retrieval.

---

### 2. How Large Documents (150+ Pages) Were Handled
To handle large contracts without blowing token limits or hallucinating completeness:
- **Hierarchical Document Chunking**: Upon upload, contracts are parsed and segmented into discrete clauses (numbered sections) and mapped to page numbers and word boundaries. A 150-page agreement (~65,000 words) is indexed into structured clause blocks in **under 400 milliseconds**.
- **Agentic Targeted Retrieval**: Rather than stuffing entire 150-page documents into a single prompt, the research agent queries the document structure via `list_clauses()`, executes targeted scans via `search_document()`, and retrieves specific sections via `get_section()`.
- **Coverage Transparency Rule**: If an answer is generated from a partial inspection of the contract, the app explicitly reports the exact pages and clauses evaluated (e.g., *"Inspected 4 of 150 pages. Scope: partial"*), preventing false assertions of whole-document omission.

---

### 3. Part C Selection: Option 2 (Agentic Document Research)
**Why Option 2 was chosen**:
Option 2 directly solves the large document constraint (Requirement 4) and multi-document synthesis (Requirement 6). In modern legal AI, stuffing 150 pages into context degrades recall accuracy (the "lost in the middle" problem) and incurs massive token costs. Equipping the model with tools (`search_document`, `get_section`, `list_clauses`, `inspect_page`) mirrors how a human legal associate actually reviews contracts: scanning the table of contents, searching relevant terminology, and reading governing clauses in full.

**Implementation Status & Hardest Part**:
- *Status*: Fully finished. The multi-round agent tool loop runs up to a hard cap of 5 iterations, streams live human-readable progress updates (*"Searching for limitation of liability...", "Inspecting Section 6..."*), handles malformed tool arguments without crashing, and runs quote verification on the final answer.
- *Hardest Challenge*: **Defensive Tool Call Resilience & Premature Termination**. LLMs occasionally call tools with hallucinated function names, missing arguments, or attempt to answer after only searching a single generic keyword. We implemented defensive schema validation that intercepts malformed calls, returns descriptive JSON feedback to the model, and guides it to inspect the actual clause text before concluding its answer.

---

### 4. What We Would Build Next With More Time
1. **Clause Anonymization & Redaction Pipeline**: Automatic PII/company name anonymization with cryptographic reversible token maps (`[COMPANY_A]`, `[OFFICER_1]`) prior to external model ingestion.
2. **Interactive Redline Export (.docx track changes)**: Merging Part C Option 1 to allow users to export the substantive comparison or requested clause modifications as native Word `.docx` revisions with `w:ins` and `w:del` XML tags.
3. **Dense Hybrid Vector Embeddings**: Supplementing BM25 section search with local embedding models (e.g., `bge-small` / OpenAI `text-embedding-3-small`) stored in `pgvector` or local SQLite vector extension for high-recall semantic nuance.
4. **Arabic RTL Legal Support**: Full right-to-left layout rendering and bilingual Arabic/English contract alignment tailored for UAE/DIFC/ADGM dual-language legal instruments.
