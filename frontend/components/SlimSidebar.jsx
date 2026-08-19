import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LabelSettingsDropdown from './LabelSettingsDropdown';

export default function SlimSidebar({ onCompose, activeLabel, onChangeLabel, userEmail, accounts = [], onSwitchAccount, onAddAccount, onLogout, onAdminLogout, theme, toggleTheme, isCollapsed, toggleCollapse }) {
  const [userLabels, setUserLabels] = useState([]);
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [showAccountsMenu, setShowAccountsMenu] = useState(false);
  const [activeSettingsLabel, setActiveSettingsLabel] = useState(null);
  const navItems = [
    { id: 'INBOX', label: 'Inbox', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { id: 'STARRED', label: 'Starred', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { id: 'SNOOZED', label: 'Snoozed', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'SENT', label: 'Sent', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
    { id: 'DRAFT', label: 'Drafts', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'ALL', label: 'All Mail', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6M3 7l9-4 9 4' },
    { id: 'SPAM', label: 'Spam', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'TRASH', label: 'Trash', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
    { id: 'AUTO_REPLIED', label: 'Auto Replied', icon: 'M5 13l4 4L19 7' },
    { id: 'NOT_ANALYZED', label: 'Not Analyzed/Replied', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  useEffect(() => {
    fetchLabels();
    fetch(`/api/settings/auto-reply`)
      .then(r => r.json())
      .then(d => setAutoReplyEnabled(d.enabled))
      .catch(e => console.error(e));
  }, []);

  const toggleAutoReply = () => {
    const newState = !autoReplyEnabled;
    setAutoReplyEnabled(newState);
    fetch(`/api/settings/auto-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState })
    }).catch(e => console.error(e));
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch(`/api/labels`);
      const data = await res.json();
      if (Array.isArray(data)) setUserLabels(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      const res = await fetch(`/api/labels/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName.trim() })
      });
      const data = await res.json();
      if (data.id) {
        setNewLabelName('');
        setShowCreateLabel(false);
        fetchLabels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLabel = async (id, updates) => {
    // Optimistic UI Update
    const originalLabels = [...userLabels];
    setUserLabels(userLabels.map(l => l.id === id ? { ...l, ...updates } : l));
    
    // Close the settings dropdown immediately if it's just a color or visibility change
    if (updates.color !== undefined || updates.labelListVisibility || updates.messageListVisibility) {
      // Keep dropdown open so they can see the change, it updates instantly now!
      // Actually, if we want it to close we could do setActiveSettingsLabel(null);
    }

    try {
      const res = await fetch(`/api/labels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!data.id) {
        // Revert on failure
        setUserLabels(originalLabels);
      }
    } catch (e) {
      console.error(e);
      // Revert on failure
      setUserLabels(originalLabels);
    }
  };

  const handleDeleteLabel = async (id) => {
    try {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUserLabels(userLabels.filter(l => l.id !== id));
        setActiveSettingsLabel(null);
        if (activeLabel === id) onChangeLabel('INBOX');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`w-full h-full shrink-0 dark:bg-[#0a0a0a]/95 bg-[#fcfbf9] backdrop-blur-xl border-r dark:border-white/[0.06] border-gray-200 flex flex-col py-3.5 ${isCollapsed ? 'px-2 items-center' : 'px-3'} z-20 select-none transition-all duration-300 overflow-hidden`}>
      
      {/* Header and Theme Shifter */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col space-y-2.5' : 'justify-between'} mb-3 px-1 w-full shrink-0`}>
        {!isCollapsed && <h2 className="text-lg font-black dark:text-white text-slate-800 tracking-tight flex items-center gap-1.5">Presume Overseas</h2>}
        {isCollapsed && <svg className="w-5 h-5 text-indigo-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>}
        
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'space-x-1.5'}`}>
          <button 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-6 h-6 rounded-full flex items-center justify-center dark:bg-white/10 bg-gray-200 dark:text-yellow-400 text-slate-700 hover:scale-105 transition-all shadow-inner cursor-pointer"
          >
            {theme === 'dark' ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
            )}
          </button>
          
          <button 
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-6 h-6 rounded-full flex items-center justify-center dark:bg-white/5 bg-gray-100 dark:text-neutral-400 text-slate-500 hover:dark:bg-white/10 hover:bg-gray-200 transition-all shadow-inner cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          {onAdminLogout && (
            <button 
              onClick={onAdminLogout}
              title="Logout from Dashboard"
              className="w-6 h-6 rounded-full flex items-center justify-center dark:bg-red-500/10 bg-red-100 dark:text-red-400 text-red-600 hover:scale-105 transition-all shadow-inner cursor-pointer ml-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          )}
        </div>
      </div>

      <button 
        onClick={onCompose}
        className={`mb-3 shrink-0 flex items-center justify-center ${isCollapsed ? 'w-10 h-10 rounded-xl' : 'w-full py-2 px-4 rounded-xl space-x-2'} bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-extrabold shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all active:scale-95 cursor-pointer`}
      >
        <svg className={isCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
        {!isCollapsed && <span className="tracking-wide uppercase text-[11px]">Compose</span>}
      </button>

      {/* AI Robot Toggle Container */}
      <div className={`mb-3 shrink-0 w-full flex items-center ${isCollapsed ? 'justify-center flex-col' : 'justify-between px-3 py-1.5 rounded-xl dark:bg-[#131317] bg-white border dark:border-white/10 border-gray-200 shadow-xs'}`}>
        {isCollapsed ? (
          <button onClick={toggleAutoReply} title="Toggle AI Auto Reply" className="relative cursor-pointer group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${autoReplyEnabled ? 'bg-indigo-500/10 border border-indigo-500/20' : 'dark:bg-white/5 bg-gray-100'}`}>
              <img src="/robot.png" alt="AI Robot" className={`w-6 h-6 object-contain transition-all ${autoReplyEnabled ? '' : 'grayscale opacity-50'}`} />
            </div>
            {autoReplyEnabled && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#fbfaf6] dark:border-[#0a0a0a] rounded-full"></div>}
          </button>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${autoReplyEnabled ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'dark:bg-white/5 bg-gray-100 opacity-50 grayscale'}`}>
                <img src="/robot.png" alt="AI Robot" className="w-4 h-4 object-contain" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-[11px] font-bold dark:text-white text-slate-800 leading-none">AI Worker</span>
                <span className={`text-[9px] font-extrabold tracking-wider mt-0.5 ${autoReplyEnabled ? 'text-emerald-500' : 'dark:text-neutral-500 text-slate-400'}`}>{autoReplyEnabled ? 'ACTIVE' : 'OFF'}</span>
              </div>
            </div>
            {/* Custom Toggle Slider */}
            <button 
              onClick={toggleAutoReply}
              title="Toggle automatic student inquiry processing"
              className={`relative w-8 h-4 rounded-full transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${autoReplyEnabled ? 'bg-emerald-500' : 'dark:bg-white/20 bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${autoReplyEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col space-y-3.5 w-full min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
        {/* AI Model Control Center Navigation Route */}
        <div className={isCollapsed ? 'shrink-0' : 'px-0.5 shrink-0'}>
          <button
            onClick={() => onChangeLabel('AI_MODEL')}
            title={isCollapsed ? 'AI Model Control Center' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-2.5'
            } rounded-xl text-xs font-extrabold transition-all relative overflow-hidden cursor-pointer group ${
              activeLabel === 'AI_MODEL'
                ? 'dark:bg-gradient-to-r dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border dark:border-white/20 border-indigo-500/30 dark:text-white text-indigo-700 shadow-md shadow-purple-500/10 backdrop-blur-xl'
                : 'dark:text-neutral-300 text-slate-700 dark:hover:bg-white/[0.04] hover:bg-gray-100 hover:text-indigo-600 dark:hover:text-white border border-transparent'
            }`}
          >
            <div className={`flex items-center justify-center shrink-0 ${activeLabel === 'AI_MODEL' ? 'scale-110 text-pink-500 animate-pulse' : 'text-indigo-500 group-hover:scale-110'} transition-transform`}>
              <svg className={isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.4 7.2L20 8L15.6 12.4L16.8 18L12 15L7.2 18L8.4 12.4L4 8L9.6 7.2L12 2Z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate tracking-tight font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent text-xs">
                  AI Model
                </span>
                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded dark:bg-white/10 bg-indigo-100 text-indigo-500 dark:text-indigo-300 border dark:border-white/10 border-indigo-200 shrink-0">
                  STUDIO
                </span>
              </div>
            )}
            {activeLabel === 'AI_MODEL' && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-60 blur-sm -z-10"></div>
            )}
          </button>
        </div>

        {/* Courses Excel Dashboard */}
        <div className={isCollapsed ? 'shrink-0 mt-2' : 'px-0.5 shrink-0 mt-2'}>
          <button
            onClick={() => onChangeLabel('COURSES_EXCEL')}
            title={isCollapsed ? 'Courses Database' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-2.5'
            } rounded-xl text-xs font-extrabold transition-all relative overflow-hidden cursor-pointer group ${
              activeLabel === 'COURSES_EXCEL'
                ? 'dark:bg-emerald-500/20 bg-emerald-50 border dark:border-emerald-500/30 border-emerald-500/30 dark:text-emerald-400 text-emerald-700 shadow-md backdrop-blur-xl'
                : 'dark:text-neutral-300 text-slate-700 dark:hover:bg-white/[0.04] hover:bg-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 border border-transparent'
            }`}
          >
            <div className={`flex items-center justify-center shrink-0 ${activeLabel === 'COURSES_EXCEL' ? 'scale-110 text-emerald-500' : 'text-emerald-600/70 group-hover:scale-110'} transition-transform`}>
              <svg className={isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2M18 20H6V4H13V9H18V20M16 11V18.1L13.9 16L11.1 18.8L8.3 16L10.4 13.9L8.3 11.8L11.1 9L13.9 11.8L16 9.7V11Z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate tracking-tight font-black text-emerald-600 dark:text-emerald-400 text-xs">
                  Courses DB
                </span>
                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded dark:bg-emerald-500/10 bg-emerald-100 text-emerald-600 dark:text-emerald-300 border dark:border-emerald-500/20 border-emerald-200 shrink-0">
                  EXCEL
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Mail Formats Dashboard */}
        <div className={isCollapsed ? 'shrink-0 mt-2' : 'px-0.5 shrink-0 mt-2'}>
          <button
            onClick={() => onChangeLabel('MAIL_FORMATS')}
            title={isCollapsed ? 'Mail Formats & Templates' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-2.5'
            } rounded-xl text-xs font-extrabold transition-all relative overflow-hidden cursor-pointer group ${
              activeLabel === 'MAIL_FORMATS'
                ? 'dark:bg-amber-500/20 bg-amber-50 border dark:border-amber-500/30 border-amber-500/30 dark:text-amber-400 text-amber-700 shadow-md backdrop-blur-xl'
                : 'dark:text-neutral-300 text-slate-700 dark:hover:bg-white/[0.04] hover:bg-gray-100 hover:text-amber-600 dark:hover:text-amber-400 border border-transparent'
            }`}
          >
            <div className={`flex items-center justify-center shrink-0 ${activeLabel === 'MAIL_FORMATS' ? 'scale-110 text-amber-500' : 'text-amber-600/70 group-hover:scale-110'} transition-transform`}>
              <svg className={isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="truncate tracking-tight font-black text-amber-600 dark:text-amber-400 text-xs">
                  Mail Formats
                </span>
                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded dark:bg-amber-500/10 bg-amber-100 text-amber-600 dark:text-amber-300 border dark:border-amber-500/20 border-amber-200 shrink-0">
                  TEMPLATES
                </span>
              </div>
            )}
          </button>
        </div>

        {/* System Mailboxes */}
        <div className="shrink-0">
          {!isCollapsed && <p className="text-[9px] font-black dark:text-neutral-500 text-slate-400 uppercase tracking-widest mb-1 px-2.5">Mailboxes</p>}
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <button 
                key={item.id}
                title={isCollapsed ? item.label : ''}
                onClick={() => onChangeLabel(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'px-2.5 py-1.5 space-x-2.5'} rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeLabel === item.id ? 'dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-300 text-indigo-700 font-extrabold' : 'dark:text-neutral-400 text-slate-600 dark:hover:bg-white/[0.04] hover:bg-gray-100 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <svg className={`${isCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* User Labels */}
        <div className="shrink-0 pb-1">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2.5'} mb-1`}>
            {!isCollapsed && <p className="text-[9px] font-black dark:text-neutral-500 text-slate-400 uppercase tracking-widest">Labels</p>}
            <button 
              onClick={() => setShowCreateLabel(!showCreateLabel)}
              title="Create new label"
              className="dark:text-neutral-500 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer p-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
          
          <div className="space-y-0.5">
            {userLabels.map((lbl) => {
              if (lbl.labelListVisibility === 'labelHide') return null;
              
              return (
              <div key={lbl.id} className="relative group/label flex items-center">
                <button 
                  title={isCollapsed ? lbl.name : ''}
                  onClick={() => onChangeLabel(lbl.id)}
                  className={`flex-1 flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'px-2.5 py-1.5 space-x-2.5'} rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeLabel === lbl.id ? 'dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-300 text-indigo-700 font-extrabold' : 'dark:text-neutral-400 text-slate-600 dark:hover:bg-white/[0.04] hover:bg-gray-100 dark:hover:text-white hover:text-slate-900'}`}
                >
                  <svg className={`${isCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0`} fill={lbl.color ? lbl.color.backgroundColor : 'none'} stroke={lbl.color ? lbl.color.textColor : 'currentColor'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  {!isCollapsed && <span className="truncate" style={lbl.color ? { color: lbl.color.backgroundColor } : {}}>{lbl.name}</span>}
                </button>
                {!isCollapsed && (
                  <button 
                    className="opacity-0 group-hover/label:opacity-100 p-1.5 dark:text-neutral-500 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-opacity shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSettingsLabel({ label: lbl, anchorEl: e.currentTarget });
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                  </button>
                )}
              </div>
            )})}
            {userLabels.length === 0 && !isCollapsed && (
              <p className="text-[10px] dark:text-neutral-600 text-slate-400 px-2.5 italic">No custom labels</p>
            )}
          </div>
        </div>
      </div>

      {activeSettingsLabel && (
        <LabelSettingsDropdown
          label={userLabels.find(l => l.id === activeSettingsLabel.label.id) || activeSettingsLabel.label}
          anchorEl={activeSettingsLabel.anchorEl}
          onClose={() => setActiveSettingsLabel(null)}
          onUpdate={handleUpdateLabel}
          onDelete={handleDeleteLabel}
        />
      )}

      {/* User Info / Account Switcher Trigger */}
      <div className={`pt-2.5 border-t dark:border-white/10 border-gray-200 mt-2 flex flex-col relative shrink-0 ${isCollapsed ? 'items-center' : 'px-0.5'}`}>
        {!isCollapsed && <p className="text-[9px] font-black dark:text-neutral-500 text-slate-400 uppercase tracking-widest mb-1.5 px-2">Connected Gmail</p>}
        {userEmail && (
          <>
            <button 
              onClick={() => setShowAccountsMenu(!showAccountsMenu)}
              className={`w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
              title="Manage & switch accounts"
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2 overflow-hidden'}`}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 shadow-sm" title={isCollapsed ? userEmail : ''}>
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col text-left truncate min-w-0">
                    <span className="text-xs font-extrabold dark:text-neutral-200 text-slate-800 truncate leading-none">{userEmail}</span>
                    <span className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active Account
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
              )}
            </button>

            {/* Floating Accounts Drop Menu */}
            {showAccountsMenu && typeof window !== 'undefined' && createPortal(
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAccountsMenu(false)}></div>
                <div className="fixed bottom-20 left-8 z-50 w-72 dark:bg-[#161616] bg-white border dark:border-white/10 border-gray-200 rounded-2xl shadow-2xl p-3 backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b dark:border-white/10 border-gray-100">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">Logged in Accounts</span>
                    <span className="text-[10px] dark:text-neutral-500 text-slate-400 font-medium">{(accounts && accounts.length > 0 ? accounts : [{ email: userEmail, active: true }]).length} Account(s)</span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-1 my-1 custom-scrollbar pr-1">
                    {(accounts && accounts.length > 0 ? accounts : [{ email: userEmail, active: true }]).map((acc, index) => {
                      const isActive = acc.email === userEmail || acc.active;
                      return (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-xl transition-all ${isActive ? 'dark:bg-indigo-500/15 bg-indigo-50/80 border border-indigo-500/30' : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent cursor-pointer'}`}
                          onClick={() => {
                            if (!isActive && onSwitchAccount) {
                              onSwitchAccount(acc.email);
                              setShowAccountsMenu(false);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isActive ? 'bg-indigo-600 ring-2 ring-indigo-400/50' : 'bg-slate-500 dark:bg-neutral-600'}`}>
                              {acc.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col truncate min-w-0">
                              <span className={`text-xs truncate ${isActive ? 'font-bold dark:text-white text-indigo-900' : 'font-medium dark:text-neutral-300 text-slate-700'}`}>
                                {acc.email}
                              </span>
                              <span className="text-[10px] dark:text-neutral-500 text-slate-400">
                                {isActive ? 'Currently Active' : 'Click to switch'}
                              </span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Logout account ${acc.email}?`)) {
                                onLogout(acc.email);
                                setShowAccountsMenu(false);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                            title={`Logout ${acc.email}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-2 border-t dark:border-white/10 border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountsMenu(false);
                        if (onAddAccount) onAddAccount();
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer active:scale-95"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                      <span>Add / Login Another Account</span>
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </>
        )}
      </div>

      {/* Create Label Modal */}
      {showCreateLabel && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLabel} className="dark:bg-[#121212] bg-white border dark:border-white/10 border-gray-200 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold dark:text-white text-slate-900 mb-4">Create New Label</h3>
            <input 
              type="text" 
              placeholder="Label name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full dark:bg-[#1a1a1a] bg-gray-50 border dark:border-white/10 border-gray-300 rounded-xl px-4 py-2.5 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-indigo-500 mb-5"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowCreateLabel(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium dark:text-neutral-400 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
