# Veritas Legal AI — Contract Analysis & Substantive Comparison Platform

> **Veritas Legal AI** is an enterprise-grade web application for analyzing, verifying, and comparing legal contracts. It ensures every AI assertion is backed by verbatim, verified quotes located directly in the source document, highlights exact passages across page boundaries, performs substantive clause-level diffing between contract versions, and conducts multi-round agentic document research.

---

## Visual Showcase & Screenshots

### 1. Document Library & Processing Pipeline
*Accepts PDF and DOCX formats, extracts page layout and clause hierarchy, rejects invalid formats, and alerts users immediately upon detecting scanned/image-only PDFs.*

![Document Library](public/screenshots/document_library.png)

### 2. Contract Chat with Real-Time Streaming & Verified Quotes
*Streams responses token-by-token with user stop-generation control. Every supporting quote is programmatically verified against the document text; quotes found are marked with a green Verified badge and source page number.*

![Chat and Verified Quotes](public/screenshots/chat_and_citation.png)

### 3. Interactive Citation Highlighting (Split-Pane Workspace)
*Clicking any verified quote in the chat automatically navigates the Document Viewer to the exact page, scrolls to the passage, and highlights it with an animated high-contrast pulse indicator.*

### 4. Contract Version Comparison & Substantive Diffing
*Compares two contract versions (e.g., v1 vs v2) at the clause level. Provides plain-language summaries of substantive legal exposure shifts (e.g., liability cap moving from AED 100,000 to AED 1,000,000) and categorizes changes by High, Medium, or Low significance.*

![Contract Comparison](public/screenshots/contract_comparison.png)

---

## Core Capabilities & Implemented Requirements

### Part A: Core Features
1. **Document Upload & Ingestion**:
   - Accepts `.pdf` and `.docx` strictly, immediately rejecting unsupported file formats with clear guidance.
   - Live processing status: Displays granular state progression (*"Extracting text layout...", "Detecting clauses and scanning for scanned raster...", "Indexing complete"*).
   - **Scanned PDF Detection**: Evaluates readable character densities and printable glyph ratios across all pages. If character count is zero or near-zero, it rejects the document with an actionable alert rather than saving an empty document.
   - Full library management: list, open, and delete contracts.
2. **Streaming Chat with Generation Control**:
   - Token-by-token streaming via Server-Sent Events (SSE).
   - **Stop Generation Control**: Users can interrupt generation at any moment; whatever partial response was generated is preserved in the database.
   - Persistent chat histories stored per document.
3. **Programmatic Quote Verification (Most Important Requirement)**:
   - Zero trust for AI-reported offsets or page numbers: independent verification engine locates quotes directly in the source document text.
   - Tolerates whitespace variance, line breaks, soft hyphens, smart quotation marks, and non-breaking spaces.
   - **Genuine Quotes**: Verified and linked to the document viewer with page numbers.
   - **Hallucinated or Paraphrased Quotes**: Flagged clearly as `[Unverified / Paraphrased]` with a warning that the passage was not found in the original source text.
4. **Large Documents & Coverage Transparency (150-Page Contracts)**:
   - High-performance indexing parses 150-page enterprise agreements in sub-second time.
   - **Coverage Transparency**: If the AI only inspected a subset of sections or pages, it explicitly presents a coverage notice (e.g., *"Inspected 4 of 150 pages. Scope: partial. Findings grounded strictly in retrieved sections."*) rather than falsely claiming whole-document omniscience.

### Part B: Advanced Features
5. **Citation Highlighting & Layout Mapping**:
   - Clicking a verified quote scrolls smoothly to the passage in the document viewer, highlighting across line breaks and displaying a verified source badge.
6. **Multi-Document Synthesis**:
   - Select multiple contracts from the repository and ask a single cross-contract question.
   - Evaluates terms across all selected contracts, attributes quotes to their specific source document, and verifies each quote against its own document.
7. **Substantive Contract Comparison (Redline Diff)**:
   - Clause-by-clause alignment between Version 1 and Version 2 contracts.
   - Plain-language legal impact summary (distinguishing stylistic edits from material shifts such as 10x liability expansions, payment acceleration from 30 to 15 days, or deletion of termination for convenience).
   - Filter and sort controls by significance level (`HIGH`, `MEDIUM`, `LOW`) and status (`MODIFIED`, `ADDED`, `DELETED`).

