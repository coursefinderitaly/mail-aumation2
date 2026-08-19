import React, { useState, useEffect } from 'react';

export default function ApiUsageWidget() {
  const [apiUsage, setApiUsage] = useState({ emailsAnalyzed: 0, requestsMade: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchUsage = () => {
      fetch(`/api/ai/usage`)
        .then(r => r.json())
        .then(d => setApiUsage(d))
        .catch(e => console.error(e));
    };

    fetchUsage();
    const usageInterval = setInterval(fetchUsage, 5000);
    return () => clearInterval(usageInterval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-5 right-6 z-50 flex items-center gap-4 bg-white/80 dark:bg-[#121216]/90 backdrop-blur-md border border-gray-200/60 dark:border-white/[0.08] shadow-[0_4px_24px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-2.5 pr-3 pl-4 rounded-2xl animate-fade-in group">
      
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-0.5">API Usage Status</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Analyzed:</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{apiUsage.emailsAnalyzed}</span>
          </div>
          <div className="w-px h-3 bg-gray-300 dark:bg-white/10"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Requests:</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{apiUsage.requestsMade}</span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => setIsVisible(false)}
        className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
        title="Hide Stats"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
