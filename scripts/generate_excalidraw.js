const fs = require('fs');
const path = require('path');

let idCounter = 1;
function genId(prefix = 'elem') {
  return `${prefix}_${idCounter++}_${Math.random().toString(36).substring(2, 7)}`;
}

const elements = [];

// Helper to create a card box with proper padding and no text overflow
function addCard({
  x, y, width, height, title, lines = [],
  bgColor = '#ffffff', strokeColor = '#1e293b',
  strokeWidth = 2, strokeStyle = 'solid', roughness = 0,
  roundness = { type: 3 }, titleColor = '#0f172a', bodyColor = '#334155',
  fontFamily = 2 // 2 = Helvetica / Normal clean text
}) {
  const boxId = genId('box');

  // Background Box
  elements.push({
    id: boxId,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor: bgColor,
    fillStyle: 'solid',
    strokeWidth,
    strokeStyle,
    roughness,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false
  });

  // Title element (centered, bold, clear)
  const titleId = genId('title');
  const titleFontSize = 14;
  elements.push({
    id: titleId,
    type: 'text',
    x: x + 12,
    y: y + 14,
    width: width - 24,
    height: titleFontSize * 1.4,
    angle: 0,
    strokeColor: titleColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text: title,
    fontSize: titleFontSize,
    fontFamily, // Normal text
    textAlign: 'center',
    verticalAlign: 'top',
    baseline: titleFontSize,
    containerId: null,
    originalText: title,
    lineHeight: 1.25
  });

  // Separator subtle line
  if (lines.length > 0) {
    elements.push({
      id: genId('sep'),
      type: 'line',
      x: x + 16,
      y: y + 36,
      width: width - 32,
      height: 0,
      angle: 0,
      strokeColor: strokeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'dotted',
      roughness: 0,
      opacity: 35,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      points: [[0, 0], [width - 32, 0]],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null
    });

    // Body lines element
    const bodyId = genId('body');
    const bodyFontSize = 12;
    const bodyText = lines.join('\n');
    const bodyHeight = lines.length * 18;
    elements.push({
      id: bodyId,
      type: 'text',
      x: x + 16,
      y: y + 44,
      width: width - 32,
      height: bodyHeight,
      angle: 0,
      strokeColor: bodyColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: bodyText,
      fontSize: bodyFontSize,
      fontFamily, // Normal text
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: bodyFontSize,
      containerId: null,
      originalText: bodyText,
      lineHeight: 1.35
    });
  }

  return { id: boxId, x, y, width, height };
}

// Section Container Box
function addContainer({
  x, y, width, height, title,
  bgColor = '#f8fafc', strokeColor = '#94a3b8',
  titleColor = '#0f172a', strokeWidth = 2, strokeStyle = 'solid'
}) {
  const containerId = genId('container');
  elements.push({
    id: containerId,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor,
    backgroundColor: bgColor,
    fillStyle: 'solid',
    strokeWidth,
    strokeStyle,
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false
  });

  // Section Header Badge
  const headerId = genId('sect_header');
  elements.push({
    id: headerId,
    type: 'text',
    x: x + 20,
    y: y + 12,
    width: width - 40,
    height: 22,
    angle: 0,
    strokeColor: titleColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text: title,
    fontSize: 14,
    fontFamily: 2, // Normal text
    textAlign: 'left',
    verticalAlign: 'middle',
    baseline: 14,
    containerId: null,
    originalText: title,
    lineHeight: 1.2
  });

  return { id: containerId, x, y, width, height };
}

