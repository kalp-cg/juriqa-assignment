'use client';

import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Layers, GitCompare, Sparkles, ShieldCheck, Settings, Key, X, Check } from 'lucide-react';

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
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('veritas_ai_key') || '');
      setBaseUrl(localStorage.getItem('veritas_ai_base_url') || '');
      setModel(localStorage.getItem('veritas_ai_model') || '');
    }
  }, []);

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

            {/* Action / Seed / Settings Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                title="AI Model & API Key Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

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
