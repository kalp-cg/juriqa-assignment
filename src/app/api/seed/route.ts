import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db, DocumentRecord } from '@/lib/db';
import { processPdf, processDocx } from '@/lib/documentProcessor';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const samplesDir = path.join(process.cwd(), 'sample_contracts');
    if (!fs.existsSync(samplesDir)) {
      return NextResponse.json({ success: false, error: 'sample_contracts directory not found' }, { status: 404 });
    }

    const files = [
      'Enterprise_SaaS_Agreement.pdf',
      'Commercial_Agreement_v1.docx',
      'Commercial_Agreement_v2.docx',
      'Arabic_Enterprise_Master_Agreement_15_Pages.docx',
      'Accord_de_Confidentialite_Commercial_France.docx',
      'Software_Lizenzvertrag_Deutschland.pdf',
      'Acuerdo_Marco_de_Servicios_Espanol.pdf',
      'Executive_Employment_Agreement.docx',
      'Real_Estate_Commercial_Lease_Agreement.docx',
      'Cross_Border_Data_Processing_Agreement_GDPR.docx',
      'Employee_NDA_Ambiguity_Labs.pdf',
      'Joint_Venture_Technology_Partnership.docx',
      '150_Page_Enterprise_Master_Agreement.pdf',
      'Scanned_Contract_No_Text.pdf',
    ];

    const seeded: any[] = [];
    const expectedRejections: any[] = [];

    for (const filename of files) {
      const filePath = path.join(samplesDir, filename);
      if (!fs.existsSync(filePath)) continue;

      const buffer = fs.readFileSync(filePath);
      const isPdf = filename.endsWith('.pdf');
      const docId = 'doc_' + filename.toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Check if already seeded and ready
      const existing = await db.getDocument(docId);
      if (existing && existing.status === 'ready') {
        seeded.push({ id: existing.id, filename: existing.filename, status: existing.status });
        continue;
      }

      try {
        let processed;
        if (isPdf) {
          processed = await processPdf(buffer, filename, docId);
        } else {
          processed = await processDocx(buffer, filename, docId);
        }

        const record: DocumentRecord = {
          id: docId,
          filename,
          filetype: isPdf ? 'pdf' : 'docx',
          filesize: buffer.length,
          total_pages: processed.totalPages,
          total_words: processed.totalWords,
          raw_text: processed.rawText,
          pages_json: JSON.stringify(processed.pages),
          clauses_json: JSON.stringify(processed.clauses),
          created_at: new Date().toISOString(),
          status: 'ready',
        };
        await db.saveDocument(record);
        seeded.push({ id: record.id, filename: record.filename, status: 'ready', pages: record.total_pages });
      } catch (err: any) {
        // Scanned PDF detection or extraction failure
        const errorRecord: DocumentRecord = {
          id: docId,
          filename,
          filetype: isPdf ? 'pdf' : 'docx',
          filesize: buffer.length,
          total_pages: 1,
          total_words: 0,
          raw_text: '',
          pages_json: '[]',
          clauses_json: '[]',
          created_at: new Date().toISOString(),
          status: 'error',
          error_message: err.message,
        };
        await db.saveDocument(errorRecord);
        expectedRejections.push({ id: docId, filename, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample contracts loaded successfully',
      seeded,
      expectedRejections,
    });
  } catch (error: any) {
    console.error('Seed API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
