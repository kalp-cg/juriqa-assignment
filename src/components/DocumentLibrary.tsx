'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  FileCode,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';

export interface DocumentSummary {
  id: string;
  filename: string;
  filetype: 'pdf' | 'docx';
  filesize: number;
  total_pages: number;
  total_words: number;
  clauses_json?: string;
  created_at: string;
  status: 'processing' | 'ready' | 'error';
  error_message?: string | null;
}

interface DocumentLibraryProps {
  documents: DocumentSummary[];
  onOpenDocument: (docId: string, initialData?: any) => void;
  onDeleteDocument: (docId: string) => void;
  onRefresh: () => void;
  onCompareWith: (docAId: string, docBId?: string) => void;
  onShowNotification?: (text: string, type: 'success' | 'error') => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  onOpenDocument,
  onDeleteDocument,
  onRefresh,
  onCompareWith,
  onShowNotification,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // Immediate extension validation
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setUploadError(
        `Invalid file type "${file.name}". Veritas Legal AI accepts only PDF (.pdf) and Microsoft Word (.docx) contracts. Other file types are rejected.`
      );
      return;
    }

    // File size check: up to 10 MB allowed
    const MAX_SIZE_MB = 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(
        `File is too large (${fileSizeMb} MB). Maximum allowed upload size is 10 MB. Please upload a file smaller than 10 MB or compress the document.`
      );
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress('Uploading file to secure processing sandbox...');

      const formData = new FormData();
      formData.append('file', file);

      // Step simulation for transparency
      setTimeout(() => {
        setUploadProgress('Extracting text, page coordinate layout, and numbering...');
      }, 500);

      setTimeout(() => {
        setUploadProgress('Detecting clauses, scanning for OCR/scanned raster, and indexing...');
      }, 1200);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 413) {
        throw new Error(
          'Payload too large (HTTP 413): The file exceeded the server limit (Note: live deployments on Vercel Serverless Functions enforce a 4.5 MB platform ceiling).'
        );
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Upload failed with status ${res.status}: Server returned an unparseable response.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process document');
      }

      setUploadProgress('Processing complete!');
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress('');
        onRefresh();
        onShowNotification?.(
          `Contract "${data.document?.filename || file.name}" uploaded and analyzed successfully!`,
          'success'
        );
        if (data.document?.id) {
          onOpenDocument(data.document.id, data.document);
        }
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress('');
      setUploadError(err.message || 'An error occurred during document processing');
      onRefresh();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const readyDocs = documents.filter(d => d.status === 'ready');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Contract Repository</h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload legal agreements (PDF or DOCX). Text, clauses, and layout indices are extracted and verified.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Contract</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-slate-800 bg-slate-100/70 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {isUploading ? 'Processing Contract...' : 'Drag and drop your contract here, or browse'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Supports PDF (.pdf) and Microsoft Word (.docx) up to 10 MB. Multi-page and enterprise contracts supported.
          </p>

          {/* Live Processing Indicator */}
          {isUploading && (
            <div className="mt-4 w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-800">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                <span>Processing Status:</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-mono">{uploadProgress}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Error Banner (e.g. Scanned PDF or Unsupported Type) */}
      {uploadError && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start space-x-3 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Processing Notice / Document Rejected</h4>
            <p className="mt-1 leading-relaxed">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-sm px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Document Library Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-900">Uploaded Documents</span>
            <span className="text-xs text-slate-500 font-mono">({documents.length})</span>
          </div>
          {readyDocs.length >= 2 && (
            <button
              onClick={() => onCompareWith(readyDocs[0].id, readyDocs[1].id)}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>Compare v1 vs v2</span>
              <span className="text-slate-400">→</span>
            </button>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileCode className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900">No contracts uploaded yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload your legal contracts above, or click "Load Sample Contracts" in the top bar to inspect preloaded agreements.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map(doc => {
              let clauseCount = 0;
              try {
                if (doc.clauses_json) {
                  clauseCount = JSON.parse(doc.clauses_json).length;
                }
              } catch {}

              const isError = doc.status === 'error';

              return (
                <div
                  key={doc.id}
                  className={`p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isError ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isError
                          ? 'bg-amber-100 text-amber-700'
                          : doc.filetype === 'pdf'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}
                    >
                      {isError ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <span className="text-[11px] font-bold uppercase font-mono">{doc.filetype}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{doc.filename}</h4>
                        {doc.status === 'ready' && (
                          <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Indexed</span>
                          </span>
                        )}
                        {doc.status === 'error' && (
                          <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Scanned / Empty</span>
                          </span>
                        )}
                        {doc.status === 'processing' && (
                          <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Extracting</span>
                          </span>
                        )}
                      </div>

                      {isError ? (
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          {doc.error_message || 'Could not extract text: scanned or protected document.'}
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'}</span>
                          <span>•</span>
                          <span>{doc.total_words.toLocaleString()} words</span>
                          {clauseCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{clauseCount} clauses identified</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatFileSize(doc.filesize)}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    {doc.status === 'ready' && (
                      <button
                        onClick={() => onOpenDocument(doc.id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md shadow-2xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open & Chat</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