// Clean arrow function with optional midpoint waypoints
function addCleanArrow({
  points, strokeColor = '#475569', strokeWidth = 2,
  strokeStyle = 'solid', label = '', labelX = 0, labelY = 0, labelW = 120
}) {
  const arrowId = genId('arrow');
  const startX = points[0][0];
  const startY = points[0][1];

  const relPoints = points.map(pt => [pt[0] - startX, pt[1] - startY]);
  const minX = Math.min(...relPoints.map(p => p[0]));
  const maxX = Math.max(...relPoints.map(p => p[0]));
  const minY = Math.min(...relPoints.map(p => p[1]));
  const maxY = Math.max(...relPoints.map(p => p[1]));

  elements.push({
    id: arrowId,
    type: 'arrow',
    x: startX,
    y: startY,
    width: Math.max(Math.abs(maxX - minX), 10),
    height: Math.max(Math.abs(maxY - minY), 10),
    angle: 0,
    strokeColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth,
    strokeStyle,
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    points: relPoints,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow'
  });

  if (label) {
    const lx = labelX || (points[0][0] + points[points.length - 1][0]) / 2 - labelW / 2;
    const ly = labelY || (points[0][1] + points[points.length - 1][1]) / 2 - 11;

    // Background pill behind label so it never clashes with lines
    elements.push({
      id: genId('arrow_pill'),
      type: 'rectangle',
      x: lx - 6,
      y: ly - 3,
      width: labelW + 12,
      height: 22,
      angle: 0,
      strokeColor: '#cbd5e1',
      backgroundColor: '#ffffff',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 98,
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false
    });

    elements.push({
      id: genId('arrow_label'),
      type: 'text',
      x: lx,
      y: ly,
      width: labelW,
      height: 18,
      angle: 0,
      strokeColor: '#0f172a',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: label,
      fontSize: 11,
      fontFamily: 2, // Normal text
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 11,
      containerId: null,
      originalText: label,
      lineHeight: 1.2
    });
  }
}

// =========================================================================
// CANVAS ARCHITECTURE LAYOUT WITH GENEROUS GUTTERS
// =========================================================================

const CANVAS_WIDTH = 1720;
const LEFT_X = 70;

// 1. TOP HEADER BANNER
elements.push({
  id: genId('header_box'),
  type: 'rectangle',
  x: LEFT_X,
  y: 40,
  width: CANVAS_WIDTH,
  height: 90,
  angle: 0,
  strokeColor: '#0284c7',
  backgroundColor: '#0f172a',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 0,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: { type: 3 },
  seed: Math.floor(Math.random() * 100000),
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  boundElements: [],
  updated: Date.now(),
  link: null,
  locked: false
});

elements.push({
  id: genId('header_title'),
  type: 'text',
  x: LEFT_X + 20,
  y: 54,
  width: CANVAS_WIDTH - 40,
  height: 28,
  angle: 0,
  strokeColor: '#38bdf8',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 1,
  strokeStyle: 'solid',
  roughness: 0,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: Math.floor(Math.random() * 100000),
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
  text: 'VERITAS LEGAL AI — SYSTEM ARCHITECTURE & DATA FLOW PIPELINE',
  fontSize: 20,
  fontFamily: 2, // Normal text
  textAlign: 'center',
  verticalAlign: 'middle',
  baseline: 20,
  containerId: null,
  originalText: 'VERITAS LEGAL AI — SYSTEM ARCHITECTURE & DATA FLOW PIPELINE',
  lineHeight: 1.25
});

elements.push({
  id: genId('header_sub'),
  type: 'text',
  x: LEFT_X + 20,
  y: 86,
  width: CANVAS_WIDTH - 40,
  height: 20,
  angle: 0,
  strokeColor: '#cbd5e1',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 1,
  strokeStyle: 'solid',
  roughness: 0,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: Math.floor(Math.random() * 100000),
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
  text: 'Full End-to-End Enterprise Architecture: Ingestion, Autonomous ReAct Tool Loop, Dual-Engine LLM Fallback, Zero-Trust Quote Verification & Substantive Diff',
  fontSize: 12,
  fontFamily: 2, // Normal text
  textAlign: 'center',
  verticalAlign: 'middle',
  baseline: 12,
  containerId: null,
  originalText: 'Full End-to-End Enterprise Architecture: Ingestion, Autonomous ReAct Tool Loop, Dual-Engine LLM Fallback, Zero-Trust Quote Verification & Substantive Diff',
  lineHeight: 1.25
});

