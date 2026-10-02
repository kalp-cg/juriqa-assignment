'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Search,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  List,
  Eye,
  CheckCircle,
  Maximize2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { DocumentPage } from '@/lib/quoteVerifier';
import { ExtractedClause } from '@/lib/documentProcessor';

interface DocumentViewerProps {
  document: {
    id: string;
    filename: string;
    filetype: 'pdf' | 'docx';
    total_pages: number;
    total_words: number;
    pages: DocumentPage[];
    clauses: ExtractedClause[];
  } | null;
  activeCitation?: {
    quote: string;
    pageNumber?: number;
    endPageNumber?: number;
    startOffset?: number;
    endOffset?: number;
  } | null;
  onClearCitation?: () => void;
  isLoading?: boolean;
  activeDocSummary?: any;
  onRetry?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  activeCitation,
  onClearCitation,
  isLoading = false,
  activeDocSummary,
  onRetry,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showClauses, setShowClauses] = useState<boolean>(false);
  const highlightedRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // When a verified citation is clicked, auto-navigate to that page and scroll to it
  useEffect(() => {
    if (activeCitation?.pageNumber && document) {
      setCurrentPage(activeCitation.pageNumber);
      setTimeout(() => {
        if (highlightedRef.current) {
          highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [activeCitation, document]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <div className="max-w-sm flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
          <h4 className="text-sm font-semibold text-slate-700">Loading document pages...</h4>
          <p className="text-xs text-slate-500 mt-1">Extracting page layout and indexing clauses for verification.</p>
        </div>
      </div>
    );
  }

  if (!document) {
    if (activeDocSummary) {
      return (
        <div className="h-full flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <div className="max-w-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mx-auto text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">{activeDocSummary.filename}</h4>
            <p className="text-xs text-slate-500 font-mono">
              {activeDocSummary.total_pages} {activeDocSummary.total_pages === 1 ? 'Page' : 'Pages'} • {activeDocSummary.total_words?.toLocaleString()} Words
            </p>
            <p className="text-xs text-slate-400">
              Contract record is active in session. If full page contents are syncing from the server, click below to load pages.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Contract Pages</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <div className="max-w-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No contract selected</h4>
          <p className="text-xs text-slate-500 mt-1">Select an uploaded contract from the library to inspect its clauses and page text.</p>
        </div>
      </div>
    );
  }

  const activePageObj = document.pages.find(p => p.pageNumber === currentPage) || document.pages[0];

  // Highlight helper for active citation or search
  const renderHighlightedText = (pageText: string) => {
    if (activeCitation?.quote) {
      // Clean target quote
      const cleanQ = activeCitation.quote.trim().replace(/^["'“‘]+|["'”’]+$/g, '');
      const words = cleanQ.split(/\s+/).filter(w => w.length > 2);

      // Check if this page contains the quote or key fragments
      const normPage = pageText.toLowerCase();
      const normQ = cleanQ.toLowerCase();

      // Direct normalized match
      const directIdx = normPage.indexOf(normQ);
      if (directIdx !== -1) {
        const before = pageText.substring(0, directIdx);
        const match = pageText.substring(directIdx, directIdx + cleanQ.length);
        const after = pageText.substring(directIdx + cleanQ.length);

        return (
          <span className="whitespace-pre-wrap leading-relaxed font-serif text-slate-800 text-[13.5px]">
            {before}
            <span
              ref={highlightedRef}
              className="citation-highlight-active inline bg-amber-200 border-b-2 border-amber-500 text-slate-950 font-medium px-1 shadow-xs"
            >
              {match}
              <span className="inline-flex items-center space-x-1 ml-1.5 px-1.5 py-0.5 text-[10px] font-sans font-bold bg-slate-900 text-white rounded">
                <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                <span>Verified Source</span>
              </span>
            </span>
            {after}
          </span>
        );
      }

      // Multi-word sequence match across line breaks
      if (words.length >= 3) {
        const firstWord = words[0].toLowerCase();
        const lastWord = words[words.length - 1].toLowerCase();
        const firstIdx = normPage.indexOf(firstWord);
        const lastIdx = normPage.indexOf(lastWord, firstIdx > -1 ? firstIdx : 0);

        if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx && lastIdx - firstIdx < cleanQ.length + 150) {
          const before = pageText.substring(0, firstIdx);
          const match = pageText.substring(firstIdx, lastIdx + words[words.length - 1].length);
          const after = pageText.substring(lastIdx + words[words.length - 1].length);

          return (
            <span className="whitespace-pre-wrap leading-relaxed font-serif text-slate-800 text-[13.5px]">
              {before}
              <span
                ref={highlightedRef}
                className="citation-highlight-active inline bg-amber-200 border-b-2 border-amber-500 text-slate-950 font-medium px-1 shadow-xs"
              >
                {match}
                <span className="inline-flex items-center space-x-1 ml-1.5 px-1.5 py-0.5 text-[10px] font-sans font-bold bg-slate-900 text-white rounded">
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Verified Source</span>
                </span>
              </span>
              {after}
            </span>
          );
        }
      }
    }

    // Keyword search highlight fallback
    if (searchTerm && searchTerm.length > 2) {
      const parts = pageText.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return (
        <span className="whitespace-pre-wrap leading-relaxed font-serif text-slate-800 text-[13.5px]">
          {parts.map((part, i) =>
            part.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="bg-yellow-200 text-slate-950 px-0.5 rounded">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    }

    return (
      <span className="whitespace-pre-wrap leading-relaxed font-serif text-slate-800 text-[13.5px]">
        {pageText}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Viewer Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-900 truncate">{document.filename}</h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {document.total_pages} {document.total_pages === 1 ? 'page' : 'pages'} • {document.clauses.length} clauses
            </p>
          </div>
        </div>

        {/* Controls: Search, Clauses Drawer toggle, Pagination */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contract..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-md w-36 focus:w-44 focus:outline-hidden focus:border-slate-400 transition-all"
            />
          </div>

          {/* Clause outline button */}
          <button
            onClick={() => setShowClauses(!showClauses)}
            className={`p-1.5 rounded-md border text-xs font-medium flex items-center space-x-1 transition-colors ${
              showClauses
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle clause outline"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Clauses</span>
          </button>

          {/* Page controls */}
          <div className="flex items-center space-x-1 border border-slate-200 rounded-md bg-white p-0.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-700">
              {currentPage}/{document.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(document.total_pages, p + 1))}
              disabled={currentPage >= document.total_pages}
              className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Citation Notification Banner */}
      {activeCitation && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 gap-2">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-semibold shrink-0">Active Citation:</span>
            <span className="truncate italic font-serif">"{activeCitation.quote}"</span>
            {activeCitation.endPageNumber && activeCitation.endPageNumber > (activeCitation.pageNumber || 1) ? (
              <span className="inline-flex items-center space-x-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] font-semibold">
                  Spans Pages {activeCitation.pageNumber} – {activeCitation.endPageNumber}
                </span>
                {currentPage !== activeCitation.pageNumber && (
                  <button
                    onClick={() => setCurrentPage(activeCitation.pageNumber!)}
                    className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-950 font-sans text-[10px] font-medium border border-amber-300"
                  >
                    Go to Page {activeCitation.pageNumber}
                  </button>
                )}
                {currentPage !== activeCitation.endPageNumber && (
                  <button
                    onClick={() => setCurrentPage(activeCitation.endPageNumber!)}
                    className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-950 font-sans text-[10px] font-medium border border-amber-300"
                  >
                    Go to Page {activeCitation.endPageNumber}
                  </button>
                )}
              </span>
            ) : activeCitation.pageNumber ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] shrink-0 font-semibold">
                Page {activeCitation.pageNumber}
              </span>
            ) : null}
          </div>
          {onClearCitation && (
            <button
              onClick={onClearCitation}
              className="text-amber-700 hover:text-amber-950 font-bold px-1.5 shrink-0"
              title="Clear highlight"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Main Body: Document Viewport + Clause Drawer */}
      <div className="flex-1 flex overflow-hidden relative" ref={viewerContainerRef}>
        {/* Clause Navigator Sidebar (collapsible) */}
        {showClauses && (
          <div className="w-64 border-r border-slate-200 bg-slate-50/80 p-3 overflow-y-auto shrink-0 space-y-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Table of Clauses
            </h4>
            {document.clauses.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setCurrentPage(c.pageNumber);
                  setShowClauses(false);
                }}
                className={`w-full text-left p-2 rounded text-xs transition-colors ${
                  currentPage === c.pageNumber
                    ? 'bg-slate-200/80 font-medium text-slate-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-mono text-[11px] text-slate-500">
                  Section {c.number} (p. {c.pageNumber})
                </div>
                <div className="truncate font-medium mt-0.5">{c.title}</div>
              </button>
            ))}
          </div>
        )}

        {/* Page Content Rendered */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/40">
          <div className="max-w-2xl mx-auto bg-white p-8 md:p-10 border border-slate-200/80 rounded-lg shadow-sm min-h-full">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6 text-[11px] font-mono text-slate-400">
              <span>{document.filename}</span>
              <span>PAGE {currentPage} OF {document.total_pages}</span>
            </div>

            {/* Page Text with Highlight */}
            <div className="prose prose-slate max-w-none text-slate-800">
              {activePageObj ? (
                renderHighlightedText(activePageObj.text)
              ) : (
                <p className="text-slate-400 text-xs italic">Empty page</p>
              )}
            </div>

            {/* Page Footer */}
            <div className="mt-12 pt-4 border-t border-slate-100 text-center text-[10px] font-mono text-slate-400">
              — End of Page {currentPage} —
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