### Part C: Option 2 — Agentic Document Research
- Equips the model with programmatic tools:
  - `list_clauses()`: Inspects table of contents and numbered section hierarchy.
  - `search_document(query)`: Scans for legal provisions and keywords.
  - `get_section(section)`: Retrieves full text of specific clauses.
  - `inspect_page(page_number)`: Reads target page contents.
- Multi-round agent reasoning loop with real-time UI status updates (*"Searching for limitation of liability...", "Inspecting Section 6..."*).
- Hard cap of 5 rounds to prevent unbounded token costs or infinite loops.
- Resilient error handling for malformed or invented tool calls.
- Strict quote verification applied to the final output.

---

## Technical Stack & Design Choices

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS with a classic, neutral legal theme (Deep Slate `#0f172a`, Off-White Paper `#f8fafc`, Muted Charcoal `#334155`, and verified Emerald badges).
- **Backend**: Node.js Next.js API route handlers with streaming SSE.
- **Database**:
  - **Zero-Friction Local Default**: Node built-in SQLite database (`data/contracts.db`) with Write-Ahead Logging (WAL) and concurrent busy timeout handling.
  - **Production PostgreSQL Support**: Automatically connects to PostgreSQL if `DATABASE_URL` is set in the environment.
- **Document Extractors**:
  - `pdf-parse`: Page-by-page layout preservation and coordinate tracking.
  - `mammoth`: DOCX structured text and paragraph extraction.
  - `diff`: Word-level addition and deletion diffing.

---

## How to Run Locally

### Prerequisites
- Node.js 18+ (tested on Node 20 & Node 24)
- npm

### 1. Clone & Install
```bash
git clone <your-repo-link>
cd hiring-assignment
npm install
```

### 2. Configure Environment (Optional)
The application works **100% out of the box** without external API keys thanks to its built-in legal research engine and sample contracts.

To connect to external LLM providers, create a `.env.local` file:
```env
# Optional AI Key (OpenAI, OpenRouter, Gemini, Anthropic, or Groq)
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"

# Optional PostgreSQL Database (defaults to local SQLite if omitted)
# DATABASE_URL="postgresql://user:password@localhost:5432/contracts_db"
```

### 3. Run the Application
```bash
npm run build
npm run start
```
Open your browser at [http://localhost:3000](http://localhost:3000).

### 4. Load Sample Contracts
Click the **"Load Sample Contracts"** button in the top navigation bar to instantly populate:
- `Enterprise_SaaS_Agreement.pdf` (Searchable multi-page PDF)
- `Commercial_Agreement_v1.docx` (Base version DOCX)
- `Commercial_Agreement_v2.docx` (Amended version with 10x liability cap)
- `150_Page_Enterprise_Master_Agreement.pdf` (150-page large contract test)
- `Scanned_Contract_No_Text.pdf` (Scanned PDF zero-text detection test)

### 5. Automated Test Suite
Run the verification and pipeline tests:
```bash
npx tsx scripts/test_verifier.ts
npx tsx scripts/test_pipeline.ts
```

---

## Feature Completion Status

| Feature | Requirement | Status | Notes |
|---|---|---|---|
| PDF & DOCX Upload | Part A (1) | Finished | Filetype enforcement, progress stages |
| Scanned PDF Rejection | Part A (1) | Finished | Rejects zero-text scanned PDFs with alert |
| Document Library | Part A (1) | Finished | List, open, and delete documents |
| Streaming Chat | Part A (2) | Finished | SSE streaming with Stop Generation control |
| Per-Document Chat History | Part A (2) | Finished | Saved in DB, switch or create new chats |
| Programmatic Quote Verification | Part A (3) | Finished | Normalized token & n-gram matcher |
| Large Documents (150 pages) | Part A (4) | Finished | Parsed in <400ms, transparent coverage notice |
| Citation Highlighting | Part B (5) | Finished | Auto-navigates, scrolls into view, pulses highlight |
| Multi-Document Questions | Part B (6) | Finished | Comparative synthesis with source document badges |
| Contract Comparison | Part B (7) | Finished | Clause diffs, High/Med/Low significance, AED 100k -> 1M |
| Part C: Agentic Research | Part C (Opt 2) | Finished | Multi-round tool loop with live status and 5-round cap |

---

## License
MIT
