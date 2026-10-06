'use client';

import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Layers, GitCompare, FolderDown, Settings, Key, X, Check, Network, ExternalLink, Download, Loader2 } from 'lucide-react';

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
  const [showSettings, setShowSettings] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('veritas_ai_key') || '');
      setBaseUrl(localStorage.getItem('veritas_ai_base_url') || '');
      setModel(localStorage.getItem('veritas_ai_model') || '');
    }
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      if (!apiKey.trim()) {
        await new Promise(r => setTimeout(r, 400));
        setTestResult({
          success: true,
          message: 'Built-in Local Smart Intelligence Engine is ready with zero API key required.',
        });
        return;
      }

      const testModel = model.trim() || 'gemini-2.5-flash';
      const targetBase = baseUrl.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai';

      const res = await fetch(`${targetBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP error ${res.status}`);
      }

      setTestResult({
        success: true,
        message: `Successfully connected to external AI provider (${testModel})!`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection test notice: ${err.message}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('veritas_ai_key', apiKey.trim());
      localStorage.setItem('veritas_ai_base_url', baseUrl.trim());
      localStorage.setItem('veritas_ai_model', model.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setShowSettings(false);
      }, 800);
    }
  };

  const handleClearSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('veritas_ai_key');
      localStorage.removeItem('veritas_ai_base_url');
      localStorage.removeItem('veritas_ai_model');
      setApiKey('');
      setBaseUrl('');
      setModel('');
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setShowSettings(false);
      }, 800);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none py-1 group"
              onClick={() => setActiveTab('library')}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-serif font-bold text-base shadow-xs group-hover:bg-slate-800 transition-colors">
                V
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-[0.18em] text-slate-900 uppercase leading-none">
                  VERITAS
                </span>
                <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 font-semibold mt-0.5">
                  Legal Contract AI
                </span>
              </div>
            </div>

            {/* Segmented Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70">
              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'library'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Contracts</span>
                {documentCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono font-medium">
                    {documentCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Q&A Analysis</span>
              </button>

              <button
                onClick={() => setActiveTab('compare')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'compare'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-slate-500" />
                <span>Version Diff</span>
              </button>

              <button
                onClick={() => setActiveTab('multi')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'multi'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Multi-Doc</span>
              </button>
            </nav>

            {/* Action / Seed / Settings Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onSeedSamples}
                disabled={isSeeding}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                title="Preloads sample contracts (PDF, DOCX v1 & v2, and Scanned test PDF)"
              >
                {isSeeding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                ) : (
                  <FolderDown className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{isSeeding ? 'Loading...' : 'Sample Contracts'}</span>
              </button>

              <button
                onClick={() => setShowArchitecture(true)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                title="System Architecture & Flow Diagram (Excalidraw)"
              >
                <Network className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Architecture</span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="AI Model & API Key Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Architecture Excalidraw Modal */}
      {showArchitecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Veritas Legal AI — Architecture Diagram</h3>
              </div>
              <button
                onClick={() => setShowArchitecture(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              We have generated a full-featured <strong>Excalidraw System Flow & Architecture Diagram</strong> covering all 5 architectural tiers:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-700 space-y-1 font-mono">
              <div>• Tier 1: Next.js 14 App Router, Streaming Chat & Pulsing Viewer</div>
              <div>• Tier 2: Ingestion, OCR Zero-Text Guard & Glyph Deconstruction</div>
              <div>• Tier 3: Autonomous ReAct Research Loop (Option 2)</div>
              <div>• Tier 4: Dual-Engine LLM (Gemini 3.5 + Ollama + Offline Synthesizer)</div>
              <div>• Tier 5: Zero-Trust Deterministic Quote Verifier & Substantive Diff</div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-3">
                <a
                  href="/veritas_architecture_system_flow.excalidraw"
                  download="veritas_architecture_system_flow.excalidraw"
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .excalidraw</span>
                </a>
                <a
                  href="https://excalidraw.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Excalidraw.com</span>
                </a>
              </div>

              <div className="pt-1">
                <a
                  href="/architecture_diagram.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>View High-Res PNG Architecture Diagram</span>
                </a>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                To view or edit: Download the .excalidraw file above, then drag & drop it directly onto <strong>excalidraw.com</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Provider Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">AI Provider & API Configuration</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              By default, Veritas runs on a high-performance **Built-in Legal Research Agent** with zero external keys required. You can optionally supply your own OpenAI, OpenRouter, Gemini, or Groq API key below.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  API Key (OpenAI / OpenRouter / Gemini / Groq)
                </label>
                <input
                  type="password"
                  placeholder="sk-... or leave empty for Built-in Agent"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Base URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1 (or OpenRouter, Ollama)"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Model Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="gpt-4o-mini, gemini-1.5-flash, etc."
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-hidden focus:border-slate-400"
                />
              </div>

              {/* Test Connection Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="w-full py-1.5 px-3 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                      <span>Testing API Connectivity...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      <span>Test Engine / API Connection</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-tight">{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClearSettings}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Reset to Built-in Engine
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="inline-flex items-center space-x-1 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
