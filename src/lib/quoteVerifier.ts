/**
 * Robust Legal Quote Verification Engine
 * 
 * Accurately validates whether cited quotes exist in document text,
 * accounting for whitespace, line breaks, smart quotes, hyphenation,
 * and page transitions. Computes independent offsets and page numbers.
 */

export interface VerifiedQuote {
  quote: string;
  verified: boolean;
  documentId?: string;
  documentName?: string;
  pageNumber?: number;
  endPageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  matchedText?: string;
  confidence: number; // 0 to 1
  reason?: string;
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
}

// Normalize characters (smart quotes, dashes, soft hyphens, multiple spaces)
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // Single quotes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // Double quotes
    .replace(/[\u2013\u2014\u2015]/g, '-')                   // Dashes
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // Whitespaces
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '')        // Soft hyphens / zero width
    .replace(/\s+/g, ' ')                                    // Collapse multiple spaces/newlines
    .trim();
}

/**
 * Builds token-to-character and token-to-page mappings for the original document text
 */
interface TokenMapping {
  token: string;
  normalizedToken: string;
  rawStart: number;
  rawEnd: number;
  pageNumber: number;
}

export function buildDocumentTokens(pages: DocumentPage[]): {
  tokens: TokenMapping[];
  fullRawText: string;
  pageOffsets: { pageNumber: number; startOffset: number; endOffset: number }[];
} {
  let fullRawText = '';
  const pageOffsets: { pageNumber: number; startOffset: number; endOffset: number }[] = [];
  const tokens: TokenMapping[] = [];

  for (const page of pages) {
    const pageStart = fullRawText.length;
    fullRawText += (fullRawText.length > 0 ? '\n\n' : '') + page.text;
    const pageEnd = fullRawText.length;
    pageOffsets.push({
      pageNumber: page.pageNumber,
      startOffset: pageStart,
      endOffset: pageEnd,
    });
  }

  // Regex to match words/tokens and their exact raw positions
  const wordRegex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(fullRawText)) !== null) {
    const rawStart = match.index;
    const rawEnd = match.index + match[0].length;
    const token = match[0];
    const normalizedToken = token
      .toLowerCase()
      .replace(/[^\w\d]/g, ''); // alphanumeric only for fuzzy matching

    // Determine page number
    let pageNum = 1;
    for (const po of pageOffsets) {
      if (rawStart >= po.startOffset && rawStart <= po.endOffset) {
        pageNum = po.pageNumber;
        break;
      }
    }

    tokens.push({
      token,
      normalizedToken,
      rawStart,
      rawEnd,
      pageNumber: pageNum,
    });
  }

  return { tokens, fullRawText, pageOffsets };
}

/**
 * Verifies a single quote against a document
 */
