'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Square,
  Scale,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Search,
  BookOpen,
  Plus,
  Trash2,
  Clock,
  Check,
  Mic,
  MicOff,
  Download,
} from 'lucide-react';
import { AgentStep, DocumentCoverage } from '@/lib/aiService';
import { VerifiedQuote } from '@/lib/quoteVerifier';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  quotes?: VerifiedQuote[];
  coverage?: DocumentCoverage | null;
  agentSteps?: AgentStep[];
  createdAt?: string;
}

export interface ChatSession {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatInterfaceProps {
  documentId: string;
  documentTitle: string;
  onSelectCitation: (quote: VerifiedQuote) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  documentId,
  documentTitle,
  onSelectCitation,
}) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);
  const [expandedStepsMap, setExpandedStepsMap] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions for this document
  const loadChats = async () => {
    try {
      const res = await fetch(`/api/chats?documentId=${documentId}`);
      const data = await res.json();
      if (data.success && data.chats) {
        setChats(data.chats);
        if (data.chats.length > 0 && !activeChatId) {
          setActiveChatId(data.chats[0].id);
        } else if (data.chats.length === 0) {
          // Auto-create initial chat
          createNewChat();
        }
      }
    } catch (e) {
      console.error('Failed to load chats:', e);
    }
  };

  useEffect(() => {
    loadChats();
  }, [documentId]);

  // Load messages for the active chat
  useEffect(() => {
    if (!activeChatId) return;

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chats/${activeChatId}`);
        const data = await res.json();
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    };

    loadMessages();
  }, [activeChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSteps]);

  const createNewChat = async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          title: `Analysis: ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.chat) {
        setChats(prev => [data.chat, ...prev]);
        setActiveChatId(data.chat.id);
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to create new chat:', e);
    }
  };

  const deleteChat = async (id: string) => {
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeChatId === id) {
        const remaining = chats.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (e) {
      console.error('Failed to delete chat:', e);
    }
  };

  // Bonus Extra: Voice input using browser speech recognition
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt(prev => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Bonus Extra: Export answer with source-attributed verified quotes as formatted Markdown document
  const handleExportMessage = (msg: ChatMessage) => {
    let doc = `# Veritas Legal AI - Contract Analysis Report\n\n`;
    doc += `**Contract:** ${documentTitle}\n`;
    doc += `**Date:** ${new Date().toLocaleString()}\n`;
    if (msg.coverage?.coverageNotice) {
      doc += `**Document Coverage:** ${msg.coverage.coverageNotice}\n`;
    }
    doc += `\n---\n\n## Substantive Analysis\n\n${msg.content}\n\n`;

    if (msg.quotes && msg.quotes.length > 0) {
      doc += `## Source Document Citations (${msg.quotes.length})\n\n`;
      msg.quotes.forEach((q, idx) => {
        doc += `### Citation ${idx + 1}: ${q.verified ? 'VERIFIED' : 'UNVERIFIED'}\n`;
        if (q.pageNumber) doc += `- **Page:** ${q.pageNumber}\n`;
        if (q.documentName) doc += `- **Document:** ${q.documentName}\n`;
        doc += `> "${q.matchedText || q.quote}"\n\n`;
      });
    }

    const blob = new Blob([doc], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Veritas_Analysis_${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isGenerating || !activeChatId) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    // Append user message to UI immediately
    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    setIsGenerating(true);
    setActiveSteps([]);

    // Create abort controller so user can stop generation at any moment!
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Temporary placeholder for assistant message
    const assistantMsgId = 'asst_' + Date.now();
    let partialAnswer = '';
    let currentQuotes: VerifiedQuote[] = [];
    let currentCoverage: DocumentCoverage | null = null;
    let localSteps: AgentStep[] = [];

    try {
      const customKey = typeof window !== 'undefined' ? localStorage.getItem('veritas_ai_key') : null;
      const customBase = typeof window !== 'undefined' ? localStorage.getItem('veritas_ai_base_url') : null;
      const customModel = typeof window !== 'undefined' ? localStorage.getItem('veritas_ai_model') : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          documentIds: [documentId],
          message: userText,
          apiKey: customKey || undefined,
          baseUrl: customBase || undefined,
          model: customModel || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          try {
            const errText = await response.text();
            if (errText) errorMsg = errText.substring(0, 300);
          } catch {}
        }
        if (response.status === 404) {
          errorMsg = `${errorMsg}. In serverless hosting, ephemeral instances can restart without a persistent database. Please re-select or reload the document from Document Library.`;
        } else if (response.status === 504) {
          errorMsg = `Analysis timed out (${response.status}). The document is extremely large (895+ pages). Please try a targeted question.`;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;

            try {
              const event = JSON.parse(dataStr);

              if (event.type === 'agent_step') {
                localSteps.push(event.step);
                setActiveSteps([...localSteps]);
              } else if (event.type === 'token') {
                partialAnswer += event.token;
                setMessages(prev => {
                  const existingIdx = prev.findIndex(m => m.id === assistantMsgId);
                  const updatedMsg: ChatMessage = {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: partialAnswer,
                    quotes: currentQuotes,
                    coverage: currentCoverage,
                    agentSteps: [...localSteps],
                    createdAt: new Date().toISOString(),
                  };
                  if (existingIdx !== -1) {
                    const copy = [...prev];
                    copy[existingIdx] = updatedMsg;
                    return copy;
                  }
                  return [...prev, updatedMsg];
                });
              } else if (event.type === 'coverage') {
                currentCoverage = event.coverage;
              } else if (event.type === 'verified_quotes') {
                currentQuotes = event.quotes;
                setMessages(prev => {
                  const existingIdx = prev.findIndex(m => m.id === assistantMsgId);
                  if (existingIdx !== -1) {
                    const copy = [...prev];
                    copy[existingIdx].quotes = currentQuotes;
                    return copy;
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.error('Error parsing SSE event:', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('User manually aborted streaming generation.');
      } else {
        console.error('Streaming error:', err);
        setMessages(prev => [
          ...prev,
          {
            id: 'err_' + Date.now(),
            role: 'assistant',
            content: `An error occurred while researching: ${err.message}`,
          },
        ]);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const toggleSteps = (msgId: string) => {
    setExpandedStepsMap(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-900 truncate">Agentic Research Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">Part C Opt. 2</span>
        </div>

        {/* Chat History Selector & New Chat */}
        <div className="flex items-center space-x-2">
          {chats.length > 1 && (
            <select
              value={activeChatId || ''}
              onChange={e => setActiveChatId(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-hidden"
            >
              {chats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={createNewChat}
            className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isGenerating && (
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mx-auto mb-3 border border-slate-200">
              <Scale className="w-5 h-5 text-slate-700" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Ask any question about this contract</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Answers are grounded strictly in document text and backed by verified verbatim quotes.
            </p>
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-md mx-auto">
              {[
                'What is the limitation of liability cap?',
                'Under what conditions can this contract be terminated?',
                'What are the payment and fee terms?',
                'What governing law applies to disputes?',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputPrompt(suggestion);
                  }}
                  className="text-[11px] text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-3 py-1 transition-colors text-left"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const steps = msg.agentSteps || [];
          const hasSteps = steps.length > 0;
          const isExpanded = expandedStepsMap[msg.id] ?? false;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              {/* Agent Step-by-Step Tool Activity (Part C - Option 2) */}
              {!isUser && hasSteps && (
                <div className="w-full max-w-xl mb-1">
                  <div
                    onClick={() => toggleSteps(msg.id)}
                    className="cursor-pointer inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-100/90 hover:bg-slate-200 border border-slate-200/80 text-[11px] text-slate-700 font-mono transition-colors"
                  >
                    <BookOpen className="w-3 h-3 text-slate-600" />
                    <span>Agent Research Loop ({steps.length} tool {steps.length === 1 ? 'call' : 'calls'})</span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>

                  {isExpanded && (
                    <div className="mt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono space-y-1.5 text-slate-700">
                      {steps.map((st, i) => (
                        <div key={i} className="flex items-start space-x-2">
                          <span className="text-slate-400 shrink-0">#{st.stepNumber}</span>
                          <span className="font-semibold text-slate-800">{st.tool}:</span>
                          <span className="text-slate-600">{st.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-xl rounded-xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200/70'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-[10px] text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-slate-700">Analysis</span>
                    <button
                      onClick={() => handleExportMessage(msg)}
                      className="inline-flex items-center space-x-1 hover:text-slate-900 cursor-pointer transition-colors"
                      title="Export report with citations"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export Report</span>
                    </button>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Coverage Transparency Metric (Requirement 4) */}
                {!isUser && msg.coverage && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center space-x-1.5">
                    <span className="font-medium text-slate-700">Coverage:</span>
                    <span>{msg.coverage.coverageNotice}</span>
                  </div>
                )}
              </div>

              {/* Verified Quotes Cards (Requirement 3 & 5) */}
              {!isUser && msg.quotes && msg.quotes.length > 0 && (
                <div className="w-full max-w-xl space-y-1.5 mt-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-1">
                    Supporting Quotes ({msg.quotes.length})
                  </div>
                  {msg.quotes.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        q.verified
                          ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                          : 'bg-amber-50/70 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5">
                          {q.verified ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified Quote</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              <span>Unverified / Paraphrased</span>
                            </span>
                          )}

                          {q.pageNumber && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Page {q.pageNumber}
                            </span>
                          )}
                          {q.documentName && (
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                              • {q.documentName}
                            </span>
                          )}
                        </div>

                        {q.verified && (
                          <button
                            onClick={() => onSelectCitation(q)}
                            className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 underline decoration-emerald-400 cursor-pointer"
                          >
                            <span>Locate in Text</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <blockquote className="font-serif italic text-slate-800 text-[12px] pl-2 border-l-2 border-slate-300 mt-1">
                        "{q.matchedText || q.quote}"
                      </blockquote>

                      {!q.verified && q.reason && (
                        <p className="text-[10px] text-amber-800 mt-1 font-sans flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{q.reason}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Live Active Research Steps while Generating */}
        {isGenerating && activeSteps.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-1.5 animate-pulse max-w-xl">
            <div className="flex items-center space-x-2 text-slate-800 font-semibold text-[11px]">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
              <span>Agentic Research in progress...</span>
            </div>
            {activeSteps.map((st, i) => (
              <div key={i} className="text-slate-600 text-[11px] flex items-center space-x-2">
                <span className="text-slate-400">Step {st.stepNumber}:</span>
                <span>{st.message}</span>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / Control Bar */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder={isGenerating ? 'AI is investigating contract...' : 'Ask about terms, liability, termination...'}
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            disabled={isGenerating}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-slate-900 focus:outline-hidden focus:border-slate-400 focus:bg-white transition-all disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={isGenerating}
            className={`p-2 rounded-md transition-colors ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            } disabled:opacity-40`}
            title={isListening ? 'Listening... click to stop' : 'Dictate question via voice'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-medium transition-colors"
              title="Stop answer generation (keeps partial content)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="p-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
