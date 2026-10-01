'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { DocumentLibrary, DocumentSummary } from '@/components/DocumentLibrary';
import { DocumentViewer } from '@/components/DocumentViewer';
import { ChatInterface } from '@/components/ChatInterface';
import { MultiDocumentChat } from '@/components/MultiDocumentChat';
import { DocumentComparison } from '@/components/DocumentComparison';
import { VerifiedQuote } from '@/lib/quoteVerifier';
import { AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'library' | 'chat' | 'multi' | 'compare'>('library');
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocData, setActiveDocData] = useState<any | null>(null);
  const [activeCitation, setActiveCitation] = useState<{
    quote: string;
    pageNumber?: number;
    endPageNumber?: number;
    startOffset?: number;
    endOffset?: number;
  } | null>(null);

  const [compareDocA, setCompareDocA] = useState<string | undefined>();
  const [compareDocB, setCompareDocB] = useState<string | undefined>();
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load document list
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success && data.documents) {
        setDocuments(data.documents);
        // Default to first ready document if none selected
        if (!activeDocId && data.documents.length > 0) {
          const ready = data.documents.find((d: any) => d.status === 'ready');
          if (ready) {
            setActiveDocId(ready.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch full details for the active document (pages, clauses, raw text)
  useEffect(() => {
    if (!activeDocId) {
      setActiveDocData(null);
      return;
    }

    const fetchDocDetails = async () => {
      try {
        const res = await fetch(`/api/documents/${activeDocId}`);
        const data = await res.json();
        if (data.success && data.document) {
          setActiveDocData(data.document);
        }
      } catch (err) {
        console.error('Failed to load active document details:', err);
      }
    };

    fetchDocDetails();
  }, [activeDocId]);

  const handleOpenDocument = (docId: string) => {
    setActiveDocId(docId);
    setActiveCitation(null);
    setActiveTab('chat');
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      setNotification({ text: 'Contract deleted from repository.', type: 'success' });
      fetchDocuments();
      if (activeDocId === docId) {
        setActiveDocId(null);
        setActiveDocData(null);
      }
    } catch (e) {
      setNotification({ text: 'Failed to delete contract.', type: 'error' });
    }
  };

  const handleCompareWith = (docAId: string, docBId?: string) => {
    setCompareDocA(docAId);
    setCompareDocB(docBId);
    setActiveTab('compare');
  };

  const handleSelectCitation = (quote: VerifiedQuote) => {
    setActiveCitation({
      quote: quote.matchedText || quote.quote,
      pageNumber: quote.pageNumber,
      endPageNumber: quote.endPageNumber,
      startOffset: quote.startOffset,
      endOffset: quote.endOffset,
    });
    setActiveTab('chat');
  };

  const handleOpenDocWithQuote = (docId: string, quote: VerifiedQuote) => {
    setActiveDocId(docId);
    setActiveCitation({
      quote: quote.matchedText || quote.quote,
      pageNumber: quote.pageNumber,
      endPageNumber: quote.endPageNumber,
      startOffset: quote.startOffset,
      endOffset: quote.endOffset,
    });
    setActiveTab('chat');
  };

  const handleSeedSamples = async () => {
    try {
      setIsSeeding(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification({
          text: 'Loaded sample contracts: Searchable SaaS PDF, DOCX v1 & v2, and Scanned test PDF.',
          type: 'success',
        });
        await fetchDocuments();
      }
    } catch (err) {
      setNotification({ text: 'Error seeding samples.', type: 'error' });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Executive Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        onSeedSamples={handleSeedSamples}
        isSeeding={isSeeding}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className="max-w-xl mx-auto mt-3 px-4 w-full z-50">
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Views */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: Document Library */}
        {activeTab === 'library' && (
          <DocumentLibrary
            documents={documents}
            onOpenDocument={handleOpenDocument}
            onDeleteDocument={handleDeleteDocument}
            onRefresh={fetchDocuments}
            onCompareWith={handleCompareWith}
          />
        )}

        {/* VIEW 2: Split Screen Analysis & Chat (Document Viewer + Verified Streaming Chat) */}
        {activeTab === 'chat' && (
          <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col">
            {/* Top Bar for Switch Document */}
            <div className="flex items-center justify-between mb-3 bg-white px-4 py-2 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-700">Active Document:</span>
                <select
                  value={activeDocId || ''}
                  onChange={e => {
                    setActiveDocId(e.target.value);
                    setActiveCitation(null);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-medium focus:outline-hidden"
                >
                  {documents
                    .filter(d => d.status === 'ready')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.filetype.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              {activeDocData && (
                <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
                  {activeDocData.total_pages} {activeDocData.total_pages === 1 ? 'Page' : 'Pages'} • {activeDocData.total_words?.toLocaleString()} Words • {activeDocData.clauses?.length || 0} Clauses
                </div>
              )}
            </div>

            {/* Split Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px] pb-6">
              {/* Left Column: Interactive Document Viewer (7 cols) */}
              <div className="lg:col-span-7 h-[680px]">
                <DocumentViewer
                  document={activeDocData}
                  activeCitation={activeCitation}
                  onClearCitation={() => setActiveCitation(null)}
                />
              </div>

              {/* Right Column: Streaming Chat Interface (5 cols) */}
              <div className="lg:col-span-5 h-[680px]">
                {activeDocId ? (
                  <ChatInterface
                    documentId={activeDocId}
                    documentTitle={activeDocData?.filename || 'Document'}
                    onSelectCitation={handleSelectCitation}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-8 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Please select a ready contract from the dropdown to start chatting.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Multi-Document Analysis */}
        {activeTab === 'multi' && (
          <MultiDocumentChat
            documents={documents}
            onOpenDocWithQuote={handleOpenDocWithQuote}
          />
        )}

        {/* VIEW 4: Contract Version Comparison */}
        {activeTab === 'compare' && (
          <DocumentComparison
            documents={documents}
            preselectedDocA={compareDocA}
            preselectedDocB={compareDocB}
          />
        )}
      </main>
    </div>
  );
}
