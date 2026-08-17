import React, { useState, useEffect } from 'react';

export default function AiTrainingViewer() {
  const [docContent, setDocContent] = useState('Loading documentation...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDoc = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/ai/training-doc`);
      if (res.ok) {
        const text = await res.text();
        setDocContent(text);
      } else {
        setDocContent('# Error loading AiTraining.md');
      }
    } catch (err) {
      console.error(err);
      setDocContent('# Error connecting to server to fetch AiTraining.md');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, []);

  const handleDownload = () => {
    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'AiTraining.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const steps = [
    { title: "1. Email Ingestion", desc: "Strip HTML tables, Unicode breaks & signatures", icon: "📨" },
    { title: "2. Gemini Extraction", desc: "Invoke gemini-2.5-flash with Few-Shot examples", icon: "🧠" },
    { title: "3. DB Querying", desc: "Cross-reference profile against Excel course catalog", icon: "🔍" },
    { title: "4. Rule Filtering", desc: "Apply Inclusion priorities & Exclusion blocklists", icon: "🛡️" },
    { title: "5. Template Generation", desc: "Compile custom advisor draft with seasonal remarks", icon: "✉️" }
  ];

  // Simple clean formatter to give headings, code blocks and bullet points a polished visual feel
  const renderFormattedMarkdown = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-black dark:text-white text-slate-900 pb-2 border-b dark:border-white/10 border-gray-200 mt-4 mb-3">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-extrabold text-indigo-500 dark:text-indigo-400 mt-6 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-bold dark:text-neutral-200 text-slate-800 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('**') && line.includes(':**')) {
        return <p key={idx} className="text-sm font-semibold dark:text-neutral-300 text-slate-700 my-1">{line}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="text-sm dark:text-neutral-300 text-slate-700 ml-5 my-1 list-disc font-normal">{line.replace('- ', '')}</li>;
      }
      if (line.startsWith('```')) {
        return null; // hide code fences, just let text inside style nicely
      }
      if (line === '---') {
        return <hr key={idx} className="my-6 dark:border-white/10 border-gray-200" />;
      }
      if (!line.trim()) return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-sm dark:text-neutral-300 text-slate-700 font-mono text-xs my-1 leading-relaxed bg-black/5 dark:bg-white/5 p-2 rounded-lg">{line}</p>;
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 pb-32 shrink-0">
      
      {/* Visual Pipeline Showcase */}
      <div className="p-6 rounded-3xl dark:bg-white/[0.03] bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 border dark:border-white/10 border-indigo-100 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold dark:text-white text-slate-900 flex items-center gap-2">
              <span>🚀 Presume Overseas Automated AI Execution Pipeline</span>
            </h2>
            <p className="text-xs dark:text-neutral-400 text-slate-600 mt-0.5">
              How incoming student inquiries are interpreted and routed through Gemini and our rule engines in milliseconds.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDoc}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-2xl font-bold text-xs dark:bg-[#1a1a1e] bg-white hover:dark:bg-white/10 hover:bg-gray-50 dark:text-white text-slate-800 border dark:border-white/10 border-gray-200 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span>Refresh Doc</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>Download AiTraining.md</span>
            </button>
          </div>
        </div>

        {/* Step Cards Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 relative">
          {steps.map((s, idx) => (
            <div key={idx} className="p-4 rounded-2xl dark:bg-[#121215] bg-white border dark:border-white/10 border-gray-200 shadow-md flex flex-col justify-between relative group hover:scale-102 transition-transform">
              <div>
                <div className="text-2xl mb-2">{s.icon}</div>
                <h4 className="text-sm font-extrabold dark:text-white text-slate-900 tracking-tight">{s.title}</h4>
              </div>
              <p className="text-[11px] dark:text-neutral-400 text-slate-500 mt-2 leading-tight">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Markdown Document Preview Pane */}
      <div className="p-8 rounded-3xl dark:bg-[#121214] bg-white border dark:border-white/10 border-gray-200 shadow-2xl space-y-2">
        <div className="flex items-center justify-between pb-4 mb-4 border-b dark:border-white/10 border-gray-200">
          <span className="text-xs font-mono dark:text-neutral-500 text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>public / AiTraining.md</span>
          </span>
          <span className="text-xs dark:text-neutral-500 text-slate-400">Live Synchronized Engine Memory</span>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-1">
          {renderFormattedMarkdown(docContent)}
        </div>
      </div>

    </div>
  );
}
