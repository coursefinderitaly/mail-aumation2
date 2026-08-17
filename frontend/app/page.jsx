"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import SlimSidebar from '../components/SlimSidebar';
import EmailList from '../components/EmailList';
import ReadingPane from '../components/ReadingPane';
import ComposeModal from '../components/ComposeModal';
import AiModelDashboard from '../components/ai/AiModelDashboard';
import CoursesExcelDashboard from '../components/CoursesExcelDashboard';
import MailFormatsDashboard from '../components/MailFormatsDashboard';

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

  const fetchEmails = async (label = activeLabel, showLoader = true) => {
    if (label === 'AI_MODEL' || label === 'COURSES_EXCEL' || label === 'MAIL_FORMATS') return;
    if (showLoader) setIsFetching(true);
    try {
      const res = await fetch(`/api/emails?label=${encodeURIComponent(label)}`);
      const data = await res.json();
      if (!data.error) {
        setEmailCache(prev => ({ ...prev, [label]: data }));
        // Only update current list if the user hasn't switched away
        setEmails(current => {
          return activeLabel === label ? data : current;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoader) setIsFetching(false);
    }
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
    setSelectedEmail(null); // Ensure open reading pane closes and returns to the email list view
    setCrmData(null);
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
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter password"
                required
              />
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
                  onRefresh={() => fetchEmails(activeLabel, true)}
                  isFetching={isFetching}
                  activeLabel={activeLabel}
                  onModifyEmail={handleModifyEmail}
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
    </div>
  );
}
