import { NextRequest, NextResponse } from 'next/server';
import { db, DocumentRecord } from '@/lib/db';
import { validateFileType, processPdf, processDocx } from '@/lib/documentProcessor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const docs = await db.listDocuments();
    return NextResponse.json({ success: true, documents: docs });
  } catch (error: any) {
    console.error('Failed to list documents:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name;
    const validation = validateFileType(filename, file.type);
    if (!validation.valid || !validation.filetype) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const docId = 'doc_' + Math.random().toString(36).substring(2, 11);

    // Initial record with processing status
    const initialRecord: DocumentRecord = {
      id: docId,
      filename,
      filetype: validation.filetype,
      filesize: buffer.length,
      total_pages: 1,
      total_words: 0,
      raw_text: '',
      pages_json: '[]',
      clauses_json: '[]',
      created_at: new Date().toISOString(),
      status: 'processing',
    };
    await db.saveDocument(initialRecord);

    try {
      let processed;
      if (validation.filetype === 'pdf') {
        processed = await processPdf(buffer, filename, docId);
      } else {
        processed = await processDocx(buffer, filename, docId);
      }

      const readyRecord: DocumentRecord = {
        id: docId,
        filename,
        filetype: validation.filetype,
        filesize: buffer.length,
        total_pages: processed.totalPages,
        total_words: processed.totalWords,
        raw_text: processed.rawText,
        pages_json: JSON.stringify(processed.pages),
        clauses_json: JSON.stringify(processed.clauses),
        created_at: new Date().toISOString(),
        status: 'ready',
      };
      await db.saveDocument(readyRecord);

      return NextResponse.json({
        success: true,
        document: {
          id: readyRecord.id,
          filename: readyRecord.filename,
          filetype: readyRecord.filetype,
          filesize: readyRecord.filesize,
          total_pages: readyRecord.total_pages,
          total_words: readyRecord.total_words,
          clauses_count: processed.clauses.length,
          status: 'ready',
          pages: processed.pages,
          clauses: processed.clauses,
          raw_text: processed.rawText,
        },
      });
    } catch (procErr: any) {
      // Scanned PDF or extraction failure: update status with clear explanation
      const failedRecord: DocumentRecord = {
        ...initialRecord,
        status: 'error',
        error_message: procErr.message,
      };
      await db.saveDocument(failedRecord);

      return NextResponse.json({
        success: false,
        error: procErr.message,
        document: failedRecord,
      }, { status: 422 });
    }
  } catch (error: any) {
    console.error('Upload processing error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
