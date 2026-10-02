'use client';

import React, { useState } from 'react';
import {
  Layers,
  Send,
  Square,
  CheckCircle2,
  ShieldAlert,
  ExternalLink,
  FileText,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { DocumentSummary } from './DocumentLibrary';
import { VerifiedQuote } from '@/lib/quoteVerifier';

interface MultiDocumentChatProps {
  documents: DocumentSummary[];
  onOpenDocWithQuote: (docId: string, quote: VerifiedQuote) => void;
}

/**
 * Animated 3-Layer Icon representing dynamic cross-document synthesis.
 * When request is in flight and answers form, each layer animates in an accordion cascade.
 */
const AnimatedLayersIcon: React.FC<{ isSynthesizing: boolean }> = ({ isSynthesizing }) => {
  return (
    <div
      className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
        isSynthesizing
          ? 'bg-slate-900 text-white shadow-md animate-layer-box ring-2 ring-slate-800/30'
          : 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}
      title={isSynthesizing ? 'Actively cross-analyzing documents' : 'Cross-Document Synthesis'}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="overflow-visible"
      >
        {/* Top Layer Sheet */}
        <polygon
          points="12 2 2 7 12 12 22 7 12 2"
          className={isSynthesizing ? 'animate-layer-top stroke-white' : 'stroke-current'}
        />
        {/* Middle Layer Sheet */}
        <polyline
          points="2 12 12 17 22 12"
          className={isSynthesizing ? 'animate-layer-mid stroke-slate-300' : 'stroke-current opacity-80'}
        />
        {/* Bottom Layer Sheet */}
        <polyline
          points="2 17 12 22 22 17"
          className={isSynthesizing ? 'animate-layer-bottom stroke-slate-400' : 'stroke-current opacity-60'}
        />
      </svg>
    </div>
  );
};

