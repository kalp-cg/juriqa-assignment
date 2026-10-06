import { NextRequest } from 'next/server';
import { db, DocumentRecord, MessageRecord } from '@/lib/db';
import { runAgenticDocumentResearch, AgentStep, DocumentCoverage, StreamEvent } from '@/lib/aiService';
import { extractQuotesFromAnswer, verifyAllQuotes, VerifiedQuote, DocumentPage } from '@/lib/quoteVerifier';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, documentIds, message: userMessage, apiKey, backupApiKey, baseUrl, model } = body;

    if (!userMessage || !chatId || !documentIds || documentIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required parameters (chatId, documentIds, message)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retrieve documents
    const docRecords: DocumentRecord[] = [];
    for (const dId of documentIds) {
      const doc = await db.getDocument(dId);
      if (doc && doc.status === 'ready') {
        docRecords.push(doc);
      }
    }

    if (docRecords.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Contract not found or not ready in current database session. In serverless deployments (Vercel), stateless instances may restart if an external DATABASE_URL is not configured. Please reload or re-select the document.' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save user message to database
    const userMsgId = 'msg_' + Math.random().toString(36).substring(2, 11);
    await db.saveMessage({
      id: userMsgId,
      chat_id: chatId,
      role: 'user',
      content: userMessage,
      quotes_json: '[]',
      coverage_json: '{}',
      agent_steps_json: '[]',
      created_at: new Date().toISOString(),
    });

    // Create an SSE stream
    const encoder = new TextEncoder();
    const assistantMsgId = 'msg_' + Math.random().toString(36).substring(2, 11);

    let partialText = '';
    let accumulatedSteps: AgentStep[] = [];
    let latestCoverage: DocumentCoverage | null = null;
    let latestQuotes: VerifiedQuote[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          await runAgenticDocumentResearch(
            userMessage,
            docRecords,
            (event: StreamEvent) => {
              if (event.type === 'token' && event.token) {
                partialText += event.token;
              } else if (event.type === 'agent_step' && event.step) {
                accumulatedSteps.push(event.step);
              } else if (event.type === 'coverage' && event.coverage) {
                latestCoverage = event.coverage;
              } else if (event.type === 'verified_quotes' && event.quotes) {
                latestQuotes = event.quotes;
              }
              sendEvent(event);
            },
            req.signal,
            apiKey,
            baseUrl,
            model,
            backupApiKey
          );

          // Save completed assistant message to DB
          await db.saveMessage({
            id: assistantMsgId,
            chat_id: chatId,
            role: 'assistant',
            content: partialText,
            quotes_json: JSON.stringify(latestQuotes),
            coverage_json: JSON.stringify(latestCoverage || {}),
            agent_steps_json: JSON.stringify(accumulatedSteps),
            created_at: new Date().toISOString(),
          });

          controller.close();
        } catch (streamErr: any) {
          // If aborted by user ("Stop Generating"), preserve partial answer in DB!
          if (req.signal.aborted || streamErr.name === 'AbortError') {
            console.log('Stream stopped by user, preserving partial generation.');
            if (partialText) {
              // Verify whatever quotes exist in partial text
              const parsedDocs = docRecords.map(d => {
                let pages: DocumentPage[] = [];
                try {
                  pages = JSON.parse(d.pages_json);
                } catch {
                  pages = [{ pageNumber: 1, text: d.raw_text }];
                }
                return { id: d.id, filename: d.filename, pages };
              });
              const quotes = verifyAllQuotes(extractQuotesFromAnswer(partialText), parsedDocs, partialText);

              await db.saveMessage({
                id: assistantMsgId,
                chat_id: chatId,
                role: 'assistant',
                content: partialText + ' *(Generation stopped by user)*',
                quotes_json: JSON.stringify(quotes),
                coverage_json: JSON.stringify(latestCoverage || {}),
                agent_steps_json: JSON.stringify(accumulatedSteps),
                created_at: new Date().toISOString(),
              });
            }
          } else {
            console.error('Error during AI streaming:', streamErr);
            sendEvent({ type: 'error', error: streamErr.message || 'Stream processing error' });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
