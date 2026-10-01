# Veritas Legal AI — Architecture & Submission Note

### Candidate: Kalp Patel
### Project: Veritas Legal AI (Contract Analysis, Substantive Comparison & Agentic Research)

---

## 1. How Quote Verification Works, and Where It Could Fail

### The Mechanism
In Veritas Legal AI, quotes are never trusted based on AI self-reporting. Quote verification is a zero-trust, deterministic programmatic pipeline:
1. **Unicode Alphanumeric Normalization**: Text extracted from PDFs/DOCXs contains soft hyphens (`\u00AD`), zero-width spaces (`\u200B`), smart quotation marks (`“”‘’`), non-breaking spaces, and platform line breaks. Both candidate quotes and the entire document are canonicalized using Unicode character property regexes (`[\p{L}\p{N}]/gu`), ensuring that Arabic right-to-left scripts, Indic ligatures (Gujarati/Hindi), CJK unspaced glyphs, and European accented characters normalize identically.
2. **Deterministic Exact Substring & Offset Mapping**: We map tokens back to exact character start/end coordinates and physical page boundaries (`pageOffsets`). If a direct normalized sequence match occurs, the verifier computes the exact `startOffset`, `endOffset`, and `pageNumber` (including `endPageNumber` if spanning across a page transition).
3. **Sliding-Window Levenshtein Tolerance (90% Threshold)**: OCR scanning errors and hyphenated line breaks often introduce minor character drift (e.g., `defin-ition` or `1` vs `l`). A sliding window compares candidate n-grams against document token sequences, accepting quotes only if token similarity exceeds 90%. Quotes failing this check are classified as `unverified` and visually flagged in red with a warning that the text was synthesized or paraphrased.

### Where It Could Fail (Edge Cases & Failure Modes)
- **Severe OCR Character Corruption**: In poorly scanned documents (e.g., degraded faxes) where OCR garbles >15% of characters in a clause, fuzzy matching will safely reject the quote to prevent false positives.
- **Identical Repeated Boilerplate**: When an identical standard clause (e.g., *"This Agreement may be executed in counterparts"*) appears verbatim in multiple places or schedules, single-occurrence index search links to the first match unless contextual sentence windowing or target page hints are supplied.
- **Embedded Visual Tables & Graphical Text**: Text inside image charts or vector graphics without embedded font glyphs cannot be matched by plain-text extractors without vision OCR preprocessing.

---

## 2. How Large Documents (150+ Pages) Are Handled

### The Strategy
A 150-page enterprise contract easily exceeds typical LLM prompt limits and runs the risk of cost explosion or hallucinated omissions. We employ a three-tier architecture:
1. **Sub-Second Structural Parsing**: Documents are ingested into memory and indexed into page-level chunks with clause boundaries (Preamble, Recitals, Numbered Clauses, Exhibits) and stored in SQLite/PostgreSQL with Write-Ahead Logging (WAL) and token indexes.
2. **ReAct Autonomous Tool Loop**: Instead of shoving 150 pages into a single LLM request, the model uses tools (`toolSearchDocument`, `toolReadDocumentSection`, `toolVerifyCitation`) to search section indexes, retrieve only candidate pages, and verify citations on demand.
3. **Coverage Transparency Enforcement**: To uphold the assignment's golden rule (*"Never confidently state a clause does not exist after reading only part of a document"*), every response calculates an exact coverage metric:
   $$\text{Coverage Ratio} = \frac{\text{Pages Inspected}}{\text{Total Document Pages}}$$
   If only a subset was retrieved, the response renders a prominent Coverage Notice:
   `"Inspected 4 of 150 pages (3% coverage). Findings grounded strictly in retrieved sections."`

---

## 3. Which Part C Option Was Chosen and Why

### Selection: Option 2 — Agentic Document Research
We selected **Option 2 (Agentic Document Research)** because real-world legal due diligence is fundamentally exploratory and multi-hop. Lawyers do not read contracts linearly; they follow cross-references (e.g., *"Subject to Section 14.2..."* necessitates jumping from Page 2 to Page 26).

### Implementation & Progress
- Implemented a complete ReAct agent loop with tool definitions:
  - `toolSearchDocument(query)`: Scans token index with bilingual alias expansion.
  - `toolReadDocumentSection(pageNumber)`: Reads surrounding contextual paragraphs.
  - `toolVerifyCitation(quote)`: Programmatically verifies quotes before writing answers.
- **Real-Time Step Visualization**: Instead of a generic spinner, the UI streams active agent thoughts (*"Searching for limitation of liability...", "Inspecting Section 8 on Page 12..."*).
- **Hard Cap & Safety Guards**: Capped at 5 autonomous rounds to prevent infinite loops and runaway API costs. Malformed parameters or hallucinated tool names are caught gracefully and fed back to the model as correction prompts.

### The Hardest Part
The single hardest engineering challenge was **handling legacy font encoding in real-world legal documents**. Many scanned and printed PDFs (like 40-page investment circulars) use 8-bit regional DTP fonts (e.g., Gopika/LMG) where glyph codes do not match Unicode CMap tables. Enabling the agent to expand English terms to companion font aliases and cross-page references (e.g., discovering multi-page occurrences across Page 2 and Page 26) required deep layout-level token mapping.

---

## 4. What We Would Build Next With More Time

1. **Document-to-DOCX Tracked Changes (Part C Option 1)**: Combine Part C Option 2 with Option 1 by modifying the underlying OpenXML package (`word/document.xml`) with `<w:ins>` and `<w:del>` tags to generate native Microsoft Word tracked changes without disturbing document styling.
2. **Hybrid Semantic & Dense Vector Search**: Integrate a local vector store (e.g., `sqlite-vec` or `pgvector`) alongside BM25 full-text search for conceptual similarity retrieval (e.g., matching *"uncapped indemnification"* to *"hold harmless without limitation"*).
3. **Interactive Side-by-Side Canvas Diff**: Enhance the clause comparison view with visual SVG connect-lines linking corresponding clauses across two contract versions on an infinite canvas.
4. **Legal Entity Anonymization Engine**: Implement client-side named entity recognition (NER) to redact party names, addresses, and monetary amounts into reusable tokens (`[PARTY_A]`, `[MAX_LIABILITY]`) before sending to cloud LLMs.
