import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const chat = await db.getChat(params.id);
    if (!chat) {
      return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 });
    }

    const rawMessages = await db.getMessages(params.id);
    const messages = rawMessages.map(m => {
      let quotes = [];
      let coverage = null;
      let agentSteps = [];
      try {
        quotes = JSON.parse(m.quotes_json);
      } catch {}
      try {
        coverage = JSON.parse(m.coverage_json);
      } catch {}
      try {
        agentSteps = JSON.parse(m.agent_steps_json);
      } catch {}

      return {
        id: m.id,
        role: m.role,
        content: m.content,
        quotes,
        coverage,
        agentSteps,
        createdAt: m.created_at,
      };
    });

    return NextResponse.json({ success: true, chat, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.deleteChat(params.id);
    return NextResponse.json({ success: true, message: 'Chat deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
