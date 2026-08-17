import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import RulesManager from './RulesManager';
import TrainingChatbot from './TrainingChatbot';
import AiTrainingViewer from './AiTrainingViewer';

export default function AiModelDashboard() {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules', 'chatbot', 'doc'
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [providerInput, setProviderInput] = useState('gemini');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestApiConnection = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ai/test-connection`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: 'Network error or backend server unreachable.' });
    } finally {
      setIsTestingApi(false);
    }
  };

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setApiKeyInput(data.apiKey || '');
        setGroqKeyInput(data.groqApiKey || '');
        setProviderInput(data.aiProvider || 'gemini');
      }
    } catch (err) {
      console.error('Failed to load AI configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (newFields) => {
    try {
      const res = await fetch(`/api/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFields)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiConfig) setConfig(data.aiConfig);
      }
    } catch (err) {
      console.error('Failed to save AI configuration:', err);
    }
  };

  const toggleAiEngine = async () => {
    if (!config) return;
    const newState = !config.isAiEnabled;
    setConfig({ ...config, isAiEnabled: newState });
    await handleSaveConfig({ isAiEnabled: newState });
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    await handleSaveConfig({ 
      apiKey: apiKeyInput.trim(),
      groqApiKey: groqKeyInput.trim(),
      aiProvider: providerInput
    });
    setKeySaveSuccess(true);
    setTimeout(() => {
      setKeySaveSuccess(false);
      setShowApiKeyModal(false);
    }, 1200);
  };

  const activeProvider = config?.aiProvider || 'gemini';
  const isApiConnected = Boolean(
    config && (
      (activeProvider === 'groq' && config.groqApiKey && config.groqApiKey.length > 5) ||
      (activeProvider === 'gemini' && config.apiKey && config.apiKey.length > 5)
    )
  );

  return (
    <div className="flex flex-col w-full h-full dark:bg-[#0a0a0d] bg-[#fbfaf6] text-slate-800 dark:text-slate-200 overflow-hidden select-none">
      
      {/* 1. Header Bar (Master Switch & Status) */}
      <header className="px-8 py-5 dark:bg-[#111115]/95 bg-white/90 border-b dark:border-white/[0.07] border-gray-200 backdrop-blur-xl shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-10 shadow-sm">
        
        {/* Left Title */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/25">
            🧠
          </div>
          <div>
            <h1 className="text-xl font-extrabold dark:text-white text-slate-900 tracking-tight flex items-center gap-2">
              <span>AI Model Control & Training Center</span>
            </h1>
            <p className="text-xs dark:text-neutral-400 text-slate-500">
              Manage Gemini 2.5 Flash reasoning parameters, rulesets, and study abroad consultation workflows.
            </p>
          </div>
        </div>

        {/* Right Controls: Master Switch & API Status */}
        <div className="flex items-center gap-5">
          
          {/* API Connection Indicator & Config */}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl dark:bg-white/[0.03] bg-gray-50 hover:dark:bg-white/[0.07] hover:bg-gray-100 border dark:border-white/10 border-gray-200 transition-all shadow-sm cursor-pointer group"
            title="Configure Google AI Studio API Key"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isApiConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`}></div>
            <span className="text-xs font-bold dark:text-white text-slate-800">
              {isApiConnected ? `${activeProvider === 'groq' ? 'Groq AI Studio' : 'Google AI Studio'} Connected` : 'Configure AI Studio Keys'}
            </span>
            <svg className="w-3.5 h-3.5 dark:text-neutral-500 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>

          {/* Test API Connection Button & Status Box */}
          <div className="relative flex items-center">
            <button
              onClick={handleTestApiConnection}
              disabled={isTestingApi}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs dark:bg-indigo-500/10 bg-indigo-50 dark:text-indigo-400 text-indigo-700 border dark:border-indigo-500/30 border-indigo-200 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Test live connectivity and latency with Google Gemini AI Studio"
            >
              {isTestingApi ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Testing API...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">⚡</span>
                  <span>Test API Connection</span>
                </>
              )}
            </button>

            {/* Test Result Tooltip / Alert Box */}
            {testResult && (
              <div className={`absolute top-13 right-0 z-50 min-w-[320px] max-w-md p-4 rounded-2xl shadow-2xl border flex flex-col gap-1.5 transition-all text-xs ${
                testResult.success 
                  ? 'dark:bg-[#14261c] bg-emerald-50 border-emerald-500/50 dark:text-emerald-200 text-emerald-900 shadow-emerald-500/15' 
                  : 'dark:bg-[#2c1519] bg-rose-50 border-rose-500/50 dark:text-rose-200 text-rose-900 shadow-rose-500/15'
              }`}>
                <div className="flex items-center justify-between font-black text-sm border-b dark:border-white/10 border-black/5 pb-1.5 mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <span>{testResult.success ? '🟢 API Online & Working' : '🔴 API Test Failed'}</span>
                  </span>
                  <button onClick={() => setTestResult(null)} className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer text-sm font-extrabold">✕</button>
                </div>
                <p className="font-semibold leading-relaxed mt-0.5 opacity-95">{testResult.message}</p>
                {testResult.latency && (
                  <span className="text-[10px] opacity-75 font-mono mt-1 pt-1 border-t dark:border-white/5 border-black/5">Response Latency: {testResult.latency} | Model: {testResult.model}</span>
                )}
              </div>
            )}
          </div>

          {/* Master Engine Selector / Toggle */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest dark:text-neutral-400 text-slate-500 mb-1.5 px-1">
              Active Extraction & Chat Engine: <span className="dark:text-white text-slate-900 font-extrabold">{!config?.isAiEnabled ? 'Local Rules Heuristics' : (config?.aiProvider === 'groq' ? 'Groq Llama-3.3' : 'Google Gemini Flash')}</span>
            </span>
            <div className="flex items-center p-1 rounded-2xl dark:bg-[#16161c] bg-gray-100 border dark:border-white/10 border-gray-200 shadow-inner gap-1">
              <button
                type="button"
                onClick={async () => {
                  if (!config) return;
                  const updated = { ...config, isAiEnabled: false };
                  setConfig(updated);
                  await handleSaveConfig({ isAiEnabled: false });
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  !config?.isAiEnabled
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
                title="Switch to Offline Local Rules & Regex Engine"
              >
                <span>🏠 Local Engine</span>
                {!config?.isAiEnabled && <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!config) return;
                  const updated = { ...config, isAiEnabled: true, aiProvider: 'gemini' };
                  setConfig(updated);
                  await handleSaveConfig({ isAiEnabled: true, aiProvider: 'gemini' });
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  config?.isAiEnabled && (config?.aiProvider === 'gemini' || !config?.aiProvider)
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                    : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
                title="Activate Google Gemini AI (gemini-flash-latest)"
              >
                <span>⚡ Gemini AI</span>
                {config?.isAiEnabled && (config?.aiProvider === 'gemini' || !config?.aiProvider) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!config) return;
                  const updated = { ...config, isAiEnabled: true, aiProvider: 'groq' };
                  setConfig(updated);
                  await handleSaveConfig({ isAiEnabled: true, aiProvider: 'groq' });
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  config?.isAiEnabled && config?.aiProvider === 'groq'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                    : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                }`}
                title="Activate Groq AI Studio (llama-3.3-70b-versatile)"
              >
                <span>🚀 Groq AI</span>
                {config?.isAiEnabled && config?.aiProvider === 'groq' && (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                )}
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Navigation Tabs Bar */}
      <nav className="px-8 pt-3 dark:bg-[#111115]/80 bg-white/80 border-b dark:border-white/[0.05] border-gray-200 flex items-center gap-8 shrink-0 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 font-extrabold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === 'rules' 
              ? 'dark:text-indigo-400 text-indigo-600' 
              : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <span className="text-base">🛠️</span>
          <span>Rules & Filters Manager</span>
          {activeTab === 'rules' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-full shadow-lg shadow-indigo-500/50"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chatbot')}
          className={`pb-3 font-extrabold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === 'chatbot' 
              ? 'dark:text-indigo-400 text-indigo-600' 
              : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <span className="text-base">💬</span>
          <span>Interactive AI Training Bot</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">Live Studio</span>
          {activeTab === 'chatbot' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-full shadow-lg shadow-indigo-500/50"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('doc')}
          className={`pb-3 font-extrabold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === 'doc' 
              ? 'dark:text-indigo-400 text-indigo-600' 
              : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <span className="text-base">📄</span>
          <span>AiTraining.md Documentation</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          {activeTab === 'doc' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-full shadow-lg shadow-indigo-500/50"></div>
          )}
        </button>
      </nav>

      {/* 3. Active Tab Content Workspace */}
      <main className="flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar relative flex flex-col">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="p-6 rounded-2xl bg-[#141417] border border-white/10 flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-white">Loading AI Engine Architecture...</span>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <RulesManager config={config} onSaveConfig={handleSaveConfig} />
        )}

        {activeTab === 'chatbot' && (
          <TrainingChatbot config={config} onRefreshConfig={setConfig} />
        )}

        {activeTab === 'doc' && (
          <AiTrainingViewer />
        )}
      </main>

      {/* API Key Configuration Modal via React Portal to blur full screen including sidebar */}
      {showApiKeyModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen min-w-full z-[2147483647] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl dark:bg-[#141418] bg-white border dark:border-white/15 border-gray-200 shadow-2xl p-7 flex flex-col space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b dark:border-white/10 border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                  🔑
                </div>
                <div>
                  <h3 className="text-lg font-extrabold dark:text-white text-slate-900">
                    AI Studio API Key & Engine Selection
                  </h3>
                  <p className="text-xs dark:text-neutral-400 text-slate-500">Configure your LLM provider and secret credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="w-8 h-8 rounded-full dark:bg-white/10 bg-gray-100 hover:dark:bg-white/20 text-slate-800 dark:text-white transition-all flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-6">
              {/* Provider Selector Tabs */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest dark:text-neutral-400 text-slate-500 block mb-2.5">
                  Select Active Cloud AI Engine
                </label>
                <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl dark:bg-[#1a1a20] bg-gray-100 border dark:border-white/5 border-gray-200">
                  <button
                    type="button"
                    onClick={() => setProviderInput('gemini')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      providerInput === 'gemini'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                        : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                    }`}
                  >
                    <span>⚡ Google Gemini AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderInput('groq')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      providerInput === 'groq'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                        : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-slate-900'
                    }`}
                  >
                    <span>🚀 Groq AI (Llama 3 / Mixtral)</span>
                  </button>
                </div>
              </div>

              {/* Gemini API Key Field */}
              <div className={`p-4 rounded-2xl border transition-all ${providerInput === 'gemini' ? 'dark:bg-indigo-500/5 bg-indigo-50/50 dark:border-indigo-500/40 border-indigo-200 shadow-xs' : 'dark:bg-[#1a1a20]/50 bg-gray-50/50 dark:border-white/5 border-gray-200 opacity-80'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-widest dark:text-neutral-300 text-slate-700 flex items-center gap-1.5">
                    <span>⚡ Google Gemini Secret Key</span>
                    {providerInput === 'gemini' && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-extrabold lowercase">active</span>}
                  </label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 underline font-bold transition-colors">
                    Get Gemini Key ↗
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy... or AQ.Ab8..."
                    className="w-full pl-4 pr-12 py-3 rounded-xl dark:bg-[#121216] bg-white dark:text-white text-slate-900 border dark:border-white/10 border-gray-300 focus:outline-none focus:border-indigo-500 text-sm font-mono shadow-inner transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 dark:text-neutral-400 text-slate-500 hover:dark:text-white hover:text-slate-800 transition-colors p-1 text-base cursor-pointer select-none"
                    title={showGeminiKey ? "Hide Secret Key" : "Show Full API Key"}
                  >
                    {showGeminiKey ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-slate-500 mt-2 leading-tight">
                  Powers intelligent reasoning via <code className="text-indigo-400 font-mono">gemini-flash-latest</code>.
                </p>
              </div>

              {/* Groq API Key Field */}
              <div className={`p-4 rounded-2xl border transition-all ${providerInput === 'groq' ? 'dark:bg-emerald-500/5 bg-emerald-50/50 dark:border-emerald-500/40 border-emerald-200 shadow-xs' : 'dark:bg-[#1a1a20]/50 bg-gray-50/50 dark:border-white/5 border-gray-200 opacity-80'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-widest dark:text-neutral-300 text-slate-700 flex items-center gap-1.5">
                    <span>🚀 Groq API Secret Key</span>
                    {providerInput === 'groq' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold lowercase">active</span>}
                  </label>
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 underline font-bold transition-colors">
                    Get Groq Key ↗
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showGroqKey ? "text" : "password"}
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full pl-4 pr-12 py-3 rounded-xl dark:bg-[#121216] bg-white dark:text-white text-slate-900 border dark:border-white/10 border-gray-300 focus:outline-none focus:border-emerald-500 text-sm font-mono shadow-inner transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 dark:text-neutral-400 text-slate-500 hover:dark:text-white hover:text-slate-800 transition-colors p-1 text-base cursor-pointer select-none"
                    title={showGroqKey ? "Hide Secret Key" : "Show Full API Key"}
                  >
                    {showGroqKey ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-slate-500 mt-2 leading-tight">
                  Ultra-fast token inference via <code className="text-emerald-400 font-mono">llama-3.3-70b-versatile</code> on Groq LPUs.
                </p>
              </div>

              {keySaveSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-2">
                  <span>✅ API Configuration & Engine Saved & Synchronized Successfully!</span>
                </div>
              )}

              <div className="flex justify-end items-center gap-3 pt-2 border-t dark:border-white/10 border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold dark:bg-white/10 bg-gray-100 hover:dark:bg-white/20 text-slate-700 dark:text-neutral-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  Save & Apply AI Settings
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
