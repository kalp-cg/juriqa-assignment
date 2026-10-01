'use client';

import React, { useState } from 'react';
import {
  GitCompare,
  ArrowRight,
  Filter,
  AlertTriangle,
  Info,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { DocumentSummary } from './DocumentLibrary';
import { ClauseDiff, ComparisonResult, SignificanceLevel } from '@/lib/comparisonEngine';

interface DocumentComparisonProps {
  documents: DocumentSummary[];
  preselectedDocA?: string;
  preselectedDocB?: string;
}

export const DocumentComparison: React.FC<DocumentComparisonProps> = ({
  documents,
  preselectedDocA,
  preselectedDocB,
}) => {
  const readyDocs = documents.filter(d => d.status === 'ready');

  const [docAId, setDocAId] = useState<string>(() => {
    if (preselectedDocA) return preselectedDocA;
    return readyDocs[0]?.id || '';
  });

  const [docBId, setDocBId] = useState<string>(() => {
    if (preselectedDocB) return preselectedDocB;
    return readyDocs[1]?.id || (readyDocs[0]?.id || '');
  });

  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [significanceFilter, setSignificanceFilter] = useState<'all' | SignificanceLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'modified' | 'added' | 'removed'>('all');
  const [sortBy, setSortBy] = useState<'significance' | 'order'>('significance');

  const handleRunComparison = async () => {
    if (!docAId || !docBId || docAId === docBId) return;

    try {
      setIsComparing(true);
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docAId, docBId }),
      });
      const data = await res.json();
      if (data.success && data.comparison) {
        setResult(data.comparison);
      }
    } catch (err) {
      console.error('Failed to run comparison:', err);
    } finally {
      setIsComparing(false);
    }
  };

  // Filter and sort diffs
  let displayedDiffs: ClauseDiff[] = [];
  if (result) {
    displayedDiffs = result.diffs.filter(d => d.status !== 'unchanged');

    if (significanceFilter !== 'all') {
      displayedDiffs = displayedDiffs.filter(d => d.significance === significanceFilter);
    }

    if (statusFilter !== 'all') {
      displayedDiffs = displayedDiffs.filter(d => d.status === statusFilter);
    }

    if (sortBy === 'significance') {
      const order = { high: 1, medium: 2, low: 3 };
      displayedDiffs.sort((a, b) => order[a.significance] - order[b.significance]);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Contract Version Comparison</h1>
        <p className="text-sm text-slate-600 mt-1">
          Perform substantive clause-level diffing between two contract versions. Identifies legal impact beyond mere word changes.
        </p>
      </div>

      {/* Version Pickers Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Version 1 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Base Contract (Version 1 / Original)
            </label>
            <select
              value={docAId}
              onChange={e => setDocAId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-2.5 text-slate-800 focus:outline-hidden focus:border-slate-400"
            >
              <option value="">Select Base Contract...</option>
              {readyDocs.map(d => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.filetype.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Version 2 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amended Contract (Version 2 / Revised)
            </label>
            <select
              value={docBId}
              onChange={e => setDocBId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-2.5 text-slate-800 focus:outline-hidden focus:border-slate-400"
            >
              <option value="">Select Revised Contract...</option>
              {readyDocs.map(d => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.filetype.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            {docAId === docBId && docAId
              ? 'Please choose two different contract files to compare changes.'
              : 'Evaluates changes in liability caps, termination rights, indemnity, and governing laws.'}
          </p>
          <button
            onClick={handleRunComparison}
            disabled={isComparing || !docAId || !docBId || docAId === docBId}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors disabled:opacity-40"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{isComparing ? 'Diffing Contracts...' : 'Compare Contracts'}</span>
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {result && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Executive Briefing
                </span>
                <h3 className="text-base font-serif font-bold text-slate-900">
                  {result.docA.filename} vs {result.docB.filename}
                </h3>
              </div>

              {/* Significance Count Badges */}
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <span>{result.highCount} High</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span>{result.mediumCount} Medium</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <span>{result.lowCount} Low</span>
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {result.summary}
            </div>
          </div>

          {/* Filter & Sort Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* Filter by Significance */}
            <div className="flex items-center space-x-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Significance:</span>
              {(['all', 'high', 'medium', 'low'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSignificanceFilter(lvl)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    significanceFilter === lvl
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Sort Order */}
            <div className="flex items-center space-x-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Sort:</span>
              <button
                onClick={() => setSortBy('significance')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  sortBy === 'significance' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Significance
              </button>
              <button
                onClick={() => setSortBy('order')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  sortBy === 'order' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Document Order
              </button>
            </div>
          </div>

          {/* Clause Diff Cards */}
          <div className="space-y-4">
            {displayedDiffs.length === 0 ? (
              <div className="bg-white p-8 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No differences match the current filter selection.
              </div>
            ) : (
              displayedDiffs.map(diff => {
                const isHigh = diff.significance === 'high';
                const isMedium = diff.significance === 'medium';

                return (
                  <div
                    key={diff.id}
                    className={`bg-white border rounded-xl p-5 shadow-2xs space-y-3 transition-all ${
                      isHigh
                        ? 'border-rose-200 hover:border-rose-300'
                        : isMedium
                        ? 'border-amber-200 hover:border-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Diff Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                              isHigh
                                ? 'bg-rose-100 text-rose-800'
                                : isMedium
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {diff.significance} Significance
                          </span>

                          <span className="text-[11px] font-mono text-slate-500">
                            Section {diff.clauseNumber}
                          </span>

                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                              diff.status === 'added'
                                ? 'bg-emerald-100 text-emerald-800'
                                : diff.status === 'removed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {diff.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 mt-1">{diff.clauseTitle}</h4>
                      </div>
                    </div>

                    {/* Substantive Explanation */}
                    <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-xs text-slate-700 leading-relaxed flex items-start space-x-2">
                      <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Substantive Impact: </span>
                        {diff.explanation}
                      </div>
                    </div>

                    {/* Word-level and Side-by-Side Clause Text Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      {/* Version 1 */}
                      <div className="p-3 rounded-lg bg-rose-50/40 border border-rose-100 space-y-1">
                        <div className="text-[10px] font-bold font-mono text-rose-800 uppercase flex items-center space-x-1">
                          <MinusCircle className="w-3 h-3" />
                          <span>Version 1 (Original)</span>
                        </div>
                        <div className="text-slate-700 font-serif leading-relaxed">
                          {diff.textA || <span className="italic text-slate-400">Clause did not exist in v1</span>}
                        </div>
                      </div>

                      {/* Version 2 */}
                      <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100 space-y-1">
                        <div className="text-[10px] font-bold font-mono text-emerald-800 uppercase flex items-center space-x-1">
                          <PlusCircle className="w-3 h-3" />
                          <span>Version 2 (Amended)</span>
                        </div>
                        <div className="text-slate-700 font-serif leading-relaxed">
                          {diff.wordDiff ? (
                            <span>
                              {diff.wordDiff.map((part, i) => (
                                <span
                                  key={i}
                                  className={
                                    part.added
                                      ? 'bg-emerald-200 text-emerald-950 font-medium px-0.5 rounded'
                                      : part.removed
                                      ? 'bg-rose-200 line-through text-rose-900 px-0.5 rounded'
                                      : ''
                                  }
                                >
                                  {part.value}
                                </span>
                              ))}
                            </span>
                          ) : (
                            diff.textB || <span className="italic text-slate-400">Clause deleted in v2</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
