import React, { useState, useEffect, useRef } from 'react';

export default function ApiUsageWidget() {
  const [apiUsage, setApiUsage] = useState({ emailsAnalyzed: 0, requestsMade: 0 });
  const [isVisible, setIsVisible] = useState(true);
  
  const [position, setPosition] = useState({ x: 280, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

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

  useEffect(() => {
    const saved = localStorage.getItem('apiUsageWidgetPosition');
    if (saved) {
      try { setPosition(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return; // Don't drag if clicking a button
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    localStorage.setItem('apiUsageWidgetPosition', JSON.stringify({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    }));
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed top-24 right-4 z-[60] w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-[#121216]/90 backdrop-blur-md border border-gray-200/60 dark:border-white/[0.08] rounded-full shadow-xl text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform duration-200 cursor-pointer animate-fade-in"
        title="Show API Usage"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </button>
    );
  }

  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
      className={`fixed z-50 flex items-center gap-4 bg-white/80 dark:bg-[#121216]/90 backdrop-blur-md border border-gray-200/60 dark:border-white/[0.08] p-2.5 pr-3 pl-4 rounded-2xl animate-fade-in group cursor-move ${isDragging ? 'shadow-2xl scale-105 transition-transform duration-75' : 'shadow-[0_4px_24px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-transform duration-200'}`}
    >
      <div className="flex flex-col select-none">
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