export const MultiDocumentChat: React.FC<MultiDocumentChatProps> = ({
  documents,
  onOpenDocWithQuote,
}) => {
  const readyDocs = documents.filter(d => d.status === 'ready');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() =>
    readyDocs.slice(0, 2).map(d => d.id)
  );
  const [question, setQuestion] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string>('');
  const [quotes, setQuotes] = useState<VerifiedQuote[]>([]);
  const [activeSteps, setActiveSteps] = useState<any[]>([]);
  const [showSteps, setShowSteps] = useState<boolean>(false);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRunMultiDocQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || selectedDocIds.length < 2 || isSynthesizing) return;

    setIsSynthesizing(true);
    setAnswer('');
    setQuotes([]);
    setActiveSteps([]);

    const chatId = 'multi_chat_' + Date.now();
    let partial = '';

    try {
      const customKey = typeof window !== 'undefined' ? localStorage.getItem('veritas_ai_key') : null;
      const customBase = typeof window !== 'undefined' ? localStorage.getItem('veritas_ai_base_url') : null;
      const customModel = typeof window !== 'undefined' ? localStorage.getItem('veritas_ai_model') : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          documentIds: selectedDocIds,
          message: `Compare across the selected contracts: ${question.trim()}`,
          apiKey: customKey || undefined,
          baseUrl: customBase || undefined,
          model: customModel || undefined,
        }),
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
                setActiveSteps(prev => [...prev, event.step]);
              } else if (event.type === 'token') {
                partial += event.token;
                setAnswer(partial);
              } else if (event.type === 'verified_quotes') {
                setQuotes(event.quotes || []);
              }
            } catch (err) {}
          }
        }
      }
    } catch (err: any) {
      setAnswer(`Error during multi-document synthesis: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Multi-Document Analysis</h1>
        <p className="text-sm text-slate-600 mt-1">
          Select multiple contracts to compare clauses, exposure limits, and governing laws with source-attributed quotes.
        </p>
      </div>

      {/* Contract Selector Checkboxes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
          Select Contracts to Compare ({selectedDocIds.length} selected)
        </h3>

        {readyDocs.length < 2 ? (
          <p className="text-xs text-slate-500 italic">
            You need at least 2 ready contracts in your library to run multi-document comparisons. Upload or load sample contracts.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {readyDocs.map(doc => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDocSelection(doc.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start space-x-3 ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">{doc.filename}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'} • {doc.filetype.toUpperCase()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Query Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Comparative Question Across Selected Contracts
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Compare the limitation of liability cap and governing law jurisdiction between these contracts"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={isSynthesizing || selectedDocIds.length < 2}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-slate-900 focus:outline-hidden focus:border-slate-400 focus:bg-white"
            />
            <button
              onClick={handleRunMultiDocQuery}
              disabled={isSynthesizing || !question.trim() || selectedDocIds.length < 2}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors disabled:opacity-40"
            >
              {isSynthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSynthesizing ? 'Analyzing...' : 'Synthesize'}</span>
            </button>
          </div>
        </div>

        {/* Preset prompts */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[11px] text-slate-500 self-center">Suggested queries:</span>
          {[
            'Compare the liability caps and damage exclusions',
            'Compare the termination notice periods and cure rights',
            'Compare dispute resolution and arbitration seats',
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setQuestion(preset)}
              className="text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Synthesis Results & Attributed Quotes */}
      {(answer || isSynthesizing) && (
        <div className="relative bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6 overflow-hidden">
          {/* Top animated indeterminate shimmer bar during synthesis */}
          {isSynthesizing && (
            <div className="h-1 w-full bg-slate-100 overflow-hidden rounded-t-xl absolute top-0 left-0">
              <div className="h-full bg-slate-900 animate-shimmer-bar w-1/3 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <AnimatedLayersIcon isSynthesizing={isSynthesizing} />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>Comparative Cross-Document Synthesis</span>
                  {isSynthesizing && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-ping" />
                      Live Analysis
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {isSynthesizing
                    ? activeSteps.length > 0
                      ? activeSteps[activeSteps.length - 1].message
                      : `Evaluating ${selectedDocIds.length} selected contracts in parallel...`
                    : `Evaluated ${selectedDocIds.length} contracts • ${quotes.filter(q => q.verified).length} of ${quotes.length} citations verified`}
                </p>
              </div>
            </div>

            {/* Steps & Status summary */}
            <div className="flex items-center gap-2">
              {activeSteps.length > 0 && (
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                >
                  <Activity className="w-3 h-3 text-slate-600" />
                  <span>Research Trail ({activeSteps.length})</span>
                  {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Research Trail Steps */}
          {showSteps && activeSteps.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Real-Time Document Inspection Trail
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {activeSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-700 bg-white p-2 rounded border border-slate-100">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 shrink-0">
                      #{step.stepNumber || idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 shrink-0">{step.tool}:</span>
                    <span className="text-slate-600 truncate flex-1">{step.message || JSON.stringify(step.input)}</span>
                    {step.timestamp && <span className="text-[10px] text-slate-400 shrink-0">{step.timestamp}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer text area */}
          <div className="prose prose-slate max-w-none text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
            {isSynthesizing && !answer ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                  <span>Cross-referencing clauses and synthesizing comparative overview across {selectedDocIds.length} documents...</span>
                </div>
                <div className="space-y-2 max-w-md pt-1">
                  <div className="h-2.5 bg-slate-100 rounded-full animate-pulse w-full" />
                  <div className="h-2.5 bg-slate-100 rounded-full animate-pulse w-5/6" />
                  <div className="h-2.5 bg-slate-100 rounded-full animate-pulse w-3/5" />
                </div>
              </div>
            ) : (
              <>
                {answer}
                {isSynthesizing && (
                  <span className="inline-block w-1.5 h-3.5 bg-slate-900 ml-1 animate-pulse align-middle" />
                )}
              </>
            )}
          </div>

          {/* Attributed Quotes List */}
          {quotes.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Source Document Citations ({quotes.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quotes.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                      q.verified
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-slate-900 truncate flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{q.documentName || 'Contract'}</span>
                        </span>
                        {q.verified ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </div>
                      <blockquote className="font-serif italic text-slate-800 text-[12px] pl-2 border-l-2 border-slate-300">
                        "{q.matchedText || q.quote}"
                      </blockquote>
                      {q.pageNumber && (
                        <p className="text-[10px] text-slate-500 font-mono mt-1">Page {q.pageNumber}</p>
                      )}
                    </div>

                    {q.verified && q.documentId && (
                      <button
                        onClick={() => onOpenDocWithQuote(q.documentId!, q)}
                        className="mt-2 pt-2 border-t border-slate-200/50 inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950"
                      >
                        <span>Open in Document Viewer</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