// =========================================================================
// TIER 1: CLIENT PRESENTATION & INTERACTION LAYER (TOP)
// =========================================================================
addContainer({
  x: LEFT_X,
  y: 160,
  width: CANVAS_WIDTH,
  height: 200,
  title: 'TIER 1: PRESENTATION & INTERACTION LAYER (Next.js 14 App Router + TailwindCSS)',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8'
});

// Card 1: Document Upload & Library
addCard({
  x: LEFT_X + 25,
  y: 205,
  width: 395,
  height: 135,
  title: 'Document Library & Upload Hub',
  lines: [
    '• Drag & drop PDF and DOCX contracts',
    '• Real-time extraction status & scanned guard',
    '• Multi-document selection & tagging',
    '• Universal language file support (Arabic, Indic)'
  ],
  bgColor: '#dcfce7',
  strokeColor: '#16a34a'
});

// Card 2: Streaming Chat & Interrupt Controller
addCard({
  x: LEFT_X + 450,
  y: 205,
  width: 395,
  height: 135,
  title: 'Streaming Chat & Interrupt Controller',
  lines: [
    '• Server-Sent Events (SSE) token streaming',
    '• User abort / interrupt signal controller',
    '• Visual Agent Research loop progress bar',
    '• Multilingual query auto-mirroring (Gujarati, Arabic)'
  ],
  bgColor: '#e0f2fe',
  strokeColor: '#0284c7'
});

// Card 3: Interactive Document Viewer
addCard({
  x: LEFT_X + 875,
  y: 205,
  width: 395,
  height: 135,
  title: 'Interactive Document Viewer',
  lines: [
    '• Page-by-page PDF / DOCX legal viewer',
    '• Dynamic pulsing citation highlight (Emerald/Amber)',
    '• Scroll-to-quote exact coordinate & text locator',
    '• Zero-flicker client-side canvas memoization'
  ],
  bgColor: '#eff6ff',
  strokeColor: '#2563eb'
});

// Card 4: Substantive Diff & Liability Heatmap
addCard({
  x: LEFT_X + 1300,
  y: 205,
  width: 395,
  height: 135,
  title: 'Substantive Diff & Exposure Heatmap',
  lines: [
    '• Side-by-side contract version alignment',
    '• Financial liability & penalty exposure delta',
    '• Non-standard deviation risk severity badge',
    '• Executive summary & negotiation export'
  ],
  bgColor: '#fef3c7',
  strokeColor: '#d97706'
});

// =========================================================================
// MIDDLE TIERS: 3 DISTINCT COLUMNS WITH SPACIOUS 75px GUTTERS
// =========================================================================

// COLUMN 1: TIER 2 INGESTION & STRUCTURAL PARSING (Left: x = LEFT_X, w = 475)
const COL1_X = LEFT_X;
const COL1_W = 475;

addContainer({
  x: COL1_X,
  y: 410,
  width: COL1_W,
  height: 520,
  title: 'TIER 2: INGESTION & STRUCTURAL PARSING',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8'
});

addCard({
  x: COL1_X + 25,
  y: 455,
  width: COL1_W - 50,
  height: 135,
  title: 'Multipart Ingestion & OCR Zero-Text Guard',
  lines: [
    '• Next.js API multipart streaming (Formidable)',
    '• Unicode scanner check: [\\p{L}\\p{N}]/gu property',
    '• Deterministic rejection of image-only scanned files',
    '• Immediate actionable user error feedback'
  ],
  bgColor: '#ffffff',
  strokeColor: '#64748b'
});

addCard({
  x: COL1_X + 25,
  y: 615,
  width: COL1_W - 50,
  height: 145,
  title: 'Document Parser & Glyph Deconstruction',
  lines: [
    '• pdf-parse & mammoth for DOCX / PDF contracts',
    '• Page-by-page text & layout indexing',
    '• Section boundaries (Preamble, Clauses, Exhibits)',
    '• Legacy 8-bit DTP font alias expander (Gopika/LMG)',
    '• Multilingual CJK & RTL Arabic normalizer'
  ],
  bgColor: '#ffffff',
  strokeColor: '#64748b'
});

