// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { DocumentPage } from './quoteVerifier';

export interface ProcessedDocument {
  id: string;
  filename: string;
  filetype: 'pdf' | 'docx';
  filesize: number;
  totalPages: number;
  totalWords: number;
  rawText: string;
  pages: DocumentPage[];
  clauses: ExtractedClause[];
}

export interface ExtractedClause {
  id: string;
  number: string;
  title: string;
  text: string;
  pageNumber: number;
}

export function extractClauses(pages: DocumentPage[]): ExtractedClause[] {
  const clauses: ExtractedClause[] = [];
  let clauseIndex = 1;

  for (const page of pages) {
    const lines = page.text.split('\n');
    let currentClause: ExtractedClause | null = null;
    let currentBody: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const headerMatch = /^(?:(?:Section|Article|Clause)\s+)?([0-9]+(?:\.[0-9]+)*|[IVXLCDM]+)[\.\:\s]+([A-Z][A-Za-z0-9\s,\-\(\)\/\&]{2,60})$/.exec(line);

      if (headerMatch) {
        if (currentClause) {
          currentClause.text = currentBody.join('\n').trim();
          if (currentClause.text.length > 10) {
            clauses.push(currentClause);
          }
        }

        currentClause = {
          id: `clause_${clauseIndex++}`,
          number: headerMatch[1],
          title: headerMatch[2].trim(),
          text: '',
          pageNumber: page.pageNumber,
        };
        currentBody = [];
      } else {
        if (currentClause) {
          currentBody.push(line);
        }
      }
    }

    if (currentClause) {
      currentClause.text = currentBody.join('\n').trim();
      if (currentClause.text.length > 10) {
        clauses.push(currentClause);
      }
    }
  }

  if (clauses.length === 0) {
    for (const page of pages) {
      const paragraphs = page.text.split(/\n\s*\n/).filter(p => p.trim().length > 30);
      paragraphs.forEach((p, idx) => {
        const firstLine = p.trim().split('\n')[0].substring(0, 50);
        clauses.push({
          id: `clause_p${page.pageNumber}_${idx + 1}`,
          number: `${page.pageNumber}.${idx + 1}`,
          title: firstLine,
          text: p.trim(),
          pageNumber: page.pageNumber,
        });
      });
    }
  }

  return clauses;
}

export function validateFileType(filename: string, mimeType?: string): { valid: boolean; filetype?: 'pdf' | 'docx'; error?: string } {
  const lower = filename.toLowerCase();
  const isPdf = lower.endsWith('.pdf') || mimeType === 'application/pdf';
  const isDocx = lower.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (!isPdf && !isDocx) {
    return {
      valid: false,
      error: `Unsupported file type. Only PDF (.pdf) and Word documents (.docx) are supported. Received "${filename}".`,
    };
  }

  return {
    valid: true,
    filetype: isPdf ? 'pdf' : 'docx',
  };
}

export async function processPdf(
  buffer: Buffer,
  filename: string,
  docId: string
): Promise<ProcessedDocument> {
  const pages: DocumentPage[] = [];
  let pageIndex = 1;

  const pagerender = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if (lastY === null || Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      const cleanPageText = pageText.trim();
      pages.push({
        pageNumber: pageIndex++,
        text: cleanPageText,
      });
      return cleanPageText;
    });
  };

  const parsed = await pdfParse(buffer, { pagerender });
  const rawText = parsed.text || '';
  const totalPages = pages.length > 0 ? pages.length : parsed.numpages || 1;

  // --- Scanned PDF Detection (Requirement 1) ---
  const alphanumericCount = (rawText.match(/[a-zA-Z0-9]/g) || []).length;
  const avgCharsPerPage = totalPages > 0 ? alphanumericCount / totalPages : 0;

  if (alphanumericCount < 25 || avgCharsPerPage < 8) {
    throw new Error(
      `This PDF appears to be a scanned document containing no selectable or readable text (${alphanumericCount} readable characters detected across ${totalPages} pages). Please provide a searchable PDF with text or a DOCX contract.`
    );
  }

  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const clauses = extractClauses(pages);

  return {
    id: docId,
    filename,
    filetype: 'pdf',
    filesize: buffer.length,
    totalPages,
    totalWords: words.length,
    rawText,
    pages,
    clauses,
  };
}

export async function processDocx(
  buffer: Buffer,
  filename: string,
  docId: string
): Promise<ProcessedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value || '';

  const alphanumericCount = (rawText.match(/[a-zA-Z0-9]/g) || []).length;
  if (alphanumericCount < 25) {
    throw new Error(
      `The Word document "${filename}" contains no readable text. Please check the document content.`
    );
  }

  const paragraphs = rawText.split(/\n+/).filter(p => p.trim().length > 0);
  const pages: DocumentPage[] = [];
  let currentPageText: string[] = [];
  let currentLength = 0;
  let pageNum = 1;

  for (const para of paragraphs) {
    currentPageText.push(para);
    currentLength += para.length;
    if (currentLength >= 2200) {
      pages.push({
        pageNumber: pageNum++,
        text: currentPageText.join('\n\n'),
      });
      currentPageText = [];
      currentLength = 0;
    }
  }

  if (currentPageText.length > 0 || pages.length === 0) {
    pages.push({
      pageNumber: pageNum,
      text: currentPageText.join('\n\n'),
    });
  }

  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const clauses = extractClauses(pages);

  return {
    id: docId,
    filename,
    filetype: 'docx',
    filesize: buffer.length,
    totalPages: pages.length,
    totalWords: words.length,
    rawText,
    pages,
    clauses,
  };
}
