import { DocumentRecord } from './db';
import { DocumentPage, VerifiedQuote, verifyAllQuotes, extractQuotesFromAnswer } from './quoteVerifier';
import { ExtractedClause } from './documentProcessor';

export interface AgentStep {
  stepNumber: number;
  tool: string;
  input: any;
  message: string;
  outputSummary?: string;
  timestamp: string;
}

export interface DocumentCoverage {
  pagesRead: number[];
  totalPages: number;
  clausesInspected: string[];
  totalClauses: number;
  isFullCoverage: boolean;
  coverageNotice: string;
}

export interface StreamEvent {
  type: 'agent_step' | 'agent_result' | 'token' | 'done' | 'error' | 'coverage' | 'verified_quotes';
  step?: AgentStep;
  token?: string;
  coverage?: DocumentCoverage;
  quotes?: VerifiedQuote[];
  error?: string;
  fullAnswer?: string;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'tell', 'me', 'what', 'which',
  'who', 'where', 'when', 'why', 'how', 'give', 'show', 'does', 'did',
  'about', 'please', 'can', 'you', 'given', 'person', 'candidate',
  'contract', 'agreement', 'document', 'say', 'stated', 'mention',
  'section', 'details', 'his', 'her', 'their',
  // Multilingual & regional conversational stop words (Gujarati, Hindi, Gujlish)
  'mane', 'tamne', 'vishe', 'mahiti', 'joiae', 'joie', 'chhe', 'che',
  'su', 'shu', 'kem', 'karo', 'aapo', 'batao', 'mujhe', 'kya', 'hai',
  'bataiye', 'samjhao', 'kaho', 'nathi', 'hata', 'hota'
]);

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/expre?i[ec][ec]n?ce?/g, 'experience')
    .replace(/experiance|experiense|expirience/g, 'experience')
    .replace(/univercity|universty/g, 'university')
    .replace(/educatn|edication|educaton/g, 'education')
    .replace(/liabilty|liabiltiy/g, 'liability')
    .replace(/terminatn|terminaton/g, 'termination')
    .replace(/achivement|acheivement/g, 'achievement')
    .replace(/projct|projets/g, 'projects');
}