addCard({
  x: COL1_X + 25,
  y: 785,
  width: COL1_W - 50,
  height: 125,
  title: 'SQLite Contract & Clause Metadata DB',
  lines: [
    '• contracts, contract_clauses, qna_sessions tables',
    '• High-speed token index for instant clause lookup',
    '• Foreign key constraints & audit history',
    '• Concurrent WAL mode persistence'
  ],
  bgColor: '#f1f5f9',
  strokeColor: '#475569'
});

// COLUMN 2: TIER 3 AGENTIC REACT RESEARCH LOOP (Center: x = COL1_X + 545, w = 545)
const COL2_X = COL1_X + COL1_W + 70; // 70px gutter between Col 1 and Col 2
const COL2_W = 545;

addContainer({
  x: COL2_X,
  y: 410,
  width: COL2_W,
  height: 520,
  title: 'TIER 3: AGENTIC RE-ACT RESEARCH LOOP (Option 2)',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8'
});

addCard({
  x: COL2_X + 25,
  y: 455,
  width: COL2_W - 50,
  height: 125,
  title: 'Autonomous Research Coordinator',
  lines: [
    '• Complex legal query decomposition & intent planning',
    '• Iteration budget controller (1 to 5 autonomous rounds)',
    '• Multi-hop cross-page evidence discovery (e.g. Page 2 & 26)',
    '• Structured reasoning trajectory recorder'
  ],
  bgColor: '#eff6ff',
  strokeColor: '#2563eb'
});

addCard({
  x: COL2_X + 25,
  y: 600,
  width: COL2_W - 50,
  height: 175,
  title: 'Dynamic Tool Execution Registry',
  lines: [
    '1. toolSearchDocument(query, docId):',
    '   Token scan with bilingual alias expansion',
    '2. toolReadDocumentSection(docId, pageNumber):',
    '   Deep context window retrieval around target clauses',
    '3. toolVerifyCitation(docId, quote):',
    '   Instant zero-trust programmatic validation pre-check'
  ],
  bgColor: '#ffffff',
  strokeColor: '#2563eb'
});

addCard({
  x: COL2_X + 25,
  y: 795,
  width: COL2_W - 50,
  height: 115,
  title: 'Evidence Assembly & Context Synthesizer',
  lines: [
    '• Cross-clause snippet deduplication & relevance ranking',
    '• Strict zero-hallucination prompt envelope assembly',
    '• Automatic language mirroring (Gujarati, Arabic, Hindi)'
  ],
  bgColor: '#eff6ff',
  strokeColor: '#2563eb'
});

// COLUMN 3: TIER 4 DUAL-ENGINE AI SYNTHESIS (Right: x = COL2_X + 615, w = 560)
const COL3_X = COL2_X + COL2_W + 70; // 70px gutter between Col 2 and Col 3
const COL3_W = 560;

addContainer({
  x: COL3_X,
  y: 410,
  width: COL3_W,
  height: 520,
  title: 'TIER 4: DUAL-ENGINE AI SYNTHESIS & LLM ROUTER',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8'
});

addCard({
  x: COL3_X + 25,
  y: 455,
  width: COL3_W - 50,
  height: 125,
  title: 'Primary Cloud LLM: Google Gemini 3.5 Flash Lite',
  lines: [
    '• High-speed legal reasoning via OpenAI-compatible endpoint',
    '• Ultra-fast token latency & 1M token context window',
    '• Native understanding of Arabic, Indic & 20+ languages',
    '• Ephemeral zero-data-retention session security'
  ],
  bgColor: '#fdf2f8',
  strokeColor: '#db2777'
});

addCard({
  x: COL3_X + 25,
  y: 600,
  width: COL3_W - 50,
  height: 125,
  title: 'Secondary Local Engine: Ollama (Qwen 2.5)',
  lines: [
    '• 100% On-Premise / Air-gapped privacy mode',
    '• Zero external data egress for confidential enterprise NDAs',
    '• Local HTTP API at localhost:11434/v1',
    '• Automatic fallback if cloud API quota exceeded'
  ],
  bgColor: '#fdf4ff',
  strokeColor: '#9333ea'
});

