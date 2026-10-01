const fs = require('fs');
const path = require('path');

let idCounter = 1;
function genId(prefix = 'elem') {
  return `${prefix}_${idCounter++}_${Math.random().toString(36).substring(2, 7)}`;
}

const elements = [];

function addBox({
  x, y, width, height, title, subtitle = '',
  bgColor = '#ffffff', strokeColor = '#1e293b',
  strokeWidth = 2, strokeStyle = 'solid', roughness = 0,
  roundness = { type: 3 }, fontSize = 16, titleColor = '#0f172a', subtitleColor = '#475569'
}) {
  const boxId = genId('box');
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

  // Title text
  const textId = genId('text');
  elements.push({
    id: textId,
    type: 'text',
    x: x + 16,
    y: y + 14,
    width: width - 32,
    height: fontSize + 6,
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
    fontSize,
    fontFamily: 2, // Helvetica / Sans-serif
    textAlign: 'center',
    verticalAlign: 'top',
    baseline: fontSize,
    containerId: null,
    originalText: title,
    lineHeight: 1.25
  });

  if (subtitle) {
    const subTextId = genId('sub');
    elements.push({
      id: subTextId,
      type: 'text',
      x: x + 14,
      y: y + 14 + fontSize + 8,
      width: width - 28,
      height: height - (fontSize + 24),
      angle: 0,
      strokeColor: subtitleColor,
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
      text: subtitle,
      fontSize: 12,
      fontFamily: 2,
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: 12,
      containerId: null,
      originalText: subtitle,
      lineHeight: 1.35
    });
  }

  return { id: boxId, x, y, width, height };
}