export function verifyQuoteAgainstDocument(
  rawQuote: string,
  pages: DocumentPage[],
  documentId?: string,
  documentName?: string
): VerifiedQuote {
  const cleanQuote = rawQuote.trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();

  if (!cleanQuote || cleanQuote.length < 5) {
    return {
      quote: rawQuote,
      verified: false,
      documentId,
      documentName,
      confidence: 0,
      reason: 'Quote is too short or empty to verify reliably.',
    };
  }

  const { tokens, fullRawText, pageOffsets } = buildDocumentTokens(pages);
  const normCleanQuote = normalizeText(cleanQuote).toLowerCase();

  // 1. Direct Normalized String Search across full text
  const normFullText = normalizeText(fullRawText).toLowerCase();
  const directIdx = normFullText.indexOf(normCleanQuote);

  // If direct normalized match found, locate raw boundaries
  if (directIdx !== -1) {
    // Locate token boundaries that correspond to this quote
    const quoteWords = cleanQuote.split(/\s+/).filter(Boolean);
    const firstWordNorm = quoteWords[0].toLowerCase().replace(/[^\w\d]/g, '');
    const lastWordNorm = quoteWords[quoteWords.length - 1].toLowerCase().replace(/[^\w\d]/g, '');

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].normalizedToken === firstWordNorm) {
        // Check if subsequent tokens match
        let matches = true;
        let matchLen = Math.min(quoteWords.length, tokens.length - i);
        if (matchLen < quoteWords.length) continue;

        let lastTokenIdx = i + quoteWords.length - 1;
        if (tokens[lastTokenIdx].normalizedToken === lastWordNorm) {
          const rawStart = tokens[i].rawStart;
          const rawEnd = tokens[lastTokenIdx].rawEnd;
          const matchedText = fullRawText.substring(rawStart, rawEnd);

          return {
            quote: rawQuote,
            verified: true,
            documentId,
            documentName,
            pageNumber: tokens[i].pageNumber,
            endPageNumber: tokens[lastTokenIdx].pageNumber,
            startOffset: rawStart,
            endOffset: rawEnd,
            matchedText,
            confidence: 1.0,
          };
        }
      }
    }
  }

  // 2. Sliding Window Token-Sequence Matching (Tolerates line breaks, hyphens, and whitespace)
  const quoteTokens = cleanQuote
    .split(/\s+/)
    .map(t => t.toLowerCase().replace(/[^\w\d]/g, ''))
    .filter(t => t.length > 0);

  if (quoteTokens.length === 0) {
    return {
      quote: rawQuote,
      verified: false,
      documentId,
      documentName,
      confidence: 0,
      reason: 'No searchable alphanumeric tokens in quote.',
    };
  }

  const qLen = quoteTokens.length;
  let bestScore = 0;
  let bestStartIdx = -1;
  let bestEndIdx = -1;

  for (let i = 0; i <= tokens.length - qLen; i++) {
    // Quick check on first and last token to speed up scan
    if (
      tokens[i].normalizedToken !== quoteTokens[0] &&
      !tokens[i].normalizedToken.includes(quoteTokens[0]) &&
      !quoteTokens[0].includes(tokens[i].normalizedToken)
    ) {
      continue;
    }

    let matchingTokens = 0;
    for (let j = 0; j < qLen; j++) {
      const docT = tokens[i + j].normalizedToken;
      const quoteT = quoteTokens[j];
      if (docT === quoteT) {
        matchingTokens++;
      } else if (docT.length > 3 && (docT.includes(quoteT) || quoteT.includes(docT))) {
        matchingTokens += 0.8;
      }
    }

    const score = matchingTokens / qLen;
    if (score > bestScore) {
      bestScore = score;
      bestStartIdx = i;
      bestEndIdx = i + qLen - 1;
      if (score === 1.0) break; // Perfect match
    }
  }

  // Threshold: 0.85 allows for minor hyphenation or punctuation differences while rejecting hallucinations
  if (bestScore >= 0.85 && bestStartIdx !== -1) {
    const rawStart = tokens[bestStartIdx].rawStart;
    const rawEnd = tokens[bestEndIdx].rawEnd;
    const matchedText = fullRawText.substring(rawStart, rawEnd);

    return {
      quote: rawQuote,
      verified: true,
      documentId,
      documentName,
      pageNumber: tokens[bestStartIdx].pageNumber,
      endPageNumber: tokens[bestEndIdx].pageNumber,
      startOffset: rawStart,
      endOffset: rawEnd,
      matchedText,
      confidence: Math.round(bestScore * 100) / 100,
    };
  }

  // Quote not verified
  return {
    quote: rawQuote,
    verified: false,
    documentId,
    documentName,
    confidence: Math.round(bestScore * 100) / 100,
    reason: 'The quote was not found in the source text. It may have been paraphrased or generated by the AI.',
  };
}

/**
 * Extracts candidate quotes from an AI answer markdown text
 * Finds markdown quotes (e.g. > "quote", "quote", or [Quote: ...])
 */
export function extractQuotesFromAnswer(answerText: string): string[] {
  const quotes: string[] = [];

  // Match blockquotes: > "..." or > ...
  const blockquoteRegex = /^>\s*["'“‘]?(.+?)["'”’]?$/gm;
  let match: RegExpExecArray | null;
  while ((match = blockquoteRegex.exec(answerText)) !== null) {
    const q = match[1].trim();
    if (q.length > 15 && !quotes.includes(q)) {
      quotes.push(q);
    }
  }

  // Match explicit quotation marks within text: "..." or “...”
  const quotedRegex = /["“]([^"”\n]{20,300})["”]/g;
  while ((match = quotedRegex.exec(answerText)) !== null) {
    const q = match[1].trim();
    if (q.length > 20 && !quotes.includes(q)) {
      quotes.push(q);
    }
  }

  return quotes;
}

/**
 * Batch verifies all quotes extracted from an AI response against one or multiple documents
 */
export function verifyAllQuotes(
  quotes: string[],
  documents: { id: string; filename: string; pages: DocumentPage[] }[]
): VerifiedQuote[] {
  const results: VerifiedQuote[] = [];

  for (const quote of quotes) {
    let verifiedQuoteResult: VerifiedQuote | null = null;

    // Search across all candidate documents
    for (const doc of documents) {
      const res = verifyQuoteAgainstDocument(quote, doc.pages, doc.id, doc.filename);
      if (res.verified) {
        verifiedQuoteResult = res;
        break;
      } else if (!verifiedQuoteResult || res.confidence > verifiedQuoteResult.confidence) {
        verifiedQuoteResult = res;
      }
    }

    if (verifiedQuoteResult) {
      results.push(verifiedQuoteResult);
    } else {
      results.push({
        quote,
        verified: false,
        confidence: 0,
        reason: 'Quote could not be found in any uploaded contract.',
      });
    }
  }

  return results;
}