addCard({
  x: COL3_X + 25,
  y: 745,
  width: COL3_W - 50,
  height: 165,
  title: 'Deterministic Offline Fallback Synthesizer',
  lines: [
    '• Zero external API key requirement (Works 100% offline)',
    '• Exact keyword & semantic paragraph clustering',
    '• Verbatim citation stitching & direct quote linkage',
    '• Guaranteed 100% uptime under any network outage'
  ],
  bgColor: '#fef2f2',
  strokeColor: '#dc2626'
});

// =========================================================================
// TIER 5: DETERMINISTIC VERIFICATION & SUBSTANTIVE COMPARISON (BOTTOM)
// =========================================================================
addContainer({
  x: LEFT_X,
  y: 970,
  width: CANVAS_WIDTH,
  height: 270,
  title: 'TIER 5: DETERMINISTIC VERIFICATION & SUBSTANTIVE COMPARISON ENGINES',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8'
});

addCard({
  x: LEFT_X + 25,
  y: 1015,
  width: 520,
  height: 205,
  title: 'Zero-Trust Deterministic Quote Verifier',
  lines: [
    '• Programmatic Ground Truth Checking (No LLM self-eval bias)',
    '• Exact Unicode substring search with punctuation normalization',
    '• Sliding-window Levenshtein fuzzy match (90% threshold for OCR)',
    '• Unspaced CJK character offset locator & Arabic RTL alignment',
    '• Binary Output: Verified (Emerald 100%) vs Unverified (Red 0%)',
    '• Computes exact Page Number, Start Offset & End Offset coordinates'
  ],
  bgColor: '#ecfdf5',
  strokeColor: '#059669'
});

addCard({
  x: LEFT_X + 580,
  y: 1015,
  width: 530,
  height: 205,
  title: 'Substantive Clause Diff & Semantic Drift Engine',
  lines: [
    '• Multi-document cross-contract clause alignment',
    '• Clause classification: Added, Removed, Substantively Modified',
    '• Detects subtle shifts (e.g. governing law transfer, uncapped liability)',
    '• Non-standard clause highlighting & risk severity classification',
    '• Programmatic word-level and sentence-level redline generator'
  ],
  bgColor: '#fefce8',
  strokeColor: '#ca8a04'
});

addCard({
  x: LEFT_X + 1145,
  y: 1015,
  width: 550,
  height: 205,
  title: 'Monetary & Legal Exposure Delta Calculator',
  lines: [
    '• Financial liability quantification (e.g. 12-mo fees cap vs unlimited)',
    '• Liquidated damages & delayed delivery penalty comparison',
    '• IP ownership transfer & warranty disclaimer risk audit',
    '• Automated Executive Negotiation Advice & Counter-Proposal generator',
    '• Exportable audit memorandum in Markdown and printable format'
  ],
  bgColor: '#fff1f2',
  strokeColor: '#e11d48'
});

// =========================================================================
// CLEAN ARROWS IN EMPTY GUTTERS — ZERO INTERSECTIONS
// =========================================================================

// 1. Upload UI straight down to Multipart Ingestion (in top vertical gutter)
addCleanArrow({
  points: [
    [LEFT_X + 220, 340],
    [LEFT_X + 220, 455]
  ],
  label: 'File Stream',
  labelX: LEFT_X + 175,
  labelY: 410,
  labelW: 90
});

// 2. Chat UI straight down to Autonomous Coordinator (in top vertical gutter)
addCleanArrow({
  points: [
    [LEFT_X + 645, 340],
    [LEFT_X + 645, 455]
  ],
  label: 'User Query',
  labelX: LEFT_X + 600,
  labelY: 410,
  labelW: 90
});

// 3. Ingestion parsing down to SQLite DB (inside column 1)
addCleanArrow({
  points: [
    [COL1_X + 240, 760],
    [COL1_X + 240, 785]
  ]
});

