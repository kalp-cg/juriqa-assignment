import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await db.getDocument(params.id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    let pages = [];
    let clauses = [];
    try {
      pages = JSON.parse(doc.pages_json);
    } catch {
      pages = [];
    }
    try {
      clauses = JSON.parse(doc.clauses_json);
    } catch {
      clauses = [];
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        filename: doc.filename,
        filetype: doc.filetype,
        filesize: doc.filesize,
        total_pages: doc.total_pages,
        total_words: doc.total_words,
        created_at: doc.created_at,
        status: doc.status,
        error_message: doc.error_message,
        pages,
        clauses,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.deleteDocument(params.id);
    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
