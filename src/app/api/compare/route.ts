import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareContracts } from '@/lib/comparisonEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docAId, docBId } = body;

    if (!docAId || !docBId) {
      return NextResponse.json({ success: false, error: 'Both docAId and docBId are required' }, { status: 400 });
    }

    const docA = await db.getDocument(docAId);
    const docB = await db.getDocument(docBId);

    if (!docA || !docB) {
      return NextResponse.json({ success: false, error: 'One or both documents could not be found' }, { status: 404 });
    }

    const comparison = compareContracts(docA, docB);

    // Save comparison record
    await db.saveComparison({
      id: comparison.id,
      doc_a_id: docAId,
      doc_b_id: docBId,
      summary: comparison.summary,
      diffs_json: JSON.stringify(comparison.diffs),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, comparison });
  } catch (error: any) {
    console.error('Comparison error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