// 4. Ingestion SQLite across to Agent Research Loop (through 70px gutter between Col 1 & Col 2)
addCleanArrow({
  points: [
    [COL1_X + COL1_W, 685],
    [COL2_X, 685]
  ],
  label: 'Token Index',
  labelX: COL1_X + COL1_W + 35 - 40,
  labelY: 660,
  labelW: 80
});

// 5. Agent Research Loop across to Primary Gemini LLM (through 70px gutter between Col 2 & Col 3)
addCleanArrow({
  points: [
    [COL2_X + COL2_W, 515],
    [COL3_X, 515]
  ],
  label: 'Gemini 3.5 API',
  labelX: COL2_X + COL2_W + 35 - 45,
  labelY: 490,
  labelW: 90
});

// 6. Agent Research Loop across to Local Ollama (through 70px gutter between Col 2 & Col 3)
addCleanArrow({
  points: [
    [COL2_X + COL2_W, 660],
    [COL3_X, 660]
  ],
  label: 'Local Ollama',
  labelX: COL2_X + COL2_W + 35 - 42,
  labelY: 635,
  labelW: 85
});

// 7. Agent Research Loop across to Offline Synthesizer (through 70px gutter between Col 2 & Col 3)
addCleanArrow({
  points: [
    [COL2_X + COL2_W, 825],
    [COL3_X, 825]
  ],
  label: 'Offline Engine',
  labelX: COL2_X + COL2_W + 35 - 45,
  labelY: 800,
  labelW: 90
});

// 8. Raw Ingestion Ground Truth down to Zero-Trust Quote Verifier (through middle horizontal gutter)
addCleanArrow({
  points: [
    [COL1_X + 240, 930],
    [COL1_X + 240, 1015]
  ],
  label: 'Raw Ground-Truth Text',
  labelX: COL1_X + 165,
  labelY: 955,
  labelW: 150
});

// 9. Agent Clauses down to Substantive Diff Engine (through middle horizontal gutter)
addCleanArrow({
  points: [
    [COL2_X + 270, 930],
    [COL2_X + 270, 1015]
  ],
  label: 'Extracted Clauses',
  labelX: COL2_X + 200,
  labelY: 955,
  labelW: 140
});

// 10. AI Risk Analysis down to Exposure Delta Calculator (through middle horizontal gutter)
addCleanArrow({
  points: [
    [COL3_X + 285, 930],
    [COL3_X + 285, 1015]
  ],
  label: 'Synthesized Risk Analysis',
  labelX: COL3_X + 195,
  labelY: 955,
  labelW: 170
});

// 11. Feedback: Verifier coordinates back up to Document Viewer
addCleanArrow({
  points: [
    [COL1_X + COL1_W + 35, 1015],
    [COL1_X + COL1_W + 35, 370],
    [LEFT_X + 1072, 370],
    [LEFT_X + 1072, 340]
  ],
  label: 'Verified Quotes & Offsets',
  labelX: LEFT_X + 780,
  labelY: 360,
  labelW: 160
});

// 12. Feedback: Substantive Diff back up to Diff & Heatmap UI
addCleanArrow({
  points: [
    [LEFT_X + CANVAS_WIDTH + 30, 1015],
    [LEFT_X + CANVAS_WIDTH + 30, 370],
    [LEFT_X + 1497, 370],
    [LEFT_X + 1497, 340]
  ],
  label: 'Redline Diffs & Exposure',
  labelX: LEFT_X + 1550,
  labelY: 360,
  labelW: 160
});

// Save Excalidraw document payload
const excalidrawDocument = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: '#f8fafc'
  },
  files: {}
};

const rootPath = path.join(__dirname, '..', 'veritas_architecture_system_flow.excalidraw');
const publicPath = path.join(__dirname, '..', 'public', 'veritas_architecture_system_flow.excalidraw');

fs.writeFileSync(rootPath, JSON.stringify(excalidrawDocument, null, 2), 'utf-8');
fs.writeFileSync(publicPath, JSON.stringify(excalidrawDocument, null, 2), 'utf-8');

console.log(`Excalidraw diagram updated at: ${rootPath}`);
console.log(`Public diagram updated at: ${publicPath}`);
console.log(`Total elements: ${elements.length}`);
