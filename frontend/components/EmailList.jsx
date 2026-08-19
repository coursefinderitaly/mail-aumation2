import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import EmailCard from './EmailCard';

export default function EmailList({ 
  emails, 
  selectedEmail, 
  onSelect, 
  onRefresh, 
  isFetching, 
  activeLabel = 'INBOX', 
  onModifyEmail,
  pageSize = 25,
  onChangePageSize,
  currentPage = 1,
  hasNextPage = false,
  hasPrevPage = false,
  onNextPage,
  onPrevPage,
  searchQuery: searchQueryProp = '',
  onSearch
}) {
  const listRef = useRef();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(searchQueryProp);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);

  useEffect(() => {
    setSearchQuery(searchQueryProp);
  }, [searchQueryProp]);

  const isFirstRender = useRef(true);
  const prevFilter = useRef(filter);

  useEffect(() => {
    if (emails.length === 0 || !listRef.current) return;

    // Only stagger animate the whole list on first load or when switching filters
    if (isFirstRender.current || prevFilter.current !== filter) {
      gsap.fromTo(listRef.current.children, 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: "power2.out" }
      );
      isFirstRender.current = false;
      prevFilter.current = filter;
    }
  }, [emails, filter]);

  // Clear selections when changing labels
  useEffect(() => {
    setSelectedIds([]);
  }, [activeLabel]);

  // Calculate counts for filters
  const unreadCount = emails.filter(e => e.labelIds?.includes('UNREAD')).length;
  const attachmentsCount = emails.filter(e => e.hasAttachments || (e.attachments && e.attachments.length > 0)).length;
  const readyCount = emails.filter(e => e.isReadyToSend).length;
  const sendedCount = emails.filter(e => e.isCourseOptionSent).length;
  const notSendedCount = emails.filter(e => e.isNotSended).length;
  const notAnalysedCount = emails.filter(e => e.isNotAnalysed).length;

  const filteredEmails = emails.filter(e => {
    let matchesCategory = true;
    if (filter === 'unread') matchesCategory = e.labelIds?.includes('UNREAD');
    else if (filter === 'attachments') matchesCategory = e.hasAttachments || (e.attachments && e.attachments.length > 0);
    else if (filter === 'ready') matchesCategory = e.isReadyToSend;
    else if (filter === 'sended') matchesCategory = e.isCourseOptionSent;
    else if (filter === 'not_sended') matchesCategory = e.isNotSended;
    else if (filter === 'not_analysed') matchesCategory = e.isNotAnalysed;

    if (!matchesCategory) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const fromText = (e.from || e.rawFrom || '').toLowerCase();
      const subjectText = (e.subject || '').toLowerCase();
      const snippetText = (e.snippet || '').toLowerCase();
      const bodyText = (e.body || e.text || '').toLowerCase();
      const idText = (e.id || e.threadId || '').toLowerCase();

      return fromText.includes(q) || subjectText.includes(q) || snippetText.includes(q) || bodyText.includes(q) || idText.includes(q);
    }

    return true;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmails.map(email => email.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(emailId => emailId !== id) : [...prev, id]
    );
  };

  const confirmDelete = (ids) => {
    setItemsToDelete(ids);
    setShowConfirm(true);
  };

  const executeDelete = () => {
    itemsToDelete.forEach(id => {
      onModifyEmail(id, ['TRASH'], [activeLabel]);
    });
    setSelectedIds(prev => prev.filter(id => !itemsToDelete.includes(id)));
    setShowConfirm(false);
    setItemsToDelete([]);
  };

  return (
    <div className="w-full h-full shrink-0 dark:bg-[#0d0d0d]/90 bg-[#fbfaf6] backdrop-blur-lg border-r dark:border-white/[0.05] border-gray-200 flex flex-col z-10">
      
      {/* Header */}
      <div className="p-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold dark:text-white text-slate-800 capitalize tracking-tight">
              {activeLabel.toLowerCase()}
            </h2>
            {selectedIds.length > 0 && (
              <span className="text-xs font-medium dark:bg-white/10 bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={() => confirmDelete(selectedIds)}
              className="text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>Delete</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-3 mb-5">
          <div className="flex items-center justify-center shrink-0 w-8 h-8">
            <input 
              type="checkbox" 
              checked={filteredEmails.length > 0 && selectedIds.length === filteredEmails.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-neutral-500 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input 
              type="text" 
              placeholder="Search emails (press Enter to search entire mailbox)..." 
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val === '' && onSearch) {
                  onSearch('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onSearch) {
                  onSearch(searchQuery);
                }
              }}
              className="w-full dark:bg-[#1a1a1a] bg-gray-100 border dark:border-white/[0.08] border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm dark:text-neutral-200 text-slate-900 dark:placeholder-neutral-600 placeholder-slate-400 focus:outline-none dark:focus:border-white/20 focus:border-indigo-400 dark:focus:bg-[#222] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  if (onSearch) onSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold p-1 transition-colors cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button 
            onClick={onRefresh}
            className="w-10 h-10 shrink-0 dark:bg-[#1a1a1a] bg-gray-100 border dark:border-white/[0.08] border-gray-200 rounded-xl flex items-center justify-center dark:text-neutral-400 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Refresh Inbox"
          >
            <svg className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="flex space-x-5 text-xs font-semibold tracking-wide border-b dark:border-white/5 border-gray-200 pb-3 overflow-x-auto custom-scrollbar whitespace-nowrap">
          <span 
            onClick={() => setFilter('all')}
            className={`cursor-pointer shrink-0 relative transition-colors py-0.5 ${filter === 'all' ? 'dark:text-white text-indigo-700 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-indigo-600 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            All ({emails.length})
          </span>
          <span 
            onClick={() => setFilter('unread')}
            className={`flex items-center space-x-1.5 shrink-0 cursor-pointer relative transition-colors py-0.5 ${filter === 'unread' ? 'dark:text-white text-indigo-700 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-indigo-600 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none">{unreadCount}</span>
            )}
          </span>
          <span 
            onClick={() => setFilter('attachments')}
            className={`flex items-center space-x-1.5 shrink-0 cursor-pointer relative transition-colors py-0.5 ${filter === 'attachments' ? 'dark:text-white text-purple-600 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-purple-600 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            <span>Attachments</span>
            {attachmentsCount > 0 && (
              <span className="bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{attachmentsCount}</span>
            )}
          </span>
          <span 
            onClick={() => setFilter('ready')}
            className={`flex items-center space-x-1.5 shrink-0 cursor-pointer relative transition-colors py-0.5 ${filter === 'ready' ? 'dark:text-white text-indigo-400 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-indigo-500 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            <span>Ready to Send</span>
            <span className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{readyCount}</span>
          </span>
          <span 
            onClick={() => setFilter('sended')}
            className={`flex items-center space-x-1.5 shrink-0 cursor-pointer relative transition-colors py-0.5 ${filter === 'sended' ? 'dark:text-white text-emerald-600 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-emerald-500 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            <span>Sended</span>
            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{sendedCount}</span>
          </span>
          <span 
            onClick={() => setFilter('not_sended')}
            className={`flex items-center space-x-1.5 shrink-0 cursor-pointer relative transition-colors py-0.5 ${filter === 'not_sended' ? 'dark:text-white text-amber-600 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-amber-500 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            <span>Not Sended</span>
            <span className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{notSendedCount}</span>
          </span>
          <span 
            onClick={() => setFilter('not_analysed')}
            className={`flex items-center space-x-1.5 shrink-0 cursor-pointer relative transition-colors py-0.5 ${filter === 'not_analysed' ? 'dark:text-white text-neutral-300 font-bold after:absolute after:-bottom-3 after:left-0 after:w-full after:h-[2px] dark:after:bg-white after:bg-neutral-500 after:rounded-full' : 'dark:text-neutral-500 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-300'}`}>
            <span>Not Analysed</span>
            <span className="bg-gray-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{notAnalysedCount}</span>
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-0.5 custom-scrollbar" ref={listRef}>
        {isFetching && emails.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="animate-pulse flex space-x-4 items-center p-3 rounded-xl dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-100">
                <div className="w-9 h-9 rounded-xl dark:bg-white/10 bg-gray-200 shrink-0"></div>
                <div className="flex-1 space-y-2.5 py-1 min-w-0">
                  <div className="flex justify-between">
                    <div className="h-3 dark:bg-white/10 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-2 dark:bg-white/10 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="h-2.5 dark:bg-white/10 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-6 text-center dark:text-neutral-600 text-slate-400 text-sm flex flex-col items-center justify-center h-40">
            <svg className="w-8 h-8 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            {filter === 'attachments' ? 'Attachments filter coming soon.' : 'No emails found in this view.'}
          </div>
        ) : (
          filteredEmails.map(email => (
            <EmailCard 
              key={email.id} 
              email={email} 
              isSelected={selectedEmail?.id === email.id} 
              isChecked={selectedIds.includes(email.id)}
              onToggleCheck={() => handleToggleSelect(email.id)}
              onClick={() => onSelect(email)} 
              onDelete={() => confirmDelete([email.id])}
            />
          ))
        )}
      </div>

      {/* Pagination Controls Footer */}
      <div className="p-3 px-4 border-t dark:border-white/[0.08] border-gray-200 flex items-center justify-between dark:bg-[#111] bg-white text-xs shrink-0 font-medium select-none">
        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <span className="dark:text-neutral-400 text-slate-500 font-semibold">Per page:</span>
          <select 
            value={pageSize}
            onChange={(e) => onChangePageSize && onChangePageSize(Number(e.target.value))}
            className="dark:bg-[#1f1f1f] bg-gray-100 dark:text-neutral-200 text-slate-800 border dark:border-white/10 border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-bold text-xs"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Current Page Info */}
        <div className="dark:text-neutral-300 text-slate-700 font-bold text-xs">
          Page {currentPage} <span className="text-slate-400 dark:text-neutral-500 font-normal">({filteredEmails.length} shown)</span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onPrevPage}
            disabled={!hasPrevPage || isFetching}
            className="px-3 py-1 rounded-lg border dark:border-white/10 border-gray-200 dark:bg-[#1a1a1a] bg-gray-100 dark:text-neutral-200 text-slate-700 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center cursor-pointer active:scale-95"
            title="Previous Page"
          >
            ‹ Prev
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage || isFetching}
            className="px-3 py-1 rounded-lg border dark:border-white/10 border-gray-200 dark:bg-[#1a1a1a] bg-gray-100 dark:text-neutral-200 text-slate-700 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center cursor-pointer active:scale-95"
            title="Next Page"
          >
            Next ›
          </button>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="dark:bg-[#1a1a1a] bg-white border dark:border-white/10 border-gray-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold dark:text-white text-slate-900 mb-2">Delete Email{itemsToDelete.length > 1 ? 's' : ''}?</h3>
            <p className="text-sm dark:text-neutral-400 text-slate-500 mb-6">
              Are you sure you want to move {itemsToDelete.length > 1 ? `these ${itemsToDelete.length} emails` : 'this email'} to the trash?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => { setShowConfirm(false); setItemsToDelete([]); }}
                className="px-4 py-2 rounded-xl text-sm font-medium dark:text-neutral-300 text-slate-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
