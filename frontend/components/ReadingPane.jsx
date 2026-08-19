import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// Basic HTML Sanitizer to prevent XSS
const sanitizeHtml = (html) => {
  if (!html) return '';
  let clean = html;
  // Remove script tags entirely
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove inline on* events
  clean = clean.replace(/ on\w+="[^"]*"/gi, '').replace(/ on\w+='[^']*'/gi, '').replace(/ on\w+=\w+/gi, '');
  // Remove javascript: URLs
  clean = clean.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  // Remove dangerous embed tags
  clean = clean.replace(/<(object|embed|iframe|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  return clean;
};

export default function ReadingPane({ email, crmData, setCrmData, isProcessing, userLabels = [], onSwitchEngine, onModifyEmail, onPreviewDraft, onClose }) {
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [coursesViewMode, setCoursesViewMode] = useState('sheet'); // 'sheet' or 'cards'
  const modalTableRef = useRef(null);
  const [expandedCourseIdx, setExpandedCourseIdx] = useState(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [modalUniFilter, setModalUniFilter] = useState('ALL');
  const [modalSearch, setModalSearch] = useState('');
  const [modalGroupByUni, setModalGroupByUni] = useState(false);
  const [modalSortBy, setModalSortBy] = useState('university');
  const [isPursuing, setIsPursuing] = useState(false);
  const [isGap, setIsGap] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeEngineMode, setActiveEngineMode] = useState('AI');
  const [chatInput, setChatInput] = useState('');
  const [showFiltersDetail, setShowFiltersDetail] = useState(false);
  const [filterSearches, setFilterSearches] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [logicForm, setLogicForm] = useState(null);
  const [isApplyingLogic, setIsApplyingLogic] = useState(false);
  const [logicChanged, setLogicChanged] = useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      sender: 'ai',
      text: '👋 Hi! I am your AI Course Filtering Assistant. Ask me to refine course shortlist (e.g. "Show only CS, AI and ML courses").',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    if (crmData?.studentData) {
      setLogicForm({ ...crmData.studentData });
      setIsPursuing(!!crmData.studentData.isPursuing);
      setIsGap(!!crmData.studentData.isGap);
      setLogicChanged(false);
    }
  }, [crmData?.studentData]);

  const handleLogicFieldChange = (key, val) => {
    setLogicForm(prev => {
      const updated = { ...(prev || {}), [key]: val };
      if (key === 'targetDegreeLevel') {
        if (val === 'Masters') {
          updated.highestEducation = 'Bachelors';
          if (!updated.bachelorDegree) updated.bachelorDegree = updated.class12Stream || 'BCA';
          if (!updated.bachelorScore) updated.bachelorScore = updated.class12Score || '70%';
        } else {
          updated.highestEducation = 'Class 12th';
          if (!updated.class12Stream) updated.class12Stream = updated.bachelorDegree || 'PCM';
          if (!updated.class12Score) updated.class12Score = updated.bachelorScore || '75%';
        }
      }
      return updated;
    });
    setLogicChanged(true);
    setApplySuccessMsg('');
  };

  const handleApplyLogic = async () => {
    if (!logicForm) return;
    setIsApplyingLogic(true);
    setApplySuccessMsg('');
    try {
      const payload = {
        ...logicForm,
        isPursuing: isPursuing,
        isGap: isGap
      };
      const res = await fetch(`/api/courses/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentData: payload })
      });
      const data = await res.json();
      if (data.matchedCourses) {
        setCrmData(prev => ({
          ...prev,
          studentData: data.studentData,
          matchedCourses: data.matchedCourses,
          appliedFilters: data.appliedFilters || prev.appliedFilters,
          aiReasoning: data.aiReasoning || prev.aiReasoning,
          profileLabels: data.profileLabels || prev.profileLabels,
          poiNotAvailable: data.poiNotAvailable ?? prev.poiNotAvailable,
          isNoCourseOptionsForPoi: data.isNoCourseOptionsForPoi ?? prev.isNoCourseOptionsForPoi,
          intakeRemarks: data.intakeRemarks || prev.intakeRemarks
        }));
        setLogicChanged(false);
        setApplySuccessMsg(`✓ Re-matched ${data.matchedCourses.length} courses!`);
        setTimeout(() => setApplySuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to apply logic:', err);
    } finally {
      setIsApplyingLogic(false);
    }
  };

  const modalUniqueUniversities = useMemo(() => {
    if (!crmData?.matchedCourses) return [];
    const counts = {};
    crmData.matchedCourses.forEach(c => {
      const u = c.universityName || 'Other University';
      counts[u] = (counts[u] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [crmData?.matchedCourses]);

  const filteredModalCourses = useMemo(() => {
    if (!crmData?.matchedCourses) return [];
    let list = [...crmData.matchedCourses];

    if (modalUniFilter !== 'ALL') {
      list = list.filter(c => (c.universityName || '') === modalUniFilter);
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      list = list.filter(c => 
        (c.universityName || '').toLowerCase().includes(q) ||
        (c.programName || '').toLowerCase().includes(q) ||
        (c.subField || '').toLowerCase().includes(q) ||
        (c.academicBackground || '').toLowerCase().includes(q)
      );
    }

    if (modalSortBy === 'university' || modalGroupByUni) {
      list.sort((a, b) => {
        const uComp = (a.universityName || '').localeCompare(b.universityName || '');
        if (uComp !== 0) return uComp;
        return (a.programName || '').localeCompare(b.programName || '');
      });
    } else if (modalSortBy === 'score') {
      list.sort((a, b) => {
        const pA = parseFloat(a.percentage) || 0;
        const pB = parseFloat(b.percentage) || 0;
        return pA - pB;
      });
    } else if (modalSortBy === 'name') {
      list.sort((a, b) => (a.programName || '').localeCompare(b.programName || ''));
    }

    return list;
  }, [crmData?.matchedCourses, modalUniFilter, modalSearch, modalSortBy, modalGroupByUni]);

  const groupedModalCourses = useMemo(() => {
    if (!modalGroupByUni) return null;
    const groups = {};
    filteredModalCourses.forEach(c => {
      const u = c.universityName || 'Other University';
      if (!groups[u]) groups[u] = [];
      groups[u].push(c);
    });
    return Object.entries(groups).map(([universityName, courses]) => ({
      universityName,
      courses
    }));
  }, [filteredModalCourses, modalGroupByUni]);

  useEffect(() => {
    if (crmData?.aiReasoning) {
      setChatHistory(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text === crmData.aiReasoning) return prev;
        return [
          ...prev,
          {
            id: Date.now(),
            sender: 'ai',
            text: crmData.aiReasoning,
            matchedCount: crmData.matchedCourses?.length ?? 0,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    }
  }, [crmData]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !onSwitchEngine || !email) return;
    const userText = chatInput.trim();
    setChatHistory(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'user',
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    onSwitchEngine(email.id, activeEngineMode, userText);
    setChatInput('');
  };

  const handleEngineToggle = () => {
    const nextMode = activeEngineMode === 'AI' ? 'LOCAL' : 'AI';
    setActiveEngineMode(nextMode);
    if (onSwitchEngine && email) {
      onSwitchEngine(email.id, nextMode);
    }
  };

  React.useEffect(() => {
    if (crmData?.studentData) {
      setIsPursuing(!!crmData.studentData.isPursuing);
      setIsGap(!!crmData.studentData.isGap);
    }
    if (crmData && crmData.studentData && allCourses.length === 0) {
      fetch(`/api/courses`)
        .then(res => res.json())
        .then(data => setAllCourses(data))
        .catch(err => console.error(err));
    }
  }, [crmData, allCourses.length]);

  const applyCrmFilters = (filters, coursesList) => {
    if (!coursesList) return [];
    let result = [...coursesList];
    filters.forEach(filter => {
      if (filter.status !== 'ACTIVE') return;
      const cols = filter.columnName.split(',').map(c => c.trim());
      const rawVal = (filter.exactKeyword || '').toLowerCase().replace(/['"]/g, '');
      if (!rawVal || rawVal.includes('any background') || rawVal.includes('no cutoff') || rawVal.includes('general')) return;

      result = result.filter(c => {
        if (filter.columnName === 'percentage') {
          const numMatch = rawVal.match(/(\d+(\.\d+)?)/);
          if (numMatch) {
            let num = parseFloat(numMatch[1]);
            if (num > 1) num = num / 100;
            let cVal = parseFloat(c.percentage) || 0;
            if (cVal > 1) cVal = cVal / 100;
            return cVal <= num;
          }
          return true;
        }

        if (filter.columnName === 'programLevel' || filter.columnName === 'category') {
          const cLvl = (c.programLevel || c.category || '').toLowerCase();
          const parts = rawVal.split(/,|\band\b|&|\|/).map(p => p.trim()).filter(Boolean);
          if (parts.length > 0) {
            return parts.some(p => {
              if (p.includes('master')) return cLvl.includes('master');
              if (p.includes('bachelor')) return !cLvl.includes('master');
              return cLvl.includes(p);
            });
          }
          if (rawVal.includes('master')) return cLvl.includes('master');
          if (rawVal.includes('bachelor')) return !cLvl.includes('master');
          return cLvl.includes(rawVal);
        }

        return cols.some(col => {
          const cVal = String(c[col] || '').toLowerCase();
          const parts = rawVal.split(/,|\band\b|&|\|/).map(p => p.trim()).filter(Boolean);
          if (parts.length > 0) {
            return parts.some(p => cVal.includes(p) || p.includes(cVal));
          }
          return cVal.includes(rawVal) || rawVal.includes(cVal);
        });
      });
    });
    return result;
  };

  const removeCourse = (e, programName) => {
    e.stopPropagation();
    setCrmData(prev => ({
      ...prev,
      matchedCourses: prev.matchedCourses.filter(c => c.programName !== programName)
    }));
  };

  const addCourse = (course) => {
    if (crmData.matchedCourses.some(c => c.programName === course.programName)) return;
    setCrmData(prev => ({
      ...prev,
      matchedCourses: [course, ...prev.matchedCourses]
    }));
    setShowAddCourse(false);
    setCourseSearch('');
  };

  const handleGeneratePreview = () => {
    if (!crmData || !email) return;
    const baseHtmlBody = generateTemplate(crmData, emailToName(email.from), isPursuing, isGap);
    
    // Append the original email as a quote block below our reply
    const quoteHtml = `<br><br><div class="gmail_quote" dir="auto">On ${new Date(email.date).toLocaleString()}, ${email.from} wrote:<br><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left-width:1px;border-left-style:solid;border-left-color:rgb(204,204,204);padding-left:1ex">${email.body}</blockquote></div>`;
    
    onPreviewDraft({
      to: email.rawFrom || email.from,
      subject: `Re: ${email.subject.replace(/^Re:\s*/i, '')}`,
      htmlBody: baseHtmlBody + quoteHtml,
      threadId: email.threadId,
      messageId: email.messageId,
      references: email.references
    });
  };

  const handleAutoReply = async () => {
    if (!crmData || !email) return;
    setIsSending(true);
    const htmlBody = generateTemplate(crmData, emailToName(email.from), isPursuing, isGap);
    
    try {
      const res = await fetch(`/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.rawFrom || email.from,
          subject: `Re: ${email.subject}`,
          htmlBody,
          threadId: email.threadId
        })
      });
      const data = await res.json();
      if (data.success) {
        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 3000);
      }
    } catch (e) {
      console.error('Auto reply failed', e);
    } finally {
      setIsSending(false);
    }
  };

  if (!email) {
    return (
      <div className="flex-1 flex h-full flex-col items-center justify-center dark:text-neutral-600 text-slate-400 dark:bg-[#050505] bg-[#fcfbf9]">
        <svg className="w-20 h-20 opacity-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        <p className="text-sm font-light tracking-wide dark:text-neutral-500 text-slate-400">Select a message to start reading</p>
      </div>
    );
  }

  const isStarred = email.labelIds?.includes('STARRED');
  const isUnread = email.labelIds?.includes('UNREAD');

  const toggleStar = () => {
    if (isStarred) {
      onModifyEmail(email.id, [], ['STARRED']);
    } else {
      onModifyEmail(email.id, ['STARRED'], []);
    }
  };

  const toggleReadStatus = () => {
    if (isUnread) {
      onModifyEmail(email.id, [], ['UNREAD']);
    } else {
      onModifyEmail(email.id, ['UNREAD'], []);
    }
  };

  const moveToTrash = () => {
    onModifyEmail(email.id, ['TRASH'], ['INBOX']);
    if (onClose) onClose();
  };

  const moveToSpam = () => {
    onModifyEmail(email.id, ['SPAM'], ['INBOX']);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setIsCreatingLabel(true);
    try {
      const res = await fetch(`/api/labels/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName.trim() })
      });
      const newLabel = await res.json();
      if (!newLabel.error) {
        onModifyEmail(email.id, [newLabel.id], []);
        setNewLabelName('');
      }
    } catch (e) {
      console.error('Failed to create label:', e);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const toggleUserLabel = (labelId) => {
    const hasLabel = email.labelIds?.includes(labelId);
    if (hasLabel) {
      onModifyEmail(email.id, [], [labelId]);
    } else {
      onModifyEmail(email.id, [labelId], []);
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col dark:bg-[#050505] bg-[#fcfbf9] relative">
      <AnimatePresence mode="wait">
        <motion.div 
          key={email.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="h-full flex flex-col overflow-hidden"
        >
          {/* Email Header */}
          <div className="px-6 md:px-10 py-6 flex justify-between items-start shrink-0 border-b dark:border-white/5 border-gray-100">
            <div className="flex items-start gap-4 max-w-[75%]">
              <button 
                onClick={onClose}
                title="Back to Inbox"
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-slate-500 dark:text-neutral-400 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h1 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 tracking-tight leading-tight">{email.subject}</h1>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-900 to-indigo-600 flex items-center justify-center text-sm font-bold border border-indigo-400/20 shadow-inner shrink-0 text-white">
                  {emailToName(email.from).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                    <p className="font-semibold text-sm dark:text-neutral-100 text-slate-800">{emailToName(email.from)}</p>
                    <span className="text-[10px] uppercase font-bold dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-200 px-2 py-0.5 rounded dark:text-neutral-400 text-slate-500 tracking-wider">External</span>
                    {email.isCourseOptionSent ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                        <span>Course Option Sended</span>
                      </span>
                    ) : email.isReadyToSend ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        <span>Analyzed • Ready to Send</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <span>Not Sended</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs dark:text-neutral-500 text-slate-500">{email.from} <span className="mx-2">•</span> {new Date(email.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
              </div>
            </div>
            
            {/* Header Action Toolbar */}
            <div className="flex items-center space-x-2 relative">
              {/* Zoom Buttons */}
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 2.5))}
                title="Zoom In"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border cursor-pointer dark:text-neutral-400 text-slate-400 dark:hover:text-white hover:text-slate-700 dark:hover:bg-white/10 hover:bg-gray-100 border-transparent dark:hover:border-white/10 hover:border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
                title="Zoom Out"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border cursor-pointer dark:text-neutral-400 text-slate-400 dark:hover:text-white hover:text-slate-700 dark:hover:bg-white/10 hover:bg-gray-100 border-transparent dark:hover:border-white/10 hover:border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
              </button>
              
              <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>

              {/* Star Button */}
              <button 
                onClick={toggleStar}
                title={isStarred ? "Unstar" : "Star"}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${isStarred ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'dark:text-neutral-400 text-slate-400 dark:hover:text-white hover:text-slate-700 dark:hover:bg-white/10 hover:bg-gray-100 border-transparent dark:hover:border-white/10 hover:border-gray-200'}`}
              >
                <svg className="w-4 h-4" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {/* Mark Read/Unread Button */}
              <button 
                onClick={toggleReadStatus}
                title={isUnread ? "Mark as Read" : "Mark as Unread"}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${isUnread ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30' : 'dark:text-neutral-400 text-slate-400 dark:hover:text-white hover:text-slate-700 dark:hover:bg-white/10 hover:bg-gray-100 border-transparent dark:hover:border-white/10 hover:border-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Apply Labels Menu Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowLabelMenu(!showLabelMenu)}
                  title="Apply Labels"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${showLabelMenu ? 'dark:bg-white/20 bg-gray-200 dark:text-white text-slate-900 border-transparent' : 'dark:text-neutral-400 text-slate-400 dark:hover:text-white hover:text-slate-700 dark:hover:bg-white/10 hover:bg-gray-100 border-transparent dark:hover:border-white/10 hover:border-gray-200'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </button>

                {/* Dropdown for Labels */}
                {showLabelMenu && (
                  <div className="absolute right-0 mt-2 w-48 dark:bg-[#141414] bg-white border dark:border-white/10 border-gray-200 rounded-2xl shadow-2xl p-2 z-50">
                    <p className="text-[10px] font-bold uppercase dark:text-neutral-500 text-slate-400 px-3 py-1.5 border-b dark:border-white/5 border-gray-100">Apply Labels</p>
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {userLabels.map(lbl => {
                        const isApplied = email.labelIds?.includes(lbl.id);
                        return (
                          <button 
                            key={lbl.id}
                            onClick={() => toggleUserLabel(lbl.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs dark:text-neutral-300 text-slate-600 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/10 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <span className="truncate">{lbl.name}</span>
                            {isApplied && <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>}
                          </button>
                        );
                      })}
                      {userLabels.length === 0 && (
                        <p className="text-[11px] dark:text-neutral-600 text-slate-400 px-3 py-2 italic">No custom labels created</p>
                      )}
                    </div>
                    <div className="p-2 border-t dark:border-white/5 border-gray-100">
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="New label name..."
                          className="flex-1 w-full dark:bg-[#1a1a1a] bg-gray-100 border dark:border-white/[0.08] border-gray-200 rounded-lg px-2 py-1.5 text-xs dark:text-neutral-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                          onKeyDown={(e) => { if(e.key === 'Enter') handleCreateLabel(); }}
                        />
                        <button
                          onClick={handleCreateLabel}
                          disabled={isCreatingLabel || !newLabelName.trim()}
                          className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center disabled:opacity-50 hover:bg-indigo-600 transition-colors cursor-pointer"
                        >
                          {isCreatingLabel ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Spam Button */}
              <button 
                onClick={moveToSpam}
                title="Report Spam"
                className="w-9 h-9 rounded-xl flex items-center justify-center dark:text-neutral-400 text-slate-400 hover:text-amber-500 dark:hover:bg-amber-900/30 hover:bg-amber-50 transition-all border border-transparent dark:hover:border-amber-900/40 hover:border-amber-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </button>

              {/* Delete / Trash Button */}
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                title="Move to Trash"
                className="w-9 h-9 rounded-xl flex items-center justify-center dark:text-neutral-400 text-slate-400 hover:text-red-500 dark:hover:bg-red-900/30 hover:bg-red-50 transition-all border border-transparent dark:hover:border-red-900/40 hover:border-red-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>

              {/* Close Button */}
              <button 
                onClick={onClose}
                title="Close Preview"
                className="w-9 h-9 rounded-xl flex items-center justify-center dark:text-neutral-400 text-slate-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/10 hover:bg-gray-100 transition-all border border-transparent dark:hover:border-white/10 hover:border-gray-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Email Content & CRM Split */}
          <div className="flex-1 flex overflow-hidden">
            <PanelGroup direction="horizontal" className="w-full h-full flex-1">
              <Panel defaultSize={65} minSize={40}>
                <div className="h-full overflow-y-auto px-10 md:px-14 py-10 w-full flex flex-col justify-between">
                  <div>
                    {/* Attachments Display Section */}
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mb-8 p-6 rounded-2xl dark:bg-[#141414] bg-indigo-50/50 border dark:border-white/10 border-indigo-100 shadow-sm">
                        <div className="flex items-center justify-between pb-3.5 mb-4 border-b dark:border-white/10 border-indigo-200/60">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            <span>Attached Files & Documents ({email.attachments.length})</span>
                          </h4>
                          <span className="text-[11px] dark:text-neutral-400 text-slate-500 font-medium italic">Click any file below to open / download</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {email.attachments.map((att, idx) => (
                            <a 
                              key={idx}
                              href={`/api/emails/${email.id}/attachments/${att.attachmentId}?filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center justify-between p-3.5 rounded-xl dark:bg-[#1f1f1f] bg-white border dark:border-white/10 border-gray-200 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer no-underline"
                            >
                              <div className="flex items-center space-x-3 min-w-0 pr-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-extrabold text-sm shadow-inner">
                                  📎
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold dark:text-neutral-100 text-slate-800 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={att.filename}>
                                    {att.filename}
                                  </span>
                                  <span className="text-[10px] dark:text-neutral-400 text-slate-500 uppercase font-semibold mt-0.5">
                                    {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'File'} • {att.mimeType ? att.mimeType.split('/').pop().toUpperCase().slice(0, 8) : 'DOC'}
                                  </span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Prose style for dark and light modes */}
                    <div 
                      style={{ zoom: zoomLevel }}
                      className={`prose dark:prose-invert max-w-full leading-relaxed font-sans email-body-content ${email.body ? '' : 'text-slate-800 dark:text-neutral-200'}`} 
                      dangerouslySetInnerHTML={{__html: sanitizeHtml(email.body || email.snippet)}} 
                    />
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-white/10 hover:bg-indigo-500 cursor-col-resize transition-colors z-30 relative" />
              <Panel defaultSize={35} minSize={25} maxSize={50}>
                {/* CRM Right Sidebar */}
                <div className="h-full border-l dark:border-white/[0.03] border-gray-200/60 dark:bg-[#0a0a0c] bg-[#fafaf9] p-4 lg:p-6 overflow-y-auto custom-scrollbar flex flex-col w-full relative">
                  {/* Subtle background glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

                  {/* CRM Right Sidebar Header & Actions */}
                  <div className="shrink-0 mb-5 pb-5 border-b dark:border-white/[0.05] border-gray-200/50 space-y-4 relative z-10">
                    {/* Primary Preview Draft Button at TOP */}
                    {crmData && crmData.studentData && (
                      <button 
                        onClick={handleGeneratePreview}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transform hover:-translate-y-0.5 overflow-hidden group border-none"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl"></div>
                        <svg className="w-4 h-4 mr-2 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="relative z-10 tracking-wide uppercase">Generate Draft Response</span>
                      </button>
                    )}

                    {/* Header Title + Action Buttons Row */}
                    <div className="flex flex-col gap-2.5">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.15em] bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent flex items-center truncate">
                        <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                        <span>AI Engine Analysis</span>
                      </h3>

                      {/* Wrapped Action Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            if (onSwitchEngine && email) onSwitchEngine(email.id, activeEngineMode);
                          }}
                          disabled={isProcessing}
                          title="Re-analyze this email"
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm dark:bg-[#1a1a20] bg-white dark:text-neutral-300 text-slate-700 dark:border-white/5 border-gray-200/80 border hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                        >
                          <span>🔄 Re-analyze</span>
                        </button>

                        <button
                          onClick={() => setShowChatModal(!showChatModal)}
                          title="Open Draggable AI Chat Window"
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                            showChatModal 
                              ? 'dark:bg-purple-500/20 bg-purple-100 text-purple-700 dark:text-purple-300 border-purple-500/30' 
                              : 'dark:bg-[#1a1a20] bg-white dark:text-neutral-300 text-slate-700 dark:border-white/5 border-gray-200/80 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                          <span>AI Chat</span>
                        </button>

                        <button
                          onClick={handleEngineToggle}
                          disabled={isProcessing}
                          title="Switch analysis between Groq AI & Local Rules Engine"
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                            activeEngineMode === 'AI'
                              ? 'dark:bg-indigo-500/20 bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                              : 'dark:bg-emerald-500/20 bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          } disabled:opacity-50`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${activeEngineMode === 'AI' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
                          <span>{activeEngineMode === 'AI' ? 'AI Mode' : 'Local Mode'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isProcessing ? (
                    <div className="animate-pulse space-y-6 flex-1 relative z-10">
                      <div className="h-32 dark:bg-white/[0.03] bg-gray-200/50 rounded-2xl border dark:border-white/5 border-transparent"></div>
                      <div className="h-48 dark:bg-white/[0.03] bg-gray-200/50 rounded-2xl border dark:border-white/5 border-transparent"></div>
                    </div>
                  ) : crmData && crmData.studentData ? (
                    <div className="space-y-4 flex-1 flex flex-col min-h-0 relative z-10">

                      
                      {/* AI Profile Understanding & Logic Details Control Center */}
                      <div className="shrink-0 rounded-2xl p-4 md:p-5 bg-white/70 dark:bg-[#121216]/80 backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.04] shadow-[0_4px_24px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative overflow-hidden group">
                        
                        {/* Decorative background flair */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors duration-700 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-4 relative z-10">
                           <div className="flex items-center space-x-2">
                             <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"></span>
                             <h4 className="text-[11px] uppercase tracking-[0.15em] dark:text-neutral-300 text-slate-700 font-extrabold flex items-center">
                               AI Profile Understanding & Logic
                             </h4>
                           </div>
                           <div className="flex items-center space-x-2">
                             <div className="flex items-center space-x-3 bg-gray-100/60 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-white/5">
                               <label className="flex items-center space-x-1.5 text-[10px] font-bold dark:text-neutral-300 text-slate-600 cursor-pointer select-none">
                                 <input 
                                   type="checkbox" 
                                   checked={isPursuing} 
                                   onChange={(e) => {
                                     setIsPursuing(e.target.checked);
                                     setLogicChanged(true);
                                   }} 
                                   className="rounded text-indigo-500 focus:ring-indigo-400 bg-white dark:bg-black/40 border-gray-300 dark:border-white/20 w-3 h-3" 
                                 />
                                 <span>Pursuing</span>
                               </label>
                               <label className="flex items-center space-x-1.5 text-[10px] font-bold dark:text-neutral-300 text-slate-600 cursor-pointer select-none">
                                 <input 
                                   type="checkbox" 
                                   checked={isGap} 
                                   onChange={(e) => {
                                     setIsGap(e.target.checked);
                                     setLogicChanged(true);
                                   }} 
                                   className="rounded text-amber-500 focus:ring-amber-400 bg-white dark:bg-black/40 border-gray-300 dark:border-white/20 w-3 h-3" 
                                 />
                                 <span>Gap</span>
                               </label>
                             </div>
                           </div>
                        </div>

                        {logicForm && (
                          <div className="grid grid-cols-2 gap-2.5 relative z-10 text-xs">
                            {/* Learner Name */}
                            <div className="flex flex-col">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Learner Name</label>
                              <input 
                                type="text"
                                value={logicForm.learnerName || ''}
                                onChange={(e) => handleLogicFieldChange('learnerName', e.target.value)}
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Target Degree Level */}
                            <div className="flex flex-col">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Target Degree Level</label>
                              <select 
                                value={logicForm.targetDegreeLevel || 'Masters'}
                                onChange={(e) => handleLogicFieldChange('targetDegreeLevel', e.target.value)}
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                <option value="Masters">Masters (Postgraduate)</option>
                                <option value="Bachelor">Bachelor (Undergraduate)</option>
                              </select>
                            </div>

                            {/* Program of Interest */}
                            <div className="flex flex-col col-span-2">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Program of Interest / Keywords</label>
                              <input 
                                type="text"
                                value={logicForm.programOfInterest || ''}
                                onChange={(e) => handleLogicFieldChange('programOfInterest', e.target.value)}
                                placeholder="e.g. cs and data analyst, biotechnology, management..."
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Background Degree / Stream */}
                            <div className="flex flex-col">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">
                                {logicForm.targetDegreeLevel === 'Masters' ? "Bachelor's Degree / Stream" : "12th Stream"}
                              </label>
                              <input 
                                type="text"
                                value={logicForm.targetDegreeLevel === 'Masters' ? (logicForm.bachelorDegree || '') : (logicForm.class12Stream || '')}
                                onChange={(e) => handleLogicFieldChange(logicForm.targetDegreeLevel === 'Masters' ? 'bachelorDegree' : 'class12Stream', e.target.value)}
                                placeholder={logicForm.targetDegreeLevel === 'Masters' ? "e.g. BCA, B.Tech, B.Sc" : "e.g. PCM, PCB, Commerce"}
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Qualifying Score */}
                            <div className="flex flex-col">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">
                                {logicForm.targetDegreeLevel === 'Masters' ? "Bachelor's Score (%)" : "Class 12th Score (%)"}
                              </label>
                              <input 
                                type="text"
                                value={logicForm.targetDegreeLevel === 'Masters' ? (logicForm.bachelorScore || '') : (logicForm.class12Score || '')}
                                onChange={(e) => handleLogicFieldChange(logicForm.targetDegreeLevel === 'Masters' ? 'bachelorScore' : 'class12Score', e.target.value)}
                                placeholder="e.g. 71.17% or 88%"
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            {/* Specialization / University / 11th Score */}
                            {logicForm.targetDegreeLevel === 'Masters' ? (
                              <>
                                <div className="flex flex-col col-span-2 sm:col-span-1">
                                  <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Bachelor Specialization</label>
                                  <input 
                                    type="text"
                                    value={logicForm.bachelorProgram || ''}
                                    onChange={(e) => handleLogicFieldChange('bachelorProgram', e.target.value)}
                                    placeholder="e.g. Bachelors of Computer Science"
                                    className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                                  />
                                </div>
                                <div className="flex flex-col col-span-2 sm:col-span-1">
                                  <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Graduation Year</label>
                                  <input 
                                    type="text"
                                    value={logicForm.graduationYear || ''}
                                    onChange={(e) => handleLogicFieldChange('graduationYear', e.target.value)}
                                    placeholder="e.g. 2018"
                                    className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col col-span-2 sm:col-span-1">
                                  <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">11th Score (%)</label>
                                  <input 
                                    type="text"
                                    value={logicForm.class11Score || ''}
                                    onChange={(e) => handleLogicFieldChange('class11Score', e.target.value)}
                                    placeholder="e.g. 74%"
                                    className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="flex flex-col col-span-2 sm:col-span-1">
                                  <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Passing Year</label>
                                  <input 
                                    type="text"
                                    value={logicForm.class12Year || ''}
                                    onChange={(e) => handleLogicFieldChange('class12Year', e.target.value)}
                                    placeholder="e.g. 2025"
                                    className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </>
                            )}

                            {/* Target Country & Intake */}
                            <div className="flex flex-col">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Target Country</label>
                              <input 
                                type="text"
                                value={logicForm.eligibilityCountry || 'Italy'}
                                onChange={(e) => handleLogicFieldChange('eligibilityCountry', e.target.value)}
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold mb-1">Intake Target</label>
                              <input 
                                type="text"
                                value={logicForm.intakePitched || 'Sept 2027'}
                                onChange={(e) => handleLogicFieldChange('intakePitched', e.target.value)}
                                className="bg-white/80 dark:bg-[#1a1a1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* Apply Logic Changes Action Bar */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between relative z-10">
                          <div className="flex items-center space-x-2">
                            {logicChanged && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-ping"></span>
                                Modified logic
                              </span>
                            )}
                            {applySuccessMsg && (
                              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center animate-pulse">
                                {applySuccessMsg}
                              </span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleApplyLogic}
                            disabled={isApplyingLogic}
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer ${
                              logicChanged 
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                            }`}
                          >
                            {isApplyingLogic ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Re-matching...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <span>Apply Logic & Re-Match</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* AI Reasoning & Applied Excel Filters Section */}
                      {activeEngineMode === 'AI' && (
                        <div className="shrink-0 rounded-2xl p-4 md:p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 backdrop-blur-xl border border-indigo-100/60 dark:border-indigo-500/10 shadow-sm relative space-y-3">
                          <div>
                            <h4 className="text-[10px] uppercase tracking-[0.15em] dark:text-indigo-400/80 text-indigo-600/80 font-extrabold mb-3 flex items-center justify-between">
                              <span className="flex items-center">
                                <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                Algorithm Logic
                              </span>
                            </h4>
                            {crmData.aiReasoning ? (
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                {crmData.aiReasoning.split(' | ').map((part, i) => {
                                  const [label, ...val] = part.split(': ');
                                  return (
                                    <div key={i} className="bg-white/80 dark:bg-black/20 border border-white/40 dark:border-white/5 rounded-xl px-3 py-2 flex flex-col justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-md transition-shadow">
                                      <span className="text-[8px] uppercase tracking-[0.1em] dark:text-indigo-400/60 text-indigo-500/70 font-extrabold leading-none mb-1">{label}</span>
                                      <span className="text-[10px] font-black dark:text-indigo-300 text-indigo-800 leading-tight truncate">{val.join(': ')}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[11px] dark:text-neutral-300 text-slate-700 leading-snug font-medium line-clamp-2">
                                Waiting for AI reasoning... If this persists, re-analyze or check Groq API configuration.
                              </p>
                            )}
                          </div>

                          {/* Applied Excel Sheet Filters Breakdown (Collapsible & Scrollable) */}
                          {crmData.appliedFilters && (
                            <div className="pt-1.5 border-t dark:border-white/10 border-indigo-100/80">
                              <button 
                                onClick={() => setShowFiltersDetail(!showFiltersDetail)}
                                className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider dark:text-neutral-400 text-slate-500 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-0.5 cursor-pointer"
                              >
                                <span className="flex items-center">
                                  <svg className="w-3 h-3 mr-1.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                  Active Excel Shortlist Filters
                                </span>
                                <span className="flex items-center space-x-1.5">
                                  <span className="text-[9px] dark:bg-emerald-500/20 bg-emerald-100 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">{crmData.appliedFilters.length} Rules</span>
                                  <svg className={`w-3 h-3 transition-transform ${showFiltersDetail ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </span>
                              </button>

                              {showFiltersDetail && (
                                <div className="mt-2 space-y-2 pb-2">
                                  {crmData.appliedFilters.map((f, idx) => {
                                    const availableColumns = ["backgroundField", "programName, interestedField, subField", "programLevel", "percentage", "universityName", "programName", "interestedField", "subField", "duration"];
                                    const colOptions = allCourses ? Array.from(new Set(
                                      allCourses.flatMap(c => 
                                        f.columnName.split(',').map(col => String(c[col.trim()] || '')).filter(Boolean)
                                      )
                                    )).sort() : [];

                                    return (
                                    <div key={idx} className="dark:bg-[#121212] bg-white border dark:border-white/[0.08] border-indigo-100/80 rounded-xl p-2.5 text-xs space-y-2 shadow-2xs group">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1 flex-1 mr-2">
                                          <span className="text-[9px] font-bold dark:text-indigo-300 text-indigo-700 opacity-60 shrink-0">{f.stage}:</span>
                                          <select 
                                            value={f.columnName}
                                            onChange={(e) => {
                                              const newFilters = [...crmData.appliedFilters];
                                              newFilters[idx].columnName = e.target.value;
                                              newFilters[idx].exactKeyword = ''; // reset on column change
                                              setCrmData(prev => ({...prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters(newFilters, allCourses)}));
                                            }}
                                            className="ml-1 bg-indigo-50 dark:bg-white/10 border-none dark:text-neutral-200 text-indigo-900 px-1.5 py-1 rounded text-[9px] font-mono font-bold focus:ring-1 focus:ring-indigo-400 max-w-[220px] truncate cursor-pointer"
                                          >
                                            {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                          </select>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded dark:bg-emerald-500/15 bg-emerald-50 dark:text-emerald-400 text-emerald-700 border dark:border-emerald-500/30 border-emerald-200">
                                            {f.status}
                                          </span>
                                          <button onClick={() => {
                                              const newFilters = [...crmData.appliedFilters];
                                              newFilters.splice(idx, 1);
                                              setCrmData(prev => ({...prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters(newFilters, allCourses)}));
                                          }} className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col space-y-1 dark:bg-indigo-500/10 bg-indigo-50/80 px-2 py-1.5 rounded-md border dark:border-indigo-500/20 border-indigo-200/60 my-1">
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider dark:text-indigo-400 text-indigo-600">Exact Value:</span>
                                        {colOptions.length > 0 && !f.columnName.includes('percentage') ? (() => {
                                          const currentVals = f.exactKeyword.split('|').map(s=>s.trim().replace(/['"]/g, '')).filter(Boolean);
                                          return (
                                          <div className="flex flex-col mt-1 relative">
                                            {currentVals.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mb-1.5">
                                                {currentVals.map((v, idxVal) => {
                                                  let displayV = v;
                                                  if (v.toLowerCase() === 'general') displayV = 'General (All Programs)';
                                                  if (v.toLowerCase() === 'any background') displayV = 'Any Background (All)';
                                                  if (v.toLowerCase().includes('no cutoff')) displayV = 'No Cutoff (Skipped)';
                                                  
                                                  return (
                                                  <span key={idxVal} className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded flex items-center border dark:border-indigo-500/30 border-indigo-200">
                                                    {displayV} 
                                                    <button onClick={() => {
                                                      const newVals = currentVals.filter(val => val !== v);
                                                      const newFilters = [...crmData.appliedFilters];
                                                      newFilters[idx].exactKeyword = newVals.join(' | ');
                                                      setCrmData(prev => ({...prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters(newFilters, allCourses)}));
                                                    }} className="ml-1 hover:text-red-500 dark:hover:text-red-400 font-black cursor-pointer">&times;</button>
                                                  </span>
                                                  );
                                                })}
                                              </div>
                                            )}
                                            
                                            <button 
                                              onClick={() => setOpenDropdowns(prev => ({...prev, [idx]: !prev[idx]}))}
                                              className="w-full text-left bg-white dark:bg-[#1a1a1a] border dark:border-white/10 border-indigo-200 rounded px-2 py-1.5 text-xs font-mono font-bold dark:text-emerald-300 text-emerald-700 focus:outline-none focus:border-indigo-400 flex justify-between items-center shadow-xs transition-colors hover:bg-indigo-50 dark:hover:bg-white/5 cursor-pointer"
                                            >
                                              <span className="opacity-80">Select options...</span>
                                              <svg className={`w-3 h-3 transition-transform ${openDropdowns[idx] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </button>

                                            {openDropdowns[idx] && (
                                              <div className="absolute z-50 top-full left-0 w-full mt-1.5 border dark:border-white/10 border-indigo-200 rounded p-2 bg-white dark:bg-[#1a1a1a] shadow-xl flex flex-col space-y-2">
                                                <input 
                                                  type="text" 
                                                  placeholder="Search options..."
                                                  value={filterSearches[idx] || ''}
                                                  onChange={(e) => setFilterSearches(prev => ({...prev, [idx]: e.target.value}))}
                                                  className="w-full bg-gray-50 dark:bg-white/5 border dark:border-white/10 border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 dark:text-neutral-200 text-slate-800"
                                                />
                                                <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                  {colOptions.filter(opt => opt.toLowerCase().includes((filterSearches[idx] || '').toLowerCase())).map((opt, i) => {
                                                    const isChecked = currentVals.includes(opt);
                                                    return (
                                                      <label key={i} className="flex items-center space-x-2 text-[10px] cursor-pointer hover:bg-indigo-50 dark:hover:bg-white/5 p-1 rounded transition-colors">
                                                        <input 
                                                          type="checkbox" 
                                                          checked={isChecked}
                                                          onChange={(e) => {
                                                            let newVals = [...currentVals];
                                                            if (e.target.checked) {
                                                              newVals.push(opt);
                                                            } else {
                                                              newVals = newVals.filter(v => v !== opt);
                                                            }
                                                            
                                                            const newFilters = [...crmData.appliedFilters];
                                                            newFilters[idx].exactKeyword = newVals.join(' | ');
                                                            setCrmData(prev => ({...prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters(newFilters, allCourses)}));
                                                          }}
                                                          className="rounded text-indigo-500 focus:ring-indigo-400 bg-transparent border-gray-300 dark:border-white/20 w-3 h-3 shrink-0"
                                                        />
                                                        <span className="dark:text-neutral-300 text-slate-700 font-semibold truncate leading-tight flex-1" title={opt}>{opt}</span>
                                                      </label>
                                                    );
                                                  })}
                                                  {colOptions.filter(opt => opt.toLowerCase().includes((filterSearches[idx] || '').toLowerCase())).length === 0 && (
                                                    <div className="text-center py-2 text-[10px] dark:text-neutral-500 text-slate-400 italic">No options found.</div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          );
                                        })() : (
                                          <input 
                                            type="text" 
                                            value={f.exactKeyword}
                                            onChange={(e) => {
                                              const newFilters = [...crmData.appliedFilters];
                                              newFilters[idx].exactKeyword = e.target.value;
                                              setCrmData(prev => ({...prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters(newFilters, allCourses)}));
                                            }}
                                            placeholder={f.columnName === 'percentage' ? "<= 65.0%" : "Type custom comma-separated values..."}
                                            className="w-full bg-white dark:bg-[#1a1a1a] border dark:border-white/10 border-indigo-200 rounded px-1.5 py-1 text-xs font-mono font-bold dark:text-emerald-300 text-emerald-700 focus:outline-none focus:border-indigo-400 mt-1"
                                          />
                                        )}
                                      </div>
                                    </div>
                                    );
                                  })}
                                  
                                  <div className="flex items-center justify-start pt-2">
                                    <button 
                                      onClick={() => {
                                        const newFilters = [...(crmData.appliedFilters || [])];
                                        newFilters.push({
                                          stage: `Stage ${newFilters.length + 1}`,
                                          columnName: 'backgroundField',
                                          exactKeyword: '',
                                          filterApplied: 'Manual Filter',
                                          action: 'Custom user filter',
                                          status: 'ACTIVE'
                                        });
                                        setCrmData(prev => ({...prev, appliedFilters: newFilters}));
                                      }}
                                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center transition-colors cursor-pointer"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                      Add Filter
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Course Matches Section */}
                      <div className="flex-1 flex flex-col pt-2">
                        <h4 className="text-[10px] uppercase tracking-wider dark:text-neutral-500 text-slate-400 font-bold mb-3 flex items-center justify-between shrink-0">
                          <span className="flex items-center">
                            Recommended Courses
                            <span className="ml-2 bg-indigo-500 text-white shadow-md shadow-indigo-500/20 px-2 py-0.5 rounded-full">{crmData.matchedCourses.length}</span>
                          </span>
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => setShowAddCourse(true)}
                              className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs normal-case font-semibold flex items-center transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                              Add
                            </button>
                            {crmData.matchedCourses.length > 0 && (
                              <button 
                                onClick={() => setShowAllCourses(true)}
                                className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs normal-case font-semibold flex items-center transition-colors cursor-pointer"
                              >
                                Expand
                                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                              </button>
                            )}
                          </div>
                        </h4>
                        
                        <div className="space-y-3 pb-2 relative z-0">
                          {crmData.matchedCourses.map((course, idx) => (
                            <div key={course._id || idx} className="group dark:bg-[#141414] bg-white border dark:border-white/[0.08] border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <button onClick={(e) => removeCourse(e, course.programName)} className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 dark:hover:bg-red-500/20 hover:bg-red-100 dark:text-red-400 text-red-600 transition-all cursor-pointer z-10" title="Remove course">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                              <div className="flex justify-between items-start mb-2 pr-6">
                                <h5 className="font-bold text-sm dark:text-neutral-100 text-slate-800 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 pr-3">{course.programName}</h5>
                                <span className="text-[9px] font-bold dark:bg-white/10 bg-gray-100 dark:text-neutral-200 text-slate-700 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">{course.duration}</span>
                              </div>
                              <p className="text-xs font-medium dark:text-neutral-400 text-slate-500 mb-3">{course.universityName}</p>
                              
                              <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t dark:border-white/[0.04] border-gray-100">
                                {course.subField && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-600 border dark:border-emerald-500/20 border-emerald-200/50">{course.subField}</span>}
                                {course.languageRequirement && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md dark:bg-amber-500/10 bg-amber-50 dark:text-amber-400 text-amber-600 border dark:border-amber-500/20 border-amber-200/50">{course.languageRequirement}</span>}
                                {course.admissionTest && course.admissionTest.toLowerCase() !== 'no' && course.admissionTest.toLowerCase() !== 'none' && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md dark:bg-purple-500/10 bg-purple-50 dark:text-purple-400 text-purple-600 border dark:border-purple-500/20 border-purple-200/50">{course.admissionTest}</span>}
                              </div>
                            </div>
                          ))}
                          {crmData.matchedCourses.length === 0 && (
                            <div className="p-6 border border-dashed dark:border-white/10 border-gray-300 rounded-2xl text-center mt-2">
                              <p className="text-xs dark:text-neutral-500 text-slate-400">
                                {crmData.missing11thScore 
                                  ? 'Missing 11th Percentage for Pursuing Student.' 
                                  : 'No matching programs found for this profile.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : crmData && !crmData.studentData ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed dark:border-white/10 border-gray-300 rounded-3xl dark:bg-white/[0.01] bg-gray-50/50">
                      <div className="w-12 h-12 rounded-full dark:bg-indigo-500/10 bg-indigo-50 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 dark:text-indigo-400 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h4 className="text-sm font-bold dark:text-neutral-200 text-slate-800 mb-2">No Profile Detected</h4>
                      <p className="text-xs dark:text-neutral-500 text-slate-500 leading-relaxed">The AI Engine didn't find any structured student information in this email. It might be a general inquiry or a non-student related message.</p>
                    </div>
                  ) : (
                    <div className="text-xs dark:text-neutral-600 text-slate-400 text-center py-12 border border-dashed dark:border-white/5 border-gray-200 rounded-2xl flex-1 flex items-center justify-center">
                      Analysis engine standing by.
                    </div>
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Expand Courses Modal */}
      {showAllCourses && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6" onClick={() => setShowAllCourses(false)}>
          <div 
            className="w-full max-w-6xl max-h-[90vh] flex flex-col dark:bg-[#0c0c0e] bg-white border dark:border-white/10 border-gray-200 rounded-3xl shadow-2xl overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b dark:border-white/10 border-gray-100 flex flex-wrap justify-between items-center bg-gray-50/80 dark:bg-white/[0.02] gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center">
                    All Recommended Courses
                    <span className="ml-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 text-xs font-black rounded-full border border-indigo-500/20">{filteredModalCourses.length}</span>
                    {filteredModalCourses.length !== (crmData?.matchedCourses?.length || 0) && (
                      <span className="ml-1.5 text-[10px] text-slate-400 font-bold">of {crmData?.matchedCourses?.length || 0}</span>
                    )}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">Preview matching university courses categorized and grouped by university.</p>
                </div>
              </div>

              {/* Controls: View Switcher, Sheet Shift, Close */}
              <div className="flex items-center space-x-2">
                {/* View Switcher */}
                <div className="flex items-center bg-gray-200/70 dark:bg-white/10 p-1 rounded-xl">
                  <button 
                    onClick={() => setCoursesViewMode('sheet')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${coursesViewMode === 'sheet' ? 'bg-white dark:bg-black/60 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'}`}
                  >
                    Excel Sheet
                  </button>
                  <button 
                    onClick={() => setCoursesViewMode('cards')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${coursesViewMode === 'cards' ? 'bg-white dark:bg-black/60 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'}`}
                  >
                    Cards
                  </button>
                </div>

                {/* Shift Sheet Buttons (when in sheet view) */}
                {coursesViewMode === 'sheet' && (
                  <div className="flex items-center space-x-1 pl-2 border-l dark:border-white/10 border-gray-200">
                    <button 
                      onClick={() => { if (modalTableRef.current) modalTableRef.current.scrollBy({ left: -300, behavior: 'smooth' }); }}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-white/10 transition-all"
                      title="Shift Left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button 
                      onClick={() => { if (modalTableRef.current) modalTableRef.current.scrollBy({ left: 300, behavior: 'smooth' }); }}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-white/10 transition-all"
                      title="Shift Right"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setShowAllCourses(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl dark:bg-white/5 bg-gray-100 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors cursor-pointer ml-2"
                >
                  <svg className="w-4 h-4 dark:text-neutral-400 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* University Filter & Grouping Toolbar */}
            <div className="px-6 py-2.5 border-b dark:border-white/10 border-gray-200/80 bg-white/90 dark:bg-[#111115]/90 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* University Filter Dropdown */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 flex items-center">
                    <span className="mr-1">🏛️</span> University:
                  </span>
                  <select
                    value={modalUniFilter}
                    onChange={(e) => setModalUniFilter(e.target.value)}
                    className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[210px] truncate"
                  >
                    <option value="ALL">All Universities ({crmData?.matchedCourses?.length || 0})</option>
                    {modalUniqueUniversities.map(u => (
                      <option key={u.name} value={u.name}>
                        {u.name} ({u.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Group by University Toggle */}
                <button
                  type="button"
                  onClick={() => setModalGroupByUni(!modalGroupByUni)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                    modalGroupByUni 
                      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-xs'
                      : 'bg-gray-100 dark:bg-white/5 text-slate-600 dark:text-neutral-400 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                  title="Group courses from the same university together"
                >
                  <span>🏛️</span>
                  <span>Group Same University</span>
                  <span className={`w-2 h-2 rounded-full ${modalGroupByUni ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-gray-400'}`}></span>
                </button>

                {/* Sort By Dropdown */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">⇅ Sort:</span>
                  <select
                    value={modalSortBy}
                    onChange={(e) => setModalSortBy(e.target.value)}
                    className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="university">University Name (A-Z)</option>
                    <option value="score">Min Score (% Low-High)</option>
                    <option value="name">Program Name (A-Z)</option>
                    <option value="default">AI Match Rank</option>
                  </select>
                </div>
              </div>

              {/* Search & Reset */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search courses / uni..."
                    className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40 sm:w-52"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                {(modalUniFilter !== 'ALL' || modalSearch.trim()) && (
                  <button
                    onClick={() => { setModalUniFilter('ALL'); setModalSearch(''); }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            {/* Modal Content */}
            {coursesViewMode === 'sheet' ? (
              /* Excel Sheet View with full horizontal shift */
              <div 
                ref={modalTableRef}
                className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/50 dark:bg-[#0c0c0e]"
              >
                <table className="w-full text-left text-xs whitespace-nowrap min-w-max border-separate border-spacing-0">
                  <thead className="sticky top-0 z-30 bg-slate-100/95 dark:bg-[#18181c]/95 backdrop-blur-md text-slate-600 dark:text-neutral-300 uppercase font-black text-[10px] shadow-sm">
                    <tr>
                      <th className="sticky left-0 z-40 bg-slate-200 dark:bg-[#1f1f25] px-3 py-2.5 border-b border-gray-200 dark:border-white/10 text-center w-12">#</th>
                      <th className="sticky left-12 z-40 bg-slate-100 dark:bg-[#18181c] px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">University Name</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[100px]">Level</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[90px]">Duration</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[250px]">Program Name</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[120px]">Min Score</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[130px]">Lang Req</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[130px]">Other Req</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[190px]">Admission Test/Interview</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[130px]">App Fees</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[160px]">Tentative Months</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[150px]">Sub Field</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 min-w-[180px]">Academic Background</th>
                      <th className="px-3 py-2.5 border-b border-gray-200 dark:border-white/10 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-0">
                    {filteredModalCourses.map((course, idx) => {
                      const isNewUniversity = idx > 0 && (course.universityName || '') !== (filteredModalCourses[idx - 1]?.universityName || '');
                      return (
                        <tr 
                          key={course._id || idx} 
                          className={`hover:bg-indigo-500/5 dark:hover:bg-white/[0.03] transition-colors group ${
                            isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : 'border-0'
                          }`}
                        >
                          <td className={`sticky left-0 z-20 bg-white dark:bg-[#0c0c0e] group-hover:bg-indigo-50/50 dark:group-hover:bg-[#151518] px-3 py-2.5 text-center text-[10px] font-bold text-slate-400 dark:text-neutral-500 ${
                            isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''
                          }`}>
                            {idx + 1}
                          </td>
                          <td className={`sticky left-12 z-20 bg-white dark:bg-[#0c0c0e] group-hover:bg-indigo-50/50 dark:group-hover:bg-[#151518] px-3 py-2.5 font-bold text-slate-900 dark:text-white truncate max-w-[220px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${
                            isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''
                          }`} title={course.universityName}>
                            {course.universityName}
                          </td>
                          <td className={`px-3 py-2.5 ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${(course.programLevel || '').toLowerCase().includes('master') ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                              {course.programLevel || 'Bachelor'}
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-slate-600 dark:text-neutral-300 font-medium ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            {course.duration || '-'}
                          </td>
                          <td className={`px-3 py-2.5 font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[280px] ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`} title={course.programName}>
                            {course.programName}
                          </td>
                          <td className={`px-3 py-2.5 font-bold text-emerald-600 dark:text-emerald-400 ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            {course.percentage || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[150px] ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`} title={course.languageRequirement}>
                            {course.languageRequirement || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[150px] ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`} title={course.otherReq}>
                            {course.otherReq || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[200px] ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`} title={course.admissionTest}>
                            {course.admissionTest || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            {course.applicationFees || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            {course.tentativeMonths || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            {course.subField || '-'}
                          </td>
                          <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[200px] ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`} title={course.academicBackground}>
                            {course.academicBackground || '-'}
                          </td>
                          <td className={`px-2 py-2.5 text-center ${isNewUniversity ? 'border-t-2 border-indigo-400/80 dark:border-indigo-500/70' : ''}`}>
                            <button 
                              onClick={(e) => removeCourse(e, course.programName)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold cursor-pointer"
                              title="Remove Course"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Cards View */
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="flex flex-col space-y-3">
                  {filteredModalCourses.map((course, idx) => {
                    const isExpanded = expandedCourseIdx === idx;
                    const isNewUniversity = idx > 0 && (course.universityName || '') !== (filteredModalCourses[idx - 1]?.universityName || '');
                    return (
                      <React.Fragment key={course._id || idx}>
                        {isNewUniversity && (
                          <div className="pt-2 pb-1">
                            <div className="border-t-2 border-indigo-300/80 dark:border-indigo-500/40"></div>
                          </div>
                        )}
                        <div 
                          onClick={() => setExpandedCourseIdx(isExpanded ? null : idx)}
                          className="group dark:bg-[#141414] bg-white border dark:border-white/[0.08] border-gray-200 rounded-2xl shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          
                          <div className="p-4 flex justify-between items-center">
                            <div className="flex-1 pr-4">
                              <h5 className="font-bold text-base dark:text-neutral-100 text-slate-800 transition-colors">
                                {course.programName}
                              </h5>
                              <p className="text-sm font-medium dark:text-neutral-400 text-slate-500">{course.universityName}</p>
                            </div>
                            <div className="flex items-center space-x-3 shrink-0">
                              <span className="text-[11px] font-bold dark:bg-white/10 bg-gray-100 dark:text-neutral-200 text-slate-700 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">{course.duration}</span>
                              <button 
                                onClick={(e) => removeCourse(e, course.programName)} 
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 dark:hover:bg-red-500/20 hover:bg-red-100 dark:text-red-400 text-red-600 transition-all cursor-pointer z-10" 
                                title="Remove course"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                              <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t dark:border-white/5 border-gray-100 pt-3 bg-gray-50 dark:bg-white/[0.02]">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Sub Field</span>
                                  <span className="dark:text-neutral-200 text-slate-700 font-semibold">{course.subField || '-'}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Lang. Requirement</span>
                                  <span className="dark:text-neutral-200 text-slate-700 font-semibold">{course.languageRequirement || '-'}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Admission Test</span>
                                  <span className="dark:text-neutral-200 text-slate-700 font-semibold">{course.admissionTest || '-'}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">App Fees</span>
                                  <span className="dark:text-neutral-200 text-slate-700 font-semibold">{course.applicationFees || '-'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Add Course Modal */}
      {showAddCourse && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setShowAddCourse(false)}>
          <div 
            className="w-full max-w-2xl max-h-[80vh] flex flex-col dark:bg-[#0a0a0a] bg-white border dark:border-white/10 border-gray-200 rounded-3xl shadow-2xl overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b dark:border-white/10 border-gray-100 flex justify-between items-center bg-gray-50 dark:bg-white/[0.02]">
              <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center">
                <svg className="w-5 h-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Add Manual Course
              </h2>
              <button onClick={() => setShowAddCourse(false)} className="w-8 h-8 flex items-center justify-center rounded-xl dark:bg-white/5 bg-gray-200 hover:bg-gray-300 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <svg className="w-4 h-4 dark:text-neutral-400 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 border-b dark:border-white/10 border-gray-100">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 dark:text-neutral-500 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search by course or university..." 
                  className="w-full bg-gray-100 dark:bg-white/5 border border-transparent dark:focus:border-indigo-500/50 focus:border-indigo-400 rounded-xl py-3 pl-10 pr-4 text-sm dark:text-white text-slate-900 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Category Filters */}
            {allCourses.length > 0 && (
              <div className="px-4 pb-3 border-b dark:border-white/10 border-gray-100">
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1">
                  <button 
                    onClick={() => setSelectedCategory('All')}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === 'All' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'dark:bg-white/5 bg-gray-100 dark:text-neutral-400 text-slate-600 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                  >
                    All
                  </button>
                  {Array.from(new Set(allCourses.map(c => c.category))).filter(Boolean).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'dark:bg-white/5 bg-gray-100 dark:text-neutral-400 text-slate-600 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              {allCourses.length === 0 ? (
                <div className="text-center p-8 text-sm dark:text-neutral-500 text-slate-400 animate-pulse">Loading course database...</div>
              ) : (
                Object.entries(
                  allCourses
                    .filter(c => c.programName.toLowerCase().includes(courseSearch.toLowerCase()) || c.universityName.toLowerCase().includes(courseSearch.toLowerCase()))
                    .filter(c => selectedCategory === 'All' || c.category === selectedCategory)
                    .reduce((acc, course) => {
                      if (!acc[course.category]) acc[course.category] = [];
                      acc[course.category].push(course);
                      return acc;
                    }, {})
                ).map(([category, courses]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest dark:text-neutral-500 text-slate-400 ml-2">{category}</h4>
                    {courses.map(course => {
                      const isAdded = crmData.matchedCourses.some(c => c.programName === course.programName);
                      return (
                        <div key={course._id || course.programName} className={`flex items-center justify-between p-3 rounded-xl border ${isAdded ? 'dark:border-indigo-500/30 border-indigo-200 dark:bg-indigo-500/5 bg-indigo-50' : 'dark:border-white/5 border-gray-100 dark:bg-[#141414] bg-white hover:border-gray-300 dark:hover:border-white/20'} transition-all`}>
                          <div className="flex-1 min-w-0 pr-4">
                            <h5 className="font-semibold text-sm dark:text-neutral-200 text-slate-800 truncate">{course.programName}</h5>
                            <p className="text-xs dark:text-neutral-500 text-slate-500 truncate">{course.universityName}</p>
                          </div>
                          {isAdded ? (
                            <span className="text-xs font-bold text-indigo-500 flex items-center shrink-0">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              Added
                            </span>
                          ) : (
                            <button onClick={() => addCourse(course)} className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg dark:bg-white/10 bg-gray-100 dark:hover:bg-indigo-500/20 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:text-indigo-400 dark:text-neutral-300 text-slate-700 transition-colors cursor-pointer">
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm -z-10 cursor-pointer" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-7 rounded-3xl dark:bg-[#151515] bg-white border dark:border-white/10 border-gray-200 shadow-2xl z-10 flex flex-col items-center text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mb-1 shadow-inner border border-rose-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-extrabold dark:text-white text-slate-900 tracking-tight">Delete this email?</h3>
            <p className="text-xs dark:text-neutral-400 text-slate-600 leading-relaxed font-medium">
              Are you sure you want to move <span className="font-bold dark:text-neutral-200 text-slate-800">"{email.subject || 'this mail'}"</span> to Trash? You can restore it later from your Trash folder if needed.
            </p>
            <div className="flex w-full space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold dark:bg-neutral-800 bg-gray-100 dark:text-neutral-300 text-slate-700 dark:hover:bg-neutral-700 hover:bg-gray-200 transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  moveToTrash();
                }}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Floating Draggable AI Chat Window */}
      {showChatModal && typeof document !== 'undefined' && createPortal(
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-12 right-12 z-[200] w-[400px] h-[500px] flex flex-col dark:bg-[#121212] bg-white border dark:border-white/20 border-purple-300 rounded-3xl shadow-2xl overflow-hidden cursor-default"
        >
          {/* Drag Header Bar */}
          <div className="px-4 py-3 dark:bg-[#1f1a2e] bg-purple-700 text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none border-b dark:border-white/10 border-purple-800 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">AI Filter Reasoning Chat</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">🖐 Drag to Move</span>
              <button 
                onClick={() => setShowChatModal(false)}
                className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Interactive Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar dark:bg-[#0c0c0c] bg-gray-50/50">
            {chatHistory.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'dark:bg-[#1e1e1e] bg-white dark:text-neutral-200 text-slate-800 border dark:border-white/10 border-gray-200 rounded-bl-none'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-bold text-purple-500 dark:text-purple-400">
                      <img src="/robot.png" alt="AI" className="w-3.5 h-3.5 object-contain" />
                      <span>AI Assistant</span>
                      {msg.matchedCount !== undefined && (
                        <span className="ml-auto bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                          {msg.matchedCount} Matches
                        </span>
                      )}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[8px] dark:text-neutral-500 text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-start space-x-2">
                <div className="dark:bg-[#1e1e1e] bg-white border dark:border-white/10 border-gray-200 rounded-2xl rounded-bl-none p-3 text-xs flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[10px] text-purple-400 font-semibold ml-1">Analyzing Excel rules...</span>
                </div>
              </div>
            )}
          </div>

          {/* Form Input Footer */}
          <div className="p-3 dark:bg-[#121212] bg-white border-t dark:border-white/10 border-gray-200 shrink-0">
            <form onSubmit={handleChatSubmit} className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Type instruction (e.g. 'Show CS/AI only')..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isProcessing}
                className="w-full text-xs dark:bg-[#1a1a1a] bg-gray-100 border dark:border-white/10 border-gray-300 rounded-xl pl-3 pr-10 py-2.5 focus:outline-none focus:border-purple-500 dark:text-neutral-100 text-slate-900 disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isProcessing}
                className="absolute right-1 top-1 bottom-1 aspect-square bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}

function generateTemplate(crmData, studentName, isPursuing = false, isGap = false) {
  const student = crmData?.studentData || {};
  const intake = String(student.intakePitched || 'Sept 2027');

  // Extract year information for dynamic year disclaimers
  const currentYear = new Date().getFullYear(); // e.g. 2026
  const yearMatch = intake.match(/\b(20\d{2})\b/);
  const intakeYear = yearMatch ? parseInt(yearMatch[1]) : (currentYear + 1); // e.g. 2027
  const previousYear = intakeYear - 1; // e.g. 2026

  const isMaster = !!(
    student.bachelorDegree || 
    student.bachelorScore || 
    student.highestEducation === 'Bachelors' || 
    student.targetDegreeLevel === 'Masters' || 
    String(student.programOfInterest || '').toLowerCase().match(/\b(master|masters|msc|ma|mba|post grad|postgraduate)\b/i)
  );

  const matchedCourses = crmData?.matchedCourses || [];
  const poiNotAvailable = !!crmData?.poiNotAvailable;
  const isNoCourseOptionsForPoi = !!crmData?.isNoCourseOptionsForPoi;
  const missing11thScore = !!crmData?.missing11thScore;
  const profileLabels = crmData?.profileLabels || [];
  const isLowProfile = crmData?.isLowProfile || profileLabels.includes('low profile') || (matchedCourses.length === 0 && (parseFloat(student.class12Score) < 65 || parseFloat(student.bachelorScore) < 65));
  const isIneligibleBackground = (crmData?.isIneligibleBackground || (matchedCourses.length === 0 && poiNotAvailable && !isLowProfile)) && !isNoCourseOptionsForPoi;

  // ── CASE 1: Missing 11th Score ──
  if (missing11thScore) {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 6px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0;">Greetings!</p>
        <div style="background-color: #fff3cd; padding: 16px 18px; border: 1px solid #ffeeba; border-radius: 8px; margin-bottom: 18px;">
          <h4 style="color: #856404; margin: 0 0 10px 0; font-weight: bold; font-size: 16.5px;">ACTION REQUIRED: 11th Grade Marks Missing</h4>
          <p style="margin: 0 0 10px 0; color: #856404; font-size: 15.5px; line-height: 1.6;">Thank you for reaching out to us.</p>
          <p style="margin: 0 0 10px 0; color: #856404; font-size: 15.5px; line-height: 1.6;">We noticed that you are currently pursuing your 12th standard, but we <b>do not have your 11th standard percentage</b>.</p>
          <p style="margin: 0; color: #856404; font-size: 15.5px; line-height: 1.6;">As we don't have enough information to accurately recommend universities, <b>kindly reply to this email with your 11th percentage</b>.</p>
        </div>
        <p style="font-size: 15.5px; line-height: 1.6;">Once we receive this information, we will gladly curate a list of matching programs for you.</p>
        <p style="margin-top: 24px; font-size: 15.5px;">Best regards,<br><b>Presume Overseas Admission Team</b></p>
      </div>
    `;
  }

  // ── CASE 2: Low Profile / Low Percentage (Risk Application - Image 5) ──
  if (isLowProfile) {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">Greetings!</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #FF0000; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">RISK APPLICATION</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fde8d7; color: #cc0000; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">This is to inform you that we are unable to proceed with this application due to the low percentage. No university will give priority to this cgpa/percentage.</span>
        </p>

        <p style="color: #cc0000; font-weight: bold; font-size: 15.5px; margin: 16px 0; line-height: 1.6;">
          The percentage is very low, that's why we can not take this profile.
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fde8d7; color: #cc0000; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px;">We can not give surety on any part (Admission, Scholarship or Visa)</span>
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">Best regards,<br><b style="color: #000;">Presume Overseas Admission Team</b></p>
      </div>
    `;
  }

  // ── CASE 3.5: No Course Options Available ──
  if (isNoCourseOptionsForPoi) {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">Greetings!</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #f59e0b; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">NO COURSE OPTIONS AVAILABLE</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fef3c7; color: #b45309; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">This is to inform you that there are no course options available for this profile matching what the student has required.</span>
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          If you would like, we can evaluate the profile for alternative related domains or locations, if applicable.
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">Best regards,<br><b style="color: #000;">Presume Overseas Admission Team</b></p>
      </div>
    `;
  }

  // ── CASE 3: Ineligible Background (Domain Mismatch with Alternative Offer) ──
  if (isIneligibleBackground) {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">Greetings!</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #dc2626; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">ACADEMIC BACKGROUND MISMATCH</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fde8d7; color: #991b1b; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">This is to inform you that there are no eligible options available in public universities for the requested program due to academic stream / background requirements (e.g. Non-PCM / domain mismatch).</span>
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          If you want, we can evaluate and send you available university course options according to your academic profile.
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fff3cd; color: #856404; font-weight: bold; padding: 6px 14px; font-size: 15px; display: inline-block; border-radius: 4px;">We cannot proceed with applications for off-domain programs as universities strictly filter out incompatible backgrounds.</span>
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">Best regards,<br><b style="color: #000;">Presume Overseas Admission Team</b></p>
      </div>
    `;
  }

  // ── CASE 4: Low Course Options Warning ──
  const isUndergrad = !isMaster;
  const isLowCourseOptions = isUndergrad && matchedCourses.length > 0 && matchedCourses.length < 3;
  if (isLowCourseOptions) {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">Greetings!</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #f59e0b; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">PRE-ENROLLMENT RISK WARNING</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fef3c7; color: #92400e; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">This is to inform you that we found very few course options matching your profile.</span>
        </p>

        <p style="color: #92400e; font-weight: bold; font-size: 15.5px; margin: 16px 0; line-height: 1.6;">
          As your percentage is low as per the university criteria, even after clearing the university test, your admission can be cancelled at the pre-enrollment stage.
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          If you want, we can send you the remaining course options too.
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">Best regards,<br><b style="color: #000;">Presume Overseas Admission Team</b></p>
      </div>
    `;
  }

  // ── CASE 5: Standard Course Pitch Email (Bachelors / Masters / Pursuing / Gap) ──
  let categoryBannerText = 'THESE ARE THE OVERALL COURSE OPTIONS AVAILABLE';
  const poi = (student.programOfInterest || '').toLowerCase();
  const stream = (student.class12Stream || '').toLowerCase();
  if (poi.includes('management') || poi.includes('business') || poi.includes('economics') || poi.includes('finance') || stream.includes('commerce')) {
    categoryBannerText = 'THESE ARE THE ONLY MANAGEMENT RELATED BACHELOR COURSES';
  } else if (poi.includes('bio') || poi.includes('medical') || poi.includes('pharma') || poi.includes('biotech') || stream.includes('pcb')) {
    categoryBannerText = 'THESE ARE THE ONLY BIO RELATED BACHELOR COURSES';
  } else if (poi.includes('computer') || poi.includes('cs') || poi.includes('ai') || poi.includes('data') || poi.includes('engineering') || stream.includes('pcm')) {
    categoryBannerText = 'THESE ARE THE OVERALL TECH/SCIENCE BACHELOR COURSES';
  }

  const coursesHtml = matchedCourses.map((c, i) => `
    <tr style="text-align: center; border-bottom: 1px solid #ccc;">
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: center;">${i + 1}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: left; color: #111;">${c.universityName || c.university || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.duration || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: left; color: #0056b3;">${c.programName || c.name || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: center;">${c.percentage || c.score || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.languageRequirement || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.otherReq || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: center;">${c.admissionTest || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.applicationFees || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.tentativeMonths || '-'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
      <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">Greetings!</p>

      <p style="margin: 16px 0;">
        <span style="background-color: #fce4d6; padding: 6px 14px; font-weight: bold; font-size: 16px; color: #000; display: inline-block; border-radius: 4px;">For ${intake} Intake</span>
      </p>

      ${isPursuing ? `
      <p style="margin: 16px 0;">
        <span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">
          ${isMaster ? 'NEED PROVISIONAL DEGREE / FINAL TRANSCRIPTS BY JUNE 2027' : 'Course options are shared only on the basis of predicted marks above 70% also the 12th result will be required till 20th of June 2027.'}
        </span>
      </p>
      ` : ''}

      <p style="margin: 16px 0;">
        <span style="background-color: #00FF00; padding: 6px 14px; font-weight: bold; color: #000; display: inline-block; border-radius: 4px; font-size: 16px;">SAFE TO APPLY</span> <span style="font-weight: bold; color: #000; font-size: 16px;"> - Only if s/he clears the admission test!!</span>
      </p>

      ${isGap ? `
      <p style="margin: 16px 0;">
        <span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">NEED TO JUSTIFY GAP WITH PROPER CERTIFICATES</span>
      </p>
      ` : ''}

      <p style="font-weight: bold; font-size: 16px; color: #000; margin: 20px 0; line-height: 1.6;">
        Before starting the process for ${intake} - we will evaluate the profile again as per updated requirements and then finalize the options!!
      </p>

      <p style="color: #0000FF; font-weight: bold; font-size: 16px; margin: 20px 0; line-height: 1.6;">
        I have added overall possible course options based on ${isMaster ? "Bachelor's subjects & preferences" : "12th subjects & preferences"}, that are available in Italian public universities with 100% Scholarship.
      </p>

      <p style="font-weight: bold; font-size: 15.5px; color: #000; margin: 18px 0; line-height: 1.6;">
        We will share the information regarding updates (If Any). Also, throughout the process, if we find any more options, we will update the same to you.
      </p>

      <p style="margin: 18px 0;">
        <span style="background-color: #fde8d7; padding: 6px 14px; font-weight: bold; font-size: 15px; color: #000; display: inline-block; border-radius: 4px; line-height: 1.5;">
          Note: It is essential to book an exam prior to the application submission. The score card will be required when submitting the applications.
        </span>
      </p>

      <!-- Dynamic Current Year Notice (Included for all non-low-profile emails) -->
      <p style="margin: 18px 0;">
        <span style="background-color: #e0e7ff; color: #1e1b4b; padding: 7px 14px; font-weight: bold; font-size: 15px; border-left: 4px solid #4f46e5; display: inline-block; border-radius: 2px; line-height: 1.5;">
          Note: These details are as per the current year ${currentYear} guidelines. If any updates or changes occur for ${intake} intake, we will update you accordingly.
        </span>
      </p>

      ${matchedCourses.length > 0 ? `
      <div style="margin-top: 24px; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14.5px; margin-top: 16px; border: 1px solid #ccc;">
          <thead>
            <tr style="background-color: #FCE4D6; color: #111;">
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center; width: 55px;">S.No</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: left;">University Name</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center; width: 90px;">Duration</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: left;">Program Name</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Percentage</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Lang. Req.</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Other Req.</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Admission Test/Interview</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Application Fees</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Tentative Months (Only Opening)</th>
            </tr>
            <!-- Blue Table Remarks Container Header (Per Agency Screenshots) -->
            <tr>
              <td colspan="10" style="background-color: #dbeafe; padding: 16px 22px; border: 1px solid #93c5fd; text-align: center; color: #1e3a8a; line-height: 1.75; font-size: 15px;">
                <div style="font-weight: bold; font-size: 16.5px; margin-bottom: 8px; color: #1d4ed8;">REMARKS: Details for ${intake} Intake</div>
                <div style="font-weight: 600; margin: 3px 0;">1. We will evaluate the profile again before starting the admission application submission</div>
                <div style="font-weight: 600; margin: 3px 0;">2. Admission will depend on admission test: CEnT-S, SAT (1300/1600), or respective university test</div>
                <div style="font-weight: 600; margin: 3px 0;">3. IELTS: Overall 6 band (B2 Level)</div>
                <div style="font-weight: 600; margin: 3px 0;">4. Application will begin only after completion of all the required documents.</div>
                <div style="margin-top: 6px;"><span style="background-color: #FFFF00; color: #000; font-weight: bold; padding: 3px 8px; font-size: 14.5px; display: inline-block; border-radius: 3px;">5. CEnT-S registration is open now - students can book the test for timely results and applications</span></div>
                <div style="margin-top: 6px; font-weight: bold; font-size: 15.5px; color: #1d4ed8;">We can start admission applications for ${intake} by November ${previousYear}!!</div>
                <div style="margin-top: 8px;"><span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 4px 10px; font-size: 14.5px; display: inline-block; border-radius: 3px;">${categoryBannerText}</span></div>
                <div style="margin-top: 6px; color: #dc2626; font-weight: bold; font-size: 15px;">We do not proceed with University of Venice - as it has some scholarship issues</div>
              </td>
            </tr>
          </thead>
          <tbody>
            ${coursesHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      <p style="margin-top: 28px; font-size: 15.5px; color: #333;">Best regards,<br><b style="color: #000;">Presume Overseas Admission Team</b></p>
    </div>
  `;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-start">
      <span className="dark:text-neutral-500 text-slate-500 shrink-0 mr-4">{label}</span>
      <span className="dark:text-neutral-200 text-slate-800 text-right break-words font-medium">{value}</span>
    </div>
  );
}

function emailToName(fromStr) {
  if (!fromStr) return 'Unknown';
  const match = fromStr.match(/^([^<]+)/);
  return match ? match[1].trim().replace(/"/g, '') : fromStr;
}

function decodeHtml(html) {
  if (!html) return '';
  return String(html)
             .replace(/&#39;/g, "'")
             .replace(/&quot;/g, '"')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&');
}
