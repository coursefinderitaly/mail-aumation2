"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import SlimSidebar from '../components/SlimSidebar';
import EmailList from '../components/EmailList';
import ReadingPane from '../components/ReadingPane';
import ComposeModal from '../components/ComposeModal';
import AiModelDashboard from '../components/ai/AiModelDashboard';
import CoursesExcelDashboard from '../components/CoursesExcelDashboard';
import MailFormatsDashboard from '../components/MailFormatsDashboard';
import ApiUsageWidget from '../components/ApiUsageWidget';

export default function Page() {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [crmData, setCrmData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState(null);
  const [activeLabel, setActiveLabel] = useState('INBOX');
  const [isFetching, setIsFetching] = useState(false);
  const [userLabels, setUserLabels] = useState([]);
  const [emailCache, setEmailCache] = useState({});
  
  const [theme, setTheme] = useState('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Admin Auth State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Verify admin token securely
    fetch(`/api/admin/verify`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.loggedIn) setIsAdminLoggedIn(true);
      })
      .catch(err => console.error('Token verification failed', err));
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    fetch(`/api/auth/status`)
      .then(res => res.json())
      .then(data => {
        setIsConnected(data.connected);
        if (data.emailAddress) setUserEmail(data.emailAddress);
        if (data.accounts) setAccounts(data.accounts);
        if (data.connected) {
          fetchEmails(activeLabel, true);
          fetchUserLabels();
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    if (isConnected && activeLabel !== 'AI_MODEL' && activeLabel !== 'COURSES_EXCEL' && activeLabel !== 'MAIL_FORMATS') {
      if (emailCache[activeLabel]) {
        setEmails(emailCache[activeLabel]);
        fetchEmails(activeLabel, false);
      } else {
        setEmails([]);
        fetchEmails(activeLabel, true);
      }
    }
  }, [activeLabel, isConnected]);

  useEffect(() => {
    let interval;
    if (isConnected && activeLabel !== 'AI_MODEL' && activeLabel !== 'COURSES_EXCEL' && activeLabel !== 'MAIL_FORMATS') {
      interval = setInterval(() => {
        fetchEmails(activeLabel, false);
      }, 10000); // 10 seconds polling
    }
    return () => clearInterval(interval);
  }, [isConnected, activeLabel]);

  const fetchUserLabels = async () => {
    try {
      const res = await fetch(`/api/labels`);
      const data = await res.json();
      if (Array.isArray(data)) setUserLabels(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async (targetEmail = userEmail) => {
    try {
      const res = await fetch(`/api/auth/logout?email=${encodeURIComponent(targetEmail)}`);
      const data = await res.json();
      if (data.remaining === 0) {
        setIsConnected(false);
        setUserEmail('');
        setAccounts([]);
        setEmails([]);
        setSelectedEmail(null);
        setCrmData(null);
      } else {
        setSelectedEmail(null);
        setCrmData(null);
        setEmailCache({});
        const statusRes = await fetch(`/api/auth/status`);
        const statusData = await statusRes.json();
        if (statusData.emailAddress) setUserEmail(statusData.emailAddress);
        if (statusData.accounts) setAccounts(statusData.accounts);
        fetchEmails(activeLabel, true);
      }
    } catch (e) {
      console.error('Error logging out account:', e);
    }
  };

  const handleSwitchAccount = async (email) => {
    try {
      setIsFetching(true);
      const res = await fetch(`/api/auth/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setUserEmail(email);
        setSelectedEmail(null);
        setCrmData(null);
        setEmailCache({});
        await fetchEmails(activeLabel, true);
        const statusRes = await fetch(`/api/auth/status`);
        const statusData = await statusRes.json();
        if (statusData.accounts) setAccounts(statusData.accounts);
      }
    } catch (e) {
      console.error('Error switching account:', e);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddAccount = () => {
    window.location.href = `/auth/google`;
  };

  // Pagination State
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [pageTokenStack, setPageTokenStack] = useState([]);

  const fetchEmails = async (label = activeLabel, showLoader = true, overridePageSize = pageSize, pToken = null) => {
    if (label === 'AI_MODEL' || label === 'COURSES_EXCEL' || label === 'MAIL_FORMATS') return;
    if (showLoader) setIsFetching(true);
    try {
      let url = `/api/emails?label=${encodeURIComponent(label)}&maxResults=${overridePageSize}`;
      if (pToken) {
        url += `&pageToken=${encodeURIComponent(pToken)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      
      let fetchedThreads = [];
      let nextTok = null;
      
      if (Array.isArray(data)) {
        fetchedThreads = data;
      } else if (data && Array.isArray(data.threads)) {
        fetchedThreads = data.threads;
        nextTok = data.nextPageToken || null;
      }
      
      if (!data.error) {
        setEmails(fetchedThreads);
        setNextPageToken(nextTok);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoader) setIsFetching(false);
    }
  };

  const handleNextPage = () => {
    if (!nextPageToken) return;
    setPageTokenStack(prev => [...prev, nextPageToken]);
    setCurrentPage(prev => prev + 1);
    fetchEmails(activeLabel, true, pageSize, nextPageToken);
  };

  const handlePrevPage = () => {
    if (pageTokenStack.length === 0) return;
    const newStack = [...pageTokenStack];
    newStack.pop(); // Pop current page token
    const prevToken = newStack.length > 0 ? newStack[newStack.length - 1] : null;
    setPageTokenStack(newStack);
    setCurrentPage(prev => Math.max(1, prev - 1));
    fetchEmails(activeLabel, true, pageSize, prevToken);
  };

  const handleChangePageSize = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setPageTokenStack([]);
    setNextPageToken(null);
    fetchEmails(activeLabel, true, newSize, null);
  };

  const handleModifyEmail = async (emailId, addLabelIds = [], removeLabelIds = []) => {
    try {
      // Optimistic update
      const updateFn = (list) => {
        let newList = [];
        for (let m of list) {
          if (m.id === emailId) {
            let updatedLabels = [...(m.labelIds || [])];
            addLabelIds.forEach(l => { if (!updatedLabels.includes(l)) updatedLabels.push(l) });
            removeLabelIds.forEach(l => { updatedLabels = updatedLabels.filter(lbl => lbl !== l) });
            
            const isRemovedFromCurrentView = removeLabelIds.includes(activeLabel) || (addLabelIds.includes('TRASH') && activeLabel !== 'TRASH');
            if (!isRemovedFromCurrentView) {
              newList.push({ ...m, labelIds: updatedLabels });
            }
          } else {
            newList.push(m);
          }
        }
        return newList;
      };

      setEmails(prev => {
        const next = updateFn(prev);
        setEmailCache(c => ({ ...c, [activeLabel]: next }));
        return next;
      });

      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail(prev => {
          if (!prev) return null;
          let updatedLabels = [...(prev.labelIds || [])];
          addLabelIds.forEach(l => { if (!updatedLabels.includes(l)) updatedLabels.push(l); });
          updatedLabels = updatedLabels.filter(l => !removeLabelIds.includes(l));
          return { ...prev, labelIds: updatedLabels };
        });
      }

      await fetch(`/api/emails/${emailId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addLabelIds, removeLabelIds })
      });
      fetchUserLabels();
    } catch (e) {
      console.error('Failed to modify email:', e);
    }
  };

  const selectEmailAndProcess = async (email) => {
    setSelectedEmail(email);
    setCrmData(null);
    setIsProcessing(true);
    
    // Automatically mark as READ if unread
    if (email.labelIds?.includes('UNREAD')) {
      handleModifyEmail(email.id, [], ['UNREAD']);
    }

    try {
      const res = await fetch(`/api/process-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id })
      });
      const data = await res.json();
      setCrmData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwitchEngine = async (emailId, forceEngine, userInstruction = '') => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/process-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, forceEngine, userInstruction })
      });
      const data = await res.json();
      setCrmData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLabelChange = (newLabel) => {
    setActiveLabel(newLabel);
    setSelectedEmail(null);
    setCrmData(null);
    setCurrentPage(1);
    setPageTokenStack([]);
    setNextPageToken(null);
    fetchEmails(newLabel, true, pageSize, null);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminLoggedIn(true);
        // localStorage is no longer used for auth state security
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Server connection failed');
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch(`/api/admin/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout failed', e);
    }
    setIsAdminLoggedIn(false);
  };

  if (isInitializing) {
    return (
      <div className={`flex h-screen w-full items-center justify-center font-sans antialiased bg-[#f8f6f0] dark:bg-[#050505]`}>
        <div className="w-10 h-10 border-4 border-indigo-200 dark:border-white/10 border-t-indigo-600 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className={`flex h-screen w-full items-center justify-center font-sans antialiased bg-[#f8f6f0] dark:bg-[#050505] dark:text-slate-200 text-slate-800`}>
        <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-white/5 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-500 dark:text-gray-400">Please enter your credentials to access the CRM.</p>
          </div>
          
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Username</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full p-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-indigo-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {loginError && <p className="text-red-500 text-sm text-center font-medium">{loginError}</p>}
            
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors duration-200"
            >
              Log In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ height: '111.2vh' }}
      className={`flex w-full px-6 py-4 font-sans overflow-hidden antialiased selection:bg-indigo-500/30 dark:bg-[#020202] bg-[#f0eee9] dark:text-slate-200 text-slate-800`}
    >
      <ApiUsageWidget />
      <div className="flex w-full h-full rounded-3xl overflow-hidden shadow-2xl dark:shadow-black/50 border dark:border-white/5 border-gray-200 dark:bg-[#0a0a0a] bg-white relative">
        {/* Sidebar fixed-width toggle wrapper */}
        <div className={`${isSidebarCollapsed ? 'w-[70px]' : 'w-[240px]'} shrink-0 transition-all duration-300 ease-in-out h-full z-10 relative`}>
          <SlimSidebar 
            onCompose={() => setIsComposeOpen(true)} 
            activeLabel={activeLabel}
            onChangeLabel={handleLabelChange}
            userEmail={userEmail}
            accounts={accounts}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={handleAddAccount}
            onLogout={handleLogout}
            theme={theme}
            toggleTheme={toggleTheme}
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={toggleSidebar}
            onAdminLogout={handleAdminLogout}
          />
        </div>

        <PanelGroup direction="horizontal" className="w-full h-full flex-1 relative z-0">
        
        {activeLabel === 'AI_MODEL' ? (
          <Panel>
            <AiModelDashboard />
          </Panel>
        ) : activeLabel === 'COURSES_EXCEL' ? (
          <Panel>
            <CoursesExcelDashboard />
          </Panel>
        ) : activeLabel === 'MAIL_FORMATS' ? (
          <Panel>
            <MailFormatsDashboard />
          </Panel>
        ) : !isConnected ? (
           <Panel>
             <div className="flex-1 flex flex-col items-center justify-center h-full w-full">
               <h2 className="text-3xl font-semibold mb-2 dark:text-white text-slate-900 tracking-tight">Welcome to Presume Overseas</h2>
               <p className="dark:text-neutral-500 text-slate-500 mb-8 text-sm">Securely connect your Gmail to begin AI processing.</p>
               <button 
                 onClick={() => window.location.href = `/auth/google`}
                 className="px-8 py-3.5 dark:bg-white bg-indigo-600 dark:text-black text-white rounded-xl font-bold shadow-xl shadow-indigo-500/20 dark:shadow-white/10 hover:opacity-90 transition-opacity active:scale-95 cursor-pointer"
               >
                 Connect Gmail
               </button>
             </div>
           </Panel>
        ) : (
          <>
            {!selectedEmail ? (
              <Panel>
                <EmailList 
                  emails={emails} 
                  selectedEmail={selectedEmail} 
                  onSelect={selectEmailAndProcess} 
                  onRefresh={() => fetchEmails(activeLabel, true, pageSize, pageTokenStack.length > 0 ? pageTokenStack[pageTokenStack.length - 1] : null)}
                  isFetching={isFetching}
                  activeLabel={activeLabel}
                  onModifyEmail={handleModifyEmail}
                  pageSize={pageSize}
                  onChangePageSize={handleChangePageSize}
                  currentPage={currentPage}
                  hasNextPage={!!nextPageToken}
                  hasPrevPage={pageTokenStack.length > 0}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                />
              </Panel>
            ) : (
              <Panel>
                <ReadingPane 
                  email={selectedEmail} 
                  crmData={crmData}
                  setCrmData={setCrmData}
                  isProcessing={isProcessing} 
                  userLabels={userLabels}
                  onSwitchEngine={handleSwitchEngine}
                  onModifyEmail={handleModifyEmail}
                  onPreviewDraft={(data) => {
                    setComposeData(data);
                    setIsComposeOpen(true);
                  }}
                  onClose={() => setSelectedEmail(null)}
                />
              </Panel>
            )}
          </>
        )}
      </PanelGroup>

      </div>

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => {
          setIsComposeOpen(false);
          setTimeout(() => setComposeData(null), 300);
        }} 
        initialData={composeData}
      />

      {/* Floating Notification for AI Analysis */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 50, scale: 0.95, x: '-50%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-10 left-1/2 z-[9999] flex items-center gap-4 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md px-6 py-4 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-indigo-200 dark:border-white/10"
          >
            <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-indigo-500 opacity-20 animate-ping"></span>
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin relative z-10" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-neutral-200">Analyzing Inquiry...</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 font-medium">AI Engine is processing this email</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