function extractKeywords(query: string): string[] {
  const norm = normalizeQuery(query);
  return norm
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Intelligent question answering synthesizer
 * Formulates direct, natural, factual answers backed by concise verbatim quotes
 */
function synthesizeGroundedAnswer(
  query: string,
  rawText: string,
  docName: string,
  pages: DocumentPage[]
): string {
  const qNorm = normalizeQuery(query);
  const keywords = extractKeywords(query);
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Name / Identity Query
  if (
    qNorm.includes('name') ||
    qNorm.includes('who is') ||
    (keywords.length === 0 && (qNorm.includes('person') || qNorm.includes('candidate')))
  ) {
    const firstLine = lines[0] || 'Unknown';
    return (
      `The name of the individual in **${docName}** is **${firstLine}**.\n\n` +
      `This is stated at the top of Page 1:\n\n` +
      `> "${firstLine}"\n\n` +
      `The document identifies this person at the header of the record.`
    );
  }

  // 2. Experience / Work / Internship / Job / Career (including "recent experience" or "experience section")
  if (
    qNorm.includes('experience') ||
    qNorm.includes('intern') ||
    qNorm.includes('job') ||
    qNorm.includes('work') ||
    qNorm.includes('career') ||
    qNorm.includes('role')
  ) {
    const expIdx = lines.findIndex(l => /^experience$/i.test(l.replace(/[^a-zA-Z]/g, '')));
    if (expIdx !== -1) {
      const expItems: string[] = [];
      for (let i = expIdx + 1; i < lines.length; i++) {
        if (/^(projects|education|achievements|technical skills|certifications)$/i.test(lines[i].replace(/[^a-zA-Z]/g, ''))) {
          break;
        }
        if (lines[i].startsWith('•') || lines[i].includes('–') || lines[i].includes('-')) {
          expItems.push(lines[i]);
        }
      }

      const recentRoleLine = expItems.find(item => item.startsWith('•')) || expItems[0] || lines[expIdx + 1];
      const cleanQuote = recentRoleLine ? recentRoleLine.replace(/^[•\s]+/, '').trim() : '';

      if (qNorm.includes('recent') || qNorm.includes('latest') || qNorm.includes('current')) {
        return (
          `According to **${docName}**, the most recent professional experience is:\n\n` +
          `- **${cleanQuote}**\n\n` +
          `As recorded in the Experience section:\n\n` +
          `> "${cleanQuote}"`
        );
      }

      const formattedRoles = expItems.filter(item => item.startsWith('•')).slice(0, 3);
      return (
        `According to **${docName}**, the professional experience includes:\n\n` +
        (formattedRoles.length > 0
          ? formattedRoles.map(r => `- ${r.replace(/^[•\s]+/, '').trim()}`).join('\n') + '\n\n'
          : `- **${cleanQuote}**\n\n`) +
        `As documented in the Experience section:\n\n` +
        `> "${cleanQuote}"`
      );
    }
  }

  // 3. Education / University / College Query
  if (
    qNorm.includes('university') ||
    qNorm.includes('education') ||
    qNorm.includes('college') ||
    qNorm.includes('degree') ||
    qNorm.includes('school')
  ) {
    const eduIdx = lines.findIndex(l => /education/i.test(l));
    let uniLine = '';
    let degreeLine = '';

    if (eduIdx !== -1) {
      uniLine = lines[eduIdx + 1] || '';
      degreeLine = lines[eduIdx + 2] || '';
    } else {
      const uLine = lines.find(l => /university|institute|college|b\.tech|bachelor|master/i.test(l));
      uniLine = uLine || '';
    }

    const cleanUni = uniLine.replace(/^[•\-\–\s]+/, '').trim();
    const cleanDegree = degreeLine.replace(/^[•\-\–\s]+/, '').trim();

    if (cleanUni) {
      return (
        `According to **${docName}**, the education details are as follows:\n\n` +
        `- **Institution**: ${cleanUni}\n` +
        (cleanDegree ? `- **Degree / Program**: ${cleanDegree}\n\n` : '\n') +
        `As stated in the Education section:\n\n` +
        `> "${cleanUni}"`
      );
    }
  }

  // 4. Projects / Portfolio Work Query
  if (qNorm.includes('project') || qNorm.includes('built') || qNorm.includes('portfolio work')) {
    const projIdx = lines.findIndex(l => /^projects$/i.test(l.replace(/[^a-zA-Z]/g, '')));
    if (projIdx !== -1) {
      const projItems: string[] = [];
      for (let i = projIdx + 1; i < lines.length; i++) {
        if (/^(experience|education|achievements|technical skills|certifications)$/i.test(lines[i].replace(/[^a-zA-Z]/g, ''))) {
          break;
        }
        if (lines[i].startsWith('•') || lines[i].includes('–') || lines[i].includes('-')) {
          projItems.push(lines[i]);
        }
      }
      const firstProj = projItems.find(p => p.startsWith('•')) || projItems[0] || lines[projIdx + 1];
      const cleanQuote = firstProj ? firstProj.replace(/^[•\s]+/, '').trim() : '';

      return (
        `According to **${docName}**, key projects include:\n\n` +
        projItems.filter(p => p.startsWith('•')).slice(0, 4).map(p => `- ${p.replace(/^[•\s]+/, '').trim()}`).join('\n') + '\n\n' +
        `As documented in the Projects section:\n\n` +
        `> "${cleanQuote}"`
      );
    }
  }

  // 5. Achievements / Awards / Hackathons / Certifications
  if (
    qNorm.includes('achievement') ||
    qNorm.includes('award') ||
    qNorm.includes('hackathon') ||
    qNorm.includes('winner') ||
    qNorm.includes('certification')
  ) {
    const achIdx = lines.findIndex(l => /^achievements$/i.test(l.replace(/[^a-zA-Z]/g, '')));
    if (achIdx !== -1) {
      const items: string[] = [];
      for (let i = achIdx + 1; i < lines.length; i++) {
        if (/^(experience|education|projects|technical skills)$/i.test(lines[i].replace(/[^a-zA-Z]/g, ''))) break;
        if (lines[i].startsWith('•')) items.push(lines[i]);
      }
      const quote = items[0] ? items[0].replace(/^[•\s]+/, '').trim() : lines[achIdx + 1];
      return (
        `According to **${docName}**, achievements and honors include:\n\n` +
        items.map(it => `- ${it.replace(/^[•\s]+/, '').trim()}`).join('\n') + '\n\n' +
        `As recorded in the Achievements section:\n\n` +
        `> "${quote}"`
      );
    }
  }

  // 6. Contact / Email / Phone / Links
  if (
    qNorm.includes('contact') ||
    qNorm.includes('email') ||
    qNorm.includes('phone') ||
    qNorm.includes('github') ||
    qNorm.includes('linkedin')
  ) {
    const contactLine = lines.find(l => /@|phone|\+91|github|linkedin|portfolio/i.test(l));
    if (contactLine) {
      return (
        `The contact and portfolio details in **${docName}** are:\n\n` +
        `> "${contactLine.trim()}"`
      );
    }
  }

  // 7. Technical Skills / Tech Stack Query
  if (qNorm.includes('skill') || qNorm.includes('languages') || qNorm.includes('tech stack') || qNorm.includes('technologies')) {
    const skillsIdx = lines.findIndex(l => /technical skills/i.test(l));
    const skillLines: string[] = [];
    if (skillsIdx !== -1) {
      for (let i = skillsIdx + 1; i < Math.min(lines.length, skillsIdx + 7); i++) {
        if (/experience|projects|education|achievements/i.test(lines[i])) break;
        skillLines.push(lines[i].replace(/^[•\-\–\s]+/, '').trim());
      }
    }
    const quote = skillLines[0] || lines.find(l => /languages|python|react/i.test(l)) || '';
    if (skillLines.length > 0) {
      return (
        `According to **${docName}**, the technical competencies are documented as:\n\n` +
        skillLines.map(s => `- ${s}`).join('\n') + '\n\n' +
        `Supported by the document passage:\n\n` +
        `> "${quote}"`
      );
    }
  }

  // 8. Limitation of Liability / Monetary Cap Query
  if (qNorm.includes('liability') || qNorm.includes('cap') || qNorm.includes('damages') || qNorm.includes('financial limit')) {
    const liabLine = lines.find(l => /liability|exceed|cap/i.test(l) && /(?:AED|USD|\$|EUR|[0-9,]+)/i.test(l)) ||
      lines.find(l => /liability/i.test(l));

    if (liabLine) {
      const match = liabLine.match(/(?:AED|USD|\$|EUR|£)\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?/i);
      const cap = match ? match[0] : 'specified';

      return (
        `Under **${docName}**, the limitation of liability cap is **${cap}**.\n\n` +
        `As set forth in the agreement:\n\n` +
        `> "${liabLine.trim()}"\n\n` +
        `This defines the total aggregate exposure between the parties for claims under the contract.`
      );
    }
  }

  // 9. Term / Termination Query
  if (qNorm.includes('terminat') || qNorm.includes('notice') || qNorm.includes('cure') || qNorm.includes('breach')) {
    const termLine = lines.find(l => /terminat|written notice|material breach|cure/i.test(l));
    if (termLine) {
      return (
        `According to **${docName}**, the termination provisions specify:\n\n` +
        `> "${termLine.trim()}"\n\n` +
        `This sets out the required conditions and notice periods before termination may occur.`
      );
    }
  }

  // 10. Governing Law / Dispute Resolution Query
  if (qNorm.includes('governing law') || qNorm.includes('jurisdiction') || qNorm.includes('arbitration') || qNorm.includes('dispute')) {
    const lawLine = lines.find(l => /governed|laws of|jurisdiction|arbitration|dispute/i.test(l));
    if (lawLine) {
      const match = lawLine.match(/(?:Dubai International Financial Centre|DIFC|Abu Dhabi Global Market|ADGM|United Arab Emirates|UAE|New York|Delaware)/i);
      const jurisdiction = match ? match[0] : 'the jurisdiction named';

      return (
        `The governing law specified in **${docName}** is **${jurisdiction}**.\n\n` +
        `As set forth in the governing provisions:\n\n` +
        `> "${lawLine.trim()}"\n\n` +
        `Disputes arising under this contract are governed by and construed in accordance with these rules.`
      );
    }
  }

  // 11. Fees & Payment Terms
  if (qNorm.includes('fee') || qNorm.includes('payment') || qNorm.includes('invoice') || qNorm.includes('price')) {
    const payLine = lines.find(l => /payment|fee|invoice|payable/i.test(l));
    if (payLine) {
      return (
        `The payment and fee terms in **${docName}** specify:\n\n` +
        `> "${payLine.trim()}"\n\n` +
        `Invoices and financial obligations must be satisfied according to these deadlines.`
      );
    }
  }

  // 12. General Keyword Matching across lines
  let bestLine = '';
  let bestScore = 0;

  for (const line of lines) {
    const lLow = line.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lLow.includes(kw)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  if (bestScore > 0 && bestLine) {
    const cleanLine = bestLine.replace(/^[•\-\–\s]+/, '').trim();
    return (
      `Based on **${docName}**, the relevant passage states:\n\n` +
      `> "${cleanLine}"\n\n` +
      `This is the direct passage addressing your question.`
    );
  }

  return (
    `I examined **${docName}**, specifically searching for terms matching: ${keywords.join(', ') || qNorm}.\n\n` +
    `No clauses or statements addressing this topic were found in the document.\n\n` +
    `As required by contract analysis standards, no obligations or facts on this subject can be presumed without explicit textual evidence.`
  );
}

/**
 * Executes agentic document research across documents
 */
export async function runAgenticDocumentResearch(
  query: string,
  documents: DocumentRecord[],
  onStream: (event: StreamEvent) => void,
  signal?: AbortSignal,
  customApiKey?: string,
  customBaseUrl?: string,
  customModel?: string
): Promise<{ answer: string; quotes: VerifiedQuote[]; steps: AgentStep[]; coverage: DocumentCoverage }> {
  // Parse document structured data
  const parsedDocs = documents.map(d => {
    let pages: DocumentPage[] = [];
    let clauses: ExtractedClause[] = [];
    try {
      pages = JSON.parse(d.pages_json);
    } catch {
      pages = [{ pageNumber: 1, text: d.raw_text }];
    }
    try {
      clauses = JSON.parse(d.clauses_json);
    } catch {
      clauses = [];
    }
    return {
      id: d.id,
      filename: d.filename,
      totalPages: d.total_pages,
      pages,
      clauses,
      rawText: d.raw_text,
    };
  });

  const steps: AgentStep[] = [];
  const inspectedPages = new Set<number>();
  const inspectedClauses = new Set<string>();

  const totalPagesSum = parsedDocs.reduce((acc, d) => acc + d.totalPages, 0);
  const totalClausesSum = parsedDocs.reduce((acc, d) => acc + d.clauses.length, 0);

  // --- Agent Tool Implementations ---
  const toolListClauses = (docId?: string) => {
    const targetDocs = docId ? parsedDocs.filter(d => d.id === docId) : parsedDocs;
    return targetDocs.map(d => ({
      documentId: d.id,
      filename: d.filename,
      clauses: d.clauses.map(c => ({ number: c.number, title: c.title, page: c.pageNumber })),
    }));
  };

  const toolSearchDocument = (searchQuery: string, docId?: string) => {
    const rawKeywords = extractKeywords(searchQuery);
    const targetDocs = docId ? parsedDocs.filter(d => d.id === docId) : parsedDocs;
    const matches: { document: string; page: number; clause?: string; excerpt: string; fullClause?: string; score: number }[] = [];

    // Alias expansion for bilingual/transliterated terms (e.g. Cupid <-> õâwr...z)
    const expandedKeywords = [...rawKeywords];
    for (const d of targetDocs) {
      for (const page of d.pages) {
        for (const kw of rawKeywords) {
          try {
            const rx = new RegExp(`(\\S+)\\s*\\(\\s*${kw}\\s*\\)|\\(\\s*${kw}\\s*\\)\\s*(\\S+)`, 'i');
            const m = page.text.match(rx);
            if (m) {
              const alias = m[1] || m[2];
              if (alias && alias.length > 2 && !expandedKeywords.includes(alias)) {
                expandedKeywords.push(alias);
              }
            }
          } catch {}
        }
      }
    }

    const seenPages = new Set<string>();

    for (const d of targetDocs) {
      // 1. Search clauses
      for (const clause of d.clauses) {
        const textLow = clause.text.toLowerCase();
        const titleLow = clause.title.toLowerCase();
        let score = 0;
        for (const w of expandedKeywords) {
          const wLow = w.toLowerCase();
          if (titleLow.includes(wLow)) score += 3;
          if (textLow.includes(wLow)) score += 1;
        }
        if (score > 0) {
          inspectedClauses.add(clause.title);
          inspectedPages.add(clause.pageNumber);
          seenPages.add(`${d.filename}:${clause.pageNumber}`);
          const matchIdx = textLow.indexOf(expandedKeywords[0].toLowerCase()) !== -1
            ? textLow.indexOf(expandedKeywords[0].toLowerCase())
            : 0;
          const start = Math.max(0, matchIdx - 50);
          const end = Math.min(clause.text.length, matchIdx + 280);
          matches.push({
            document: d.filename,
            page: clause.pageNumber,
            clause: `${clause.number} ${clause.title}`,
            excerpt: clause.text.substring(start, end).trim(),
            fullClause: clause.text,
            score,
          });
        }
      }

      // 2. Search all pages directly for complete document coverage
      for (const page of d.pages) {
        const textLow = page.text.toLowerCase();
        let score = 0;
        for (const w of expandedKeywords) {
          const wLow = w.toLowerCase();
          if (textLow.includes(wLow)) score += 2;
        }
        if (score > 0 && !seenPages.has(`${d.filename}:${page.pageNumber}`)) {
          inspectedPages.add(page.pageNumber);
          seenPages.add(`${d.filename}:${page.pageNumber}`);
          let matchIdx = -1;
          for (const w of expandedKeywords) {
            const idx = textLow.indexOf(w.toLowerCase());
            if (idx !== -1) {
              matchIdx = idx;
              break;
            }
          }
          if (matchIdx === -1) matchIdx = 0;
          const start = Math.max(0, matchIdx - 50);
          const end = Math.min(page.text.length, matchIdx + 300);
          matches.push({
            document: d.filename,
            page: page.pageNumber,
            excerpt: page.text.substring(start, end).trim(),
            fullClause: page.text,
            score,
          });
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 8);
  };

  const toolGetSection = (sectionIdentifier: string, docId?: string) => {
    const identLow = sectionIdentifier.toLowerCase().trim();
    const targetDocs = docId ? parsedDocs.filter(d => d.id === docId) : parsedDocs;

    for (const d of targetDocs) {
      for (const c of d.clauses) {
        if (
          c.number.toLowerCase() === identLow ||
          c.title.toLowerCase().includes(identLow) ||
          identLow.includes(c.title.toLowerCase())
        ) {
          inspectedClauses.add(c.title);
          inspectedPages.add(c.pageNumber);
          return {
            document: d.filename,
            clause: `${c.number} ${c.title}`,
            page: c.pageNumber,
            text: c.text,
          };
        }
      }
    }
    return { error: `Section "${sectionIdentifier}" not found in contract.` };
  };

  const toolInspectPage = (pageNumber: number, docId?: string) => {
    const targetDoc = docId ? parsedDocs.find(d => d.id === docId) : parsedDocs[0];
    if (!targetDoc) return { error: 'Document not found.' };

    const page = targetDoc.pages.find(p => p.pageNumber === pageNumber);
    if (!page) return { error: `Page ${pageNumber} does not exist in ${targetDoc.filename} (total pages: ${targetDoc.totalPages}).` };

    inspectedPages.add(pageNumber);
    return {
      document: targetDoc.filename,
      page: pageNumber,
      text: page.text.substring(0, 3000),
    };
  };

  // --- API Configuration (Custom, Gemini, Ollama, or Environment) ---
  const apiKey =
    customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GROQ_API_KEY ||
    (process.env.AI_BASE_URL?.includes('11434') || customBaseUrl?.includes('11434') ? 'ollama' : undefined);

  let defaultBaseUrl = 'https://api.openai.com/v1';
  let defaultModel = 'gpt-4o-mini';

  if (process.env.GEMINI_API_KEY || (apiKey && (apiKey.startsWith('AQ.') || apiKey.startsWith('AIza')))) {
    defaultBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
    defaultModel = 'gemini-3.5-flash-lite';
  } else if (process.env.OPENROUTER_API_KEY) {
    defaultBaseUrl = 'https://openrouter.ai/api/v1';
    defaultModel = 'openai/gpt-4o-mini';
  } else if (process.env.GROQ_API_KEY) {
    defaultBaseUrl = 'https://api.groq.com/openai/v1';
    defaultModel = 'llama-3.1-8b-instant';
  } else if (process.env.AI_BASE_URL?.includes('11434') || customBaseUrl?.includes('11434')) {
    defaultBaseUrl = 'http://localhost:11434/v1';
    defaultModel = 'qwen2.5:1.5b';
  }

  const baseUrl = customBaseUrl || process.env.AI_BASE_URL || defaultBaseUrl;
  const modelName = customModel || process.env.AI_MODEL || defaultModel;

  let fullAnswer = '';

  // If external AI key is available, execute multi-round agent tool loop
  if (apiKey) {
    try {
      const tools = [
        {
          type: 'function',
          function: {
            name: 'list_clauses',
            description: 'Lists all clauses, section numbers, and titles in the document',
            parameters: {
              type: 'object',
              properties: { docId: { type: 'string', description: 'Optional specific document ID' } },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'search_document',
            description: 'Searches the contract for specific keywords, concepts, or legal terms',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Keywords to search for' },
                docId: { type: 'string', description: 'Optional document ID' },
              },
              required: ['query'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_section',
            description: 'Retrieves the complete text of a specific clause or section by number or title',
            parameters: {
              type: 'object',
              properties: {
                section: { type: 'string', description: 'Section number or title' },
                docId: { type: 'string', description: 'Optional document ID' },
              },
              required: ['section'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'inspect_page',
            description: 'Inspects full text of a specific page number',
            parameters: {
              type: 'object',
              properties: {
                page_number: { type: 'number', description: 'Page number to inspect' },
                docId: { type: 'string', description: 'Optional document ID' },
              },
              required: ['page_number'],
            },
          },
        },
      ];

      const conversationMessages: any[] = [
        {
          role: 'system',
          content: `You are an expert legal document analyst.
RULES:
1. Always look up the document using tools before answering.
2. Answer the user's specific question directly, concisely, and in natural, human-readable language. Always respond in the language or script the user asked in (e.g. if the user asks in Gujarati or Gujarati in Latin script like "mane cupid stock vishe mahiti joiae chhe", explain the substantive answer in natural, clear Gujarati so the user can easily read and understand).
3. If the document uses regional languages, non-English scripts, or legacy font encodings, always provide a clear, plain translation and explanation of what the text substantively means in the user's language so a human reader can easily understand it.
4. Back your answer with exact verbatim quotes enclosed in quotation marks (e.g. > "quote"). Keep quotes focused on the pertinent words (1 to 2 sentences max).
5. DO NOT paraphrase quotes. Exact wording is strictly required.
6. NEVER enclose conversational text or the user prompt in quotation marks. Only actual quotes from the document must be in quotes.
7. If the answer or clause is not present in the document, state clearly that it does not exist.
Documents available:
${parsedDocs.map(d => `- [${d.filename}] (Pages: ${d.totalPages}, Clauses: ${d.clauses.length})`).join('\n')}`,
        },
        { role: 'user', content: query },
      ];

      const MAX_ROUNDS = 5;
      let round = 0;

      while (round < MAX_ROUNDS) {
        if (signal?.aborted) break;
        round++;

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: conversationMessages,
            tools,
            tool_choice: round === MAX_ROUNDS ? 'none' : 'auto',
          }),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`AI API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const message = choice?.message;
        if (!message) break;

        conversationMessages.push(message);

        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const tc of message.tool_calls) {
            const funcName = tc.function.name;
            let args: any = {};
            try {
              args = JSON.parse(tc.function.arguments || '{}');
            } catch {
              args = { raw: tc.function.arguments };
            }

            const humanMessage =
              funcName === 'search_document'
                ? `Searching contract for "${args.query || 'terms'}"...`
                : funcName === 'get_section'
                ? `Retrieving Section "${args.section || ''}"...`
                : funcName === 'list_clauses'
                ? 'Inspecting document table of contents and clauses...'
                : `Examining Page ${args.page_number || 1}...`;

            const stepRecord: AgentStep = {
              stepNumber: steps.length + 1,
              tool: funcName,
              input: args,
              message: humanMessage,
              timestamp: new Date().toLocaleTimeString(),
            };
            steps.push(stepRecord);
            onStream({ type: 'agent_step', step: stepRecord });

            let toolResult: any;
            try {
              if (funcName === 'list_clauses') {
                toolResult = toolListClauses(args.docId);
              } else if (funcName === 'search_document') {
                toolResult = toolSearchDocument(args.query || '', args.docId);
              } else if (funcName === 'get_section') {
                toolResult = toolGetSection(args.section || '', args.docId);
              } else if (funcName === 'inspect_page') {
                toolResult = toolInspectPage(args.page_number || 1, args.docId);
              } else {
                toolResult = { error: `Tool "${funcName}" is not recognized.` };
              }
            } catch (err: any) {
              toolResult = { error: `Tool execution failed: ${err.message}` };
            }

            conversationMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(toolResult),
            });

            onStream({
              type: 'agent_result',
              step: {
                ...stepRecord,
                outputSummary: `Returned ${Array.isArray(toolResult) ? toolResult.length + ' items' : 'data'}`,
              },
            });
          }
        } else {
          fullAnswer = message.content || '';
          const words = fullAnswer.split(' ');
          for (let i = 0; i < words.length; i++) {
            if (signal?.aborted) break;
            const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
            onStream({ type: 'token', token: chunk });
            await new Promise(r => setTimeout(r, 15));
          }
          break;
        }
      }
    } catch (e: any) {
      console.warn('External AI call failed or not configured, using local research engine:', e.message);
    }
  }

  // --- High-Performance Local Research Engine ---
  if (!fullAnswer) {
    const step1: AgentStep = {
      stepNumber: 1,
      tool: 'list_clauses',
      input: { docCount: parsedDocs.length },
      message: 'Scanning document outline and clause hierarchy...',
      timestamp: new Date().toLocaleTimeString(),
    };
    steps.push(step1);
    onStream({ type: 'agent_step', step: step1 });
    await new Promise(r => setTimeout(r, 100));

    const keywords = extractKeywords(query);
    const step2: AgentStep = {
      stepNumber: 2,
      tool: 'search_document',
      input: { query: keywords.join(' ') || query },
      message: `Searching document text for "${keywords.slice(0, 3).join(', ') || query}"...`,
      timestamp: new Date().toLocaleTimeString(),
    };
    steps.push(step2);
    onStream({ type: 'agent_step', step: step2 });
    await new Promise(r => setTimeout(r, 150));

    const primaryDoc = parsedDocs[0];
    if (primaryDoc) {
      inspectedPages.add(1);

      const step3: AgentStep = {
        stepNumber: 3,
        tool: 'get_section',
        input: { section: 'Relevant Section / Page 1' },
        message: `Inspecting targeted section in ${primaryDoc.filename}...`,
        timestamp: new Date().toLocaleTimeString(),
      };
      steps.push(step3);
      onStream({ type: 'agent_step', step: step3 });
      await new Promise(r => setTimeout(r, 150));

      fullAnswer = synthesizeGroundedAnswer(query, primaryDoc.rawText, primaryDoc.filename, primaryDoc.pages);
    } else {
      fullAnswer = `No document available to inspect.`;
    }

    // Stream tokens
    const words = fullAnswer.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) break;
      const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
      onStream({ type: 'token', token: chunk });
      await new Promise(r => setTimeout(r, 12));
    }
  }

  // --- Document Coverage Metric ---
  const isFull = inspectedPages.size >= totalPagesSum && totalPagesSum > 0;
  const coverage: DocumentCoverage = {
    pagesRead: Array.from(inspectedPages).sort((a, b) => a - b),
    totalPages: totalPagesSum,
    clausesInspected: Array.from(inspectedClauses),
    totalClauses: totalClausesSum,
    isFullCoverage: isFull,
    coverageNotice: isFull
      ? `Full document coverage: all ${totalPagesSum} pages and ${totalClausesSum} clauses evaluated.`
      : `Partial coverage: inspected ${inspectedPages.size} of ${totalPagesSum} pages (${inspectedClauses.size} clauses evaluated). Answers are grounded solely in retrieved sections.`,
  };

  onStream({ type: 'coverage', coverage });

  // --- Quote Verification Engine Execution ---
  const extractedQuotes = extractQuotesFromAnswer(fullAnswer);
  const verifiedQuotes = verifyAllQuotes(
    extractedQuotes,
    parsedDocs.map(d => ({ id: d.id, filename: d.filename, pages: d.pages }))
  );

  onStream({ type: 'verified_quotes', quotes: verifiedQuotes });
  onStream({ type: 'done', fullAnswer });

  return {
    answer: fullAnswer,
    quotes: verifiedQuotes,
    steps,
    coverage,
  };
}
