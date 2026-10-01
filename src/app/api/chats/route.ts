import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'documentId required' }, { status: 400 });
    }

    const chats = await db.listChatsForDoc(documentId);
    return NextResponse.json({ success: true, chats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, title } = body;

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'documentId required' }, { status: 400 });
    }

    const chat = await db.getOrCreateChat(documentId, title || 'New Conversation');
    return NextResponse.json({ success: true, chat });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
