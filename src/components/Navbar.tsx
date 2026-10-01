'use client';

import React from 'react';
import { FileText, MessageSquare, Layers, GitCompare, Sparkles, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'library' | 'chat' | 'multi' | 'compare';
  setActiveTab: (tab: 'library' | 'chat' | 'multi' | 'compare') => void;
  documentCount: number;
  onSeedSamples: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  onSeedSamples,
  isSeeding,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('library')}>
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-900 tracking-tight text-base font-serif">VERITAS</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200">
                  LEGAL AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Verified Contract Analysis & Comparison</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === 'library'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Document Library</span>
              {documentCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'library' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {documentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contract Chat & Viewer</span>
            </button>

            <button
              onClick={() => setActiveTab('multi')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === 'multi'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Multi-Document Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === 'compare'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>Contract Comparison</span>
            </button>
          </nav>

          {/* Action / Seed Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onSeedSamples}
              disabled={isSeeding}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md shadow-xs transition-colors disabled:opacity-50"
              title="Preloads sample contracts (PDF, DOCX v1 & v2, and Scanned test PDF)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{isSeeding ? 'Loading Samples...' : 'Load Sample Contracts'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