function addArrow({
  startX, startY, endX, endY,
  strokeColor = '#475569', strokeWidth = 2,
  strokeStyle = 'solid', label = ''
}) {
  const dx = endX - startX;
  const dy = endY - startY;
  const arrowId = genId('arrow');

  elements.push({
    id: arrowId,
    type: 'arrow',
    x: startX,
    y: startY,
    width: Math.abs(dx),
    height: Math.abs(dy),
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
    points: [
      [0, 0],
      [dx, dy]
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow'
  });

  if (label) {
    elements.push({
      id: genId('arrow_label'),
      type: 'text',
      x: startX + dx / 2 - 40,
      y: startY + dy / 2 - 12,
      width: 100,
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
      fontFamily: 2,
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 11,
      containerId: null,
      originalText: label,
      lineHeight: 1.2
    });
  }
}

// ---------------- CANVAS LAYOUT CONSTRUCTION ----------------

// Canvas Dimensions & Sections
// 1. Header / Banner
addBox({
  x: 50,
  y: 40,
  width: 1480,
  height: 90,
  title: 'VERITAS LEGAL AI — SYSTEM ARCHITECTURE & DATA FLOW PIPELINE',
  subtitle: 'Full End-to-End Enterprise Architecture: Multilingual Agentic Ingestion, Zero-Trust Quote Verification, Dual-Engine LLM Fallback & Substantive Diff',
  bgColor: '#0f172a',
  strokeColor: '#38bdf8',
  strokeWidth: 2,
  titleColor: '#38bdf8',
  subtitleColor: '#cbd5e1',
  fontSize: 22
});

// SECTION 1: CLIENT PRESENTATION TIER (TOP)
addBox({
  x: 50,
  y: 160,
  width: 1480,
  height: 170,
  title: 'TIER 1: PRESENTATION & INTERACTION LAYER (Next.js 14 App Router + TailwindCSS)',
  subtitle: '',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8',
  strokeWidth: 2,
  titleColor: '#0f172a',
  fontSize: 16
});

const ui1 = addBox({
  x: 75,
  y: 205,
  width: 320,
  height: 105,
  title: 'Streaming Chat & Interrupt Controller',
  subtitle: '• Real-time SSE token stream\n• User abort/interrupt controller\n• Agent Research loop progress bar\n• Multilingual query auto-mirroring',
  bgColor: '#e0f2fe',
  strokeColor: '#0284c7',
  fontSize: 14
});

const ui2 = addBox({
  x: 430,
  y: 205,
  width: 320,
  height: 105,
  title: 'Interactive Document Viewer',
  subtitle: '• PDF / DOCX page-by-page viewer\n• Dynamic pulsing citation highlight\n• Exact coordinate & character scroll\n• Zero-flicker client memoization',
  bgColor: '#e0f2fe',
  strokeColor: '#0284c7',
  fontSize: 14
});

const ui3 = addBox({
  x: 785,
  y: 205,
  width: 340,
  height: 105,
  title: 'Substantive Diff & Exposure Heatmap',
  subtitle: '• Clause-by-clause version alignment\n• Monetary & liability risk delta (₹/$)\n• Unfavorable deviation flags\n• Side-by-side executive view',
  bgColor: '#fef3c7',
  strokeColor: '#d97706',
  fontSize: 14
});

const ui4 = addBox({
  x: 1160,
  y: 205,
  width: 345,
  height: 105,
  title: 'Universal Multilingual Input Hub',
  subtitle: '• English, Gujarati, Hindi, Arabic\n• CJK & European contract support\n• Legacy DTP font transliteration\n• Document upload drag-and-drop',
  bgColor: '#dcfce7',
  strokeColor: '#16a34a',
  fontSize: 14
});

// SECTION 2: INGESTION & PROCESSING ENGINE (MIDDLE-LEFT)
addBox({
  x: 50,
  y: 370,
  width: 440,
  height: 380,
  title: 'TIER 2: INGESTION & STRUCTURAL PARSING',
  subtitle: '',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8',
  strokeWidth: 2,
  titleColor: '#0f172a',
  fontSize: 16
});

const ing1 = addBox({
  x: 70,
  y: 415,
  width: 400,
  height: 85,
  title: 'Multipart File Ingestion & OCR Guard',
  subtitle: '• Formidable / Multer multi-doc streaming\n• Scanned PDF Zero-Text Guard (Unicode [\\p{L}\\p{N}])\n• Rejects image-only scans with actionable error',
  bgColor: '#ffffff',
  strokeColor: '#64748b',
  fontSize: 13
});

const ing2 = addBox({
  x: 70,
  y: 515,
  width: 400,
  height: 95,
  title: 'Document Parser & Glyph Deconstruction',
  subtitle: '• pdf-parse & mammoth for DOCX / PDF\n• Page-level coordinate & text mapping\n• Section tagging (Preamble, Clauses, Exhibits)\n• Legacy DTP Gujarati/Hindi alias expander',
  bgColor: '#ffffff',
  strokeColor: '#64748b',
  fontSize: 13
});

const ing3 = addBox({
  x: 70,
  y: 625,
  width: 400,
  height: 100,
  title: 'SQLite Contract & Clause Metadata DB',
  subtitle: '• contracts, contract_clauses, qna_sessions\n• Full-text token index & cached embeddings\n• Foreign key constraints & audit history\n• High-concurrency WAL mode',
  bgColor: '#f1f5f9',
  strokeColor: '#475569',
  fontSize: 13
});

// SECTION 3: AGENTIC RESEARCH LOOP & TOOL REGISTRY (MIDDLE-CENTER)
addBox({
  x: 530,
  y: 370,
  width: 490,
  height: 380,
  title: 'TIER 3: AGENTIC RE-ACT RESEARCH LOOP (Option 2)',
  subtitle: '',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8',
  strokeWidth: 2,
  titleColor: '#0f172a',
  fontSize: 16
});

const agent1 = addBox({
  x: 550,
  y: 415,
  width: 450,
  height: 80,
  title: 'Autonomous Research Coordinator',
  subtitle: '• Multi-hop query plan deconstruction\n• Iteration budget controller (1 to 5 rounds)\n• Early termination on high quote confidence\n• Structured reasoning trajectory recorder',
  bgColor: '#eff6ff',
  strokeColor: '#2563eb',
  fontSize: 13
});

const toolBox = addBox({
  x: 550,
  y: 510,
  width: 450,
  height: 135,
  title: 'Dynamic Tool Execution Registry',
  subtitle: '1. toolSearchDocument(query, docId):\n   Broad index scan + bilingual alias match (e.g. Page 2 & 26)\n2. toolReadDocumentSection(docId, pageNumber):\n   Deep context extraction around target clauses\n3. toolVerifyCitation(docId, quote):\n   Instant programmatic pre-check for zero hallucinations',
  bgColor: '#ffffff',
  strokeColor: '#2563eb',
  fontSize: 12
});

const agent3 = addBox({
  x: 550,
  y: 660,
  width: 450,
  height: 70,
  title: 'Evidence Assembly & Context Synthesizer',
  subtitle: '• Deduplicates retrieved snippets across pages\n• Constructs strict zero-hallucination prompt envelope\n• Enforces language mirroring (Gujarati/Arabic/Hindi)',
  bgColor: '#eff6ff',
  strokeColor: '#2563eb',
  fontSize: 12
});

// SECTION 4: DUAL-ENGINE AI SYNTHESIS & FALLBACK (MIDDLE-RIGHT)
addBox({
  x: 1060,
  y: 370,
  width: 470,
  height: 380,
  title: 'TIER 4: DUAL-ENGINE AI SYNTHESIS & LLM ROUTER',
  subtitle: '',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8',
  strokeWidth: 2,
  titleColor: '#0f172a',
  fontSize: 16
});

const ai1 = addBox({
  x: 1080,
  y: 415,
  width: 430,
  height: 85,
  title: 'Primary Cloud LLM: Google Gemini 3.5 Flash Lite',
  subtitle: '• High-speed legal reasoning & tool calls\n• OpenAI-compatible REST API integration\n• Secure zero-retention ephemeral session\n• Native 1M token multilingual window',
  bgColor: '#fdf2f8',
  strokeColor: '#db2777',
  fontSize: 13
});

const ai2 = addBox({
  x: 1080,
  y: 515,
  width: 430,
  height: 85,
  title: 'Secondary Local Engine: Ollama (Qwen 2.5)',
  subtitle: '• 100% On-Premise / Air-Gapped execution\n• Zero data egress for ultra-confidential NDAs\n• Fast local inference at localhost:11434\n• Automatic fallback if cloud API rate-limited',
  bgColor: '#fdf4ff',
  strokeColor: '#9333ea',
  fontSize: 13
});

const ai3 = addBox({
  x: 1080,
  y: 615,
  width: 430,
  height: 110,
  title: 'Deterministic Offline Fallback Synthesizer',
  subtitle: '• Zero API key requirement (Runs anywhere offline)\n• Exact keyword & semantic paragraph clustering\n• Verbatim citation stitching & direct quote linkage\n• Guarantees 100% uptime under any connectivity outage',
  bgColor: '#fef2f2',
  strokeColor: '#dc2626',
  fontSize: 12
});

// SECTION 5: ZERO-TRUST VERIFICATION & SUBSTANTIVE COMPARISON (BOTTOM)
addBox({
  x: 50,
  y: 790,
  width: 1480,
  height: 240,
  title: 'TIER 5: DETERMINISTIC VERIFICATION & SUBSTANTIVE COMPARISON ENGINES',
  subtitle: '',
  bgColor: '#f8fafc',
  strokeColor: '#94a3b8',
  strokeWidth: 2,
  titleColor: '#0f172a',
  fontSize: 16
});

const verif1 = addBox({
  x: 75,
  y: 835,
  width: 420,
  height: 170,
  title: 'Zero-Trust Deterministic Quote Verifier',
  subtitle: '• Programmatic Ground Truth Checking (No LLM self-eval)\n• Exact Normalized Unicode Substring Search\n• Fuzzy Levenshtein Sliding Window (90% threshold for OCR drift)\n• CJK Unspaced Character Substring & Arabic RTL normalization\n• Binary Classification: Verified (Green) vs Unverified (Red)\n• Outputs exact Page Number and Character Start/End Offsets',
  bgColor: '#ecfdf5',
  strokeColor: '#059669',
  fontSize: 13
});

const comp1 = addBox({
  x: 535,
  y: 835,
  width: 460,
  height: 170,
  title: 'Substantive Clause Diff & Deviation Engine',
  subtitle: '• Multi-document cross-contract analysis\n• Structural alignment of standard & customized clauses\n• Redline classification: Added, Removed, Substantively Modified\n• Semantic drift detection (e.g. governing law transfer, indemnity cap removal)\n• Non-standard clause highlighting & risk severity ranking',
  bgColor: '#fefce8',
  strokeColor: '#ca8a04',
  fontSize: 13
});

const risk1 = addBox({
  x: 1035,
  y: 835,
  width: 470,
  height: 170,
  title: 'Monetary & Legal Exposure Delta Calculator',
  subtitle: '• Financial liability quantification (e.g. 12-month fees cap vs unlimited)\n• Liquidated damages & delayed delivery penalty analysis\n• IP ownership transfer & warranty disclaimer comparison\n• Automatic Executive Risk Summary & Negotiation Guidance\n• Exportable legal audit memorandum in Markdown & PDF',
  bgColor: '#fff1f2',
  strokeColor: '#e11d48',
  fontSize: 13
});

// CONNECTING FLOW ARROWS
// Top UI down to Ingestion & Agents
addArrow({ startX: 235, startY: 310, endX: 235, endY: 415, label: 'Upload' });
addArrow({ startX: 270, startY: 725, endX: 270, endY: 835, label: 'Raw Text' });
addArrow({ startX: 470, startY: 560, endX: 550, endY: 560, label: 'Doc Chunks' });

// Agent to AI
addArrow({ startX: 1000, startY: 450, endX: 1080, endY: 450, label: 'Tool Prompt' });
addArrow({ startX: 1000, startY: 550, endX: 1080, endY: 550, label: 'Local Fallback' });
addArrow({ startX: 1000, startY: 670, endX: 1080, endY: 670, label: 'Offline Fallback' });

// AI outputs down to Verification & Diff
addArrow({ startX: 1295, startY: 725, endX: 1295, endY: 835, label: 'Risk Analysis' });
addArrow({ startX: 775, startY: 730, endX: 775, endY: 835, label: 'Synthesized Quotes' });
addArrow({ startX: 285, startY: 835, endX: 590, endY: 310, label: 'Verified Quote Offset & Coordinates' });

// Produce Excalidraw document payload
const excalidrawDocument = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: '#f1f5f9'
  },
  files: {}
};

const outputPath = path.join(__dirname, '..', 'veritas_architecture_system_flow.excalidraw');
fs.writeFileSync(outputPath, JSON.stringify(excalidrawDocument, null, 2), 'utf-8');
console.log(`Excalidraw diagram generated successfully at: ${outputPath}`);
console.log(`Total elements: ${elements.length}`);
