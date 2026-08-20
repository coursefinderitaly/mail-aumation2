import React from 'react';

const gradients = [
  'from-indigo-600 to-purple-600',
  'from-emerald-600 to-teal-600',
  'from-blue-600 to-cyan-600',
  'from-amber-600 to-orange-600',
  'from-violet-600 to-fuchsia-600',
  'from-rose-600 to-pink-600',
  'from-teal-600 to-emerald-700'
];

function getAvatarStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getInitials(name) {
  if (!name || name === 'Unknown') return '?';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!clean) return name.slice(0, 1).toUpperCase();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function emailToName(fromStr) {
  if (!fromStr) return 'Unknown';
  const match = fromStr.match(/^([^<]+)/);
  return match ? match[1].trim().replace(/"/g, '') : fromStr;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

function cleanSnippetText(snippet) {
  if (!snippet) return '';
  return snippet
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export default function EmailCard({ 
  email, 
  isSelected, 
  isChecked, 
  onToggleCheck, 
  onClick, 
  onDelete,
  onModifyEmail,
  viewMode = 'compact',
  userLabels = []
}) {
  const isUnread = email.labelIds?.includes('UNREAD');
  const isStarred = email.labelIds?.includes('STARRED');
  const senderName = emailToName(email.from);
  const snippetText = cleanSnippetText(email.snippet);
  
  const customLabelsData = [];
  (email.labelIds || []).forEach((id, index) => {
    const userLabel = userLabels.find(l => l.id === id);
    if (userLabel) {
      customLabelsData.push({ id, name: userLabel.name, color: userLabel.color });
    } else if (email.labelNames && email.labelNames[index]) {
      const name = email.labelNames[index];
      const u = name.toUpperCase();
      const builtInLabels = [
        'INBOX', 'UNREAD', 'STARRED', 'SENT', 'TRASH', 'SPAM', 'DRAFT', 
        'IMPORTANT', 'YELLOW_STAR', 'CHAT', 
        'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 
        'CATEGORY_UPDATES', 'CATEGORY_FORUMS'
      ];
      if (!builtInLabels.includes(u)) {
        customLabelsData.push({ id, name, color: null });
      }
    }
  });

  const toggleStar = (e) => {
    e.stopPropagation();
    if (onModifyEmail) {
      if (isStarred) {
        onModifyEmail(email.id, [], ['STARRED']);
      } else {
        onModifyEmail(email.id, ['STARRED'], []);
      }
    }
  };

  const toggleReadStatus = (e) => {
    e.stopPropagation();
    if (onModifyEmail) {
      if (isUnread) {
        onModifyEmail(email.id, [], ['UNREAD']);
      } else {
        onModifyEmail(email.id, ['UNREAD'], []);
      }
    }
  };

  // 1. Gmail Single-Line Compact View
  if (viewMode === 'compact') {
    return (
      <div 
        onClick={onClick}
        className={`group relative flex items-start py-2.5 px-3.5 border-b transition-colors duration-150 cursor-pointer select-none text-xs ${
          isSelected 
            ? 'dark:bg-indigo-950/40 bg-indigo-50/90 border-indigo-200 dark:border-indigo-800/40' 
            : isUnread 
              ? 'dark:bg-[#161616] bg-white border-gray-100 dark:border-white/[0.04]' 
              : 'dark:bg-[#0d0d0d] bg-[#fafaf8] dark:hover:bg-[#151515] hover:bg-gray-100/80 border-gray-100 dark:border-white/[0.03]'
        }`}
      >
        {/* Left Indicator bar for unread */}
        {isUnread && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-400"></div>
        )}

        {/* Left Side: Checkbox, Star, Sender */}
        <div className="flex items-start shrink-0 w-56 pt-[2px]">
          {/* Checkbox */}
          <div className="shrink-0 flex items-center justify-center mr-2.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox" 
              checked={isChecked}
              onChange={onToggleCheck}
              className={`w-4 h-4 rounded border-gray-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-150 ${isChecked ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
            />
          </div>

          {/* Star Icon */}
          <button 
            type="button"
            onClick={toggleStar}
            className="shrink-0 p-1 mr-3 text-slate-400 dark:text-neutral-500 hover:text-amber-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
            title={isStarred ? "Starred" : "Star message"}
          >
            <svg className={`w-4 h-4 ${isStarred ? 'text-amber-400 fill-amber-400' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>

          {/* Sender Name + Message Count */}
          <div className={`truncate pr-3 text-xs flex items-center space-x-1.5 pt-0.5 ${isUnread ? 'font-bold dark:text-white text-slate-900' : 'font-medium dark:text-neutral-300 text-slate-700'}`}>
            <span className="truncate">{senderName}</span>
            {email.messageCount > 1 && (
              <span 
                className={`shrink-0 text-xs ${isUnread ? 'font-bold' : 'font-normal'} text-slate-500 dark:text-neutral-400`}
                title={`${email.messageCount} emails in this thread`}
              >
                {email.messageCount}
              </span>
            )}
          </div>
        </div>

        {/* Middle: Content Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-center pt-[2px]">
          {/* Row 1: Labels, Subject, Snippet */}
          <div className="flex items-center w-full truncate pr-3">
            {customLabelsData.length > 0 && (
              <div className="flex items-center space-x-1.5 shrink-0 mr-1.5">
                {customLabelsData.map((lblObj, idx) => {
                  let bgClass = "bg-gray-200/80 text-gray-700 dark:bg-white/10 dark:text-neutral-300"; // Default
                  const u = lblObj.name.toUpperCase();
                  if (u.includes('BACHELOR')) bgClass = "bg-[#ebd3d1] text-[#934c48] dark:bg-[#5c312e] dark:text-[#f8ecec]";
                  else if (u.includes('MBBS')) bgClass = "bg-[#f48cb6] text-white dark:bg-[#a64067]";
                  else if (u.includes('OPTIONS SENT')) bgClass = "bg-[#c5a1f2] text-white dark:bg-[#724aab]";
                  else if (u.includes('SEPTEMBER') || u.includes('INTAKE')) bgClass = "bg-[#25a5be] text-white dark:bg-[#165a6b]";
                  else if (u.includes('PURSUING')) bgClass = "bg-[#eaad3b] text-white dark:bg-[#8e6518]";
                  else if (u.includes('LOW PROFILE')) bgClass = "bg-black text-red-500 dark:bg-black dark:text-red-500 font-bold border-transparent";
                  
                  let customStyle = {};
                  if (lblObj.color) {
                    customStyle = { backgroundColor: lblObj.color.backgroundColor, color: lblObj.color.textColor };
                    bgClass = ""; // Override built-in classes if a custom color exists
                  }
                  
                  return (
                    <span key={idx} className={`px-1.5 py-[1px] rounded text-[10px] font-medium whitespace-nowrap border border-transparent ${bgClass}`} style={customStyle} title={lblObj.name}>
                      {lblObj.name}
                    </span>
                  );
                })}
              </div>
            )}
            
            <span className={`shrink-0 text-xs ${isUnread ? 'font-bold dark:text-neutral-100 text-slate-900' : 'font-medium dark:text-neutral-200 text-slate-800'}`}>
              {email.subject || '(no subject)'}
            </span>
            
            {snippetText && (
              <>
                <span className="dark:text-neutral-600 text-slate-400 font-light mx-1 shrink-0">-</span>
                <span className="dark:text-neutral-500 text-slate-500 font-normal truncate text-xs">
                  {snippetText}
                </span>
              </>
            )}
          </div>

          {/* Row 2: Attachments Chips */}
          {(email.attachments && email.attachments.length > 0) && (
            <div className="flex items-center space-x-2 mt-2 overflow-hidden">
              {email.attachments.slice(0, 4).map((att, idx) => {
                 const isPdf = att.filename?.toLowerCase().endsWith('.pdf');
                 const isImg = att.filename?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                 return (
                   <div key={idx} className="flex items-center border border-gray-200 dark:border-neutral-700 rounded-full px-2 py-[2px] bg-white dark:bg-neutral-800 text-[10px] font-medium text-gray-600 dark:text-neutral-300 max-w-[140px] shadow-sm">
                     {isPdf ? (
                       <svg className="w-3 h-3 text-red-500 mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                     ) : isImg ? (
                       <svg className="w-3 h-3 text-red-500 mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                     ) : (
                       <svg className="w-3 h-3 text-gray-500 mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                     )}
                     <span className="truncate">{att.filename || 'Attachment'}</span>
                   </div>
                 );
              })}
              {email.attachments.length > 4 && (
                <div className="flex items-center border border-gray-200 dark:border-neutral-700 rounded-full px-2 py-[2px] bg-white dark:bg-neutral-800 text-[10px] font-medium text-gray-500 dark:text-neutral-400 shadow-sm">
                  +{email.attachments.length - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Date & Status Badges */}
        <div className="shrink-0 flex flex-col items-end pl-3 pt-[2px]">
          <div className="flex items-center space-x-2">
            {email.isCourseOptionSent ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Sent
              </span>
            ) : email.isReadyToSend ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Ready
              </span>
            ) : email.isNotAnalysed ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700">
                Not Analysed
              </span>
            ) : null}

            <div className="w-16 sm:w-20 text-right relative flex items-center justify-end">
              <span className={`text-[11px] font-medium transition-opacity ${isSelected ? 'dark:text-neutral-400 text-indigo-600' : 'dark:text-neutral-400 text-slate-500'} group-hover:opacity-0`}>
                {formatDate(email.date)}
              </span>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit pl-2">
                <button 
                  type="button"
                  onClick={toggleReadStatus}
                  className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-gray-200 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  title={isUnread ? "Mark as Read" : "Mark as Unread"}
                >
                  {isUnread ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 rounded-full dark:hover:bg-white/10 hover:bg-gray-200 text-slate-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete Email"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Comfortable Card View
  return (
    <div 
      className={`group relative p-3.5 rounded-xl transition-all duration-150 flex items-start space-x-3 ${isSelected ? 'dark:bg-white/[0.08] bg-indigo-50/80 border border-indigo-200 dark:border-white/10 shadow-sm' : isUnread ? 'dark:bg-indigo-500/10 bg-indigo-50/50 border border-indigo-100 dark:border-indigo-500/20' : 'dark:hover:bg-white/[0.04] hover:bg-gray-50 border border-transparent'}`}
    >
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
      )}
      
      {/* Checkbox and Sender Avatar */}
      <div className="shrink-0 flex items-center space-x-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={isChecked}
          onChange={onToggleCheck}
          className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200 ${isChecked ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`}
        />
        <button 
          type="button"
          onClick={toggleStar}
          className="shrink-0 p-1 text-slate-400 dark:text-neutral-500 hover:text-amber-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
          title={isStarred ? "Starred" : "Star message"}
        >
          <svg className={`w-4 h-4 ${isStarred ? 'text-amber-400 fill-amber-400' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <div 
          title={`Sender: ${email.from}`}
          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarStyle(senderName)} text-white font-bold text-xs flex items-center justify-center shadow-md border border-white/20 shrink-0 select-none tracking-tight`}
        >
          {getInitials(senderName)}
        </div>
      </div>

      <div onClick={onClick} className="flex-1 cursor-pointer min-w-0 pr-8">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`text-xs truncate pr-2 tracking-tight flex items-center space-x-1.5 ${isSelected ? 'font-semibold dark:text-white text-indigo-900' : isUnread ? 'font-bold dark:text-white text-slate-900' : 'font-medium dark:text-neutral-200 text-slate-700'}`}>
            <span className="truncate">{senderName}</span>
            {email.messageCount > 1 && (
              <span 
                className="shrink-0 text-xs font-bold text-slate-500 dark:text-neutral-400"
                title={`${email.messageCount} emails in this thread`}
              >
                {email.messageCount}
              </span>
            )}
          </h3>
          <span className={`text-[10px] shrink-0 font-medium ${isSelected ? 'dark:text-neutral-400 text-indigo-500' : 'dark:text-neutral-500 text-slate-400'}`}>
            {formatDate(email.date)}
          </span>
        </div>
        <div className={`text-xs mb-1 flex items-center space-x-1.5 truncate ${isUnread && !isSelected ? 'font-semibold dark:text-neutral-200 text-slate-800' : 'font-medium dark:text-neutral-300 text-slate-600'}`}>
          {customLabelsData.length > 0 && (
            <div className="flex items-center space-x-1 shrink-0">
              {customLabelsData.map((lblObj, idx) => {
                let bgClass = "bg-gray-200/80 text-gray-700 dark:bg-white/10 dark:text-neutral-300"; // Default
                const u = lblObj.name.toUpperCase();
                if (u.includes('BACHELOR')) bgClass = "bg-[#ebd3d1] text-[#934c48] dark:bg-[#5c312e] dark:text-[#f8ecec]";
                else if (u.includes('MBBS')) bgClass = "bg-[#f48cb6] text-white dark:bg-[#a64067]";
                else if (u.includes('OPTIONS SENT')) bgClass = "bg-[#c5a1f2] text-white dark:bg-[#724aab]";
                else if (u.includes('SEPTEMBER') || u.includes('INTAKE')) bgClass = "bg-[#25a5be] text-white dark:bg-[#165a6b]";
                else if (u.includes('PURSUING')) bgClass = "bg-[#eaad3b] text-white dark:bg-[#8e6518]";
                else if (u.includes('LOW PROFILE')) bgClass = "bg-black text-red-500 dark:bg-black dark:text-red-500 font-bold border-transparent";
                
                let customStyle = {};
                if (lblObj.color) {
                  customStyle = { backgroundColor: lblObj.color.backgroundColor, color: lblObj.color.textColor };
                  bgClass = ""; // Override built-in classes if a custom color exists
                }
                
                return (
                  <span key={idx} className={`inline-flex items-center px-1.5 py-[1px] rounded text-[10px] font-medium whitespace-nowrap border border-transparent ${bgClass}`} style={customStyle} title={lblObj.name}>
                    {lblObj.name}
                  </span>
                );
              })}
            </div>
          )}
          <span className="truncate">{email.subject || '(no subject)'}</span>
        </div>
        <p className="text-[11px] dark:text-neutral-500 text-slate-500 line-clamp-1 leading-relaxed mb-2" dangerouslySetInnerHTML={{__html: email.snippet}}></p>
        
        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {(email.hasAttachments || (email.attachments && email.attachments.length > 0)) && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <svg className="w-3 h-3 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <span>{email.attachments?.length || 1}</span>
            </span>
          )}
          {email.isCourseOptionSent ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span>Sent</span>
            </span>
          ) : email.isReadyToSend ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <span>Ready</span>
            </span>
          ) : email.isNotAnalysed ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200/80 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border dark:border-neutral-700 border-gray-300">
              <span>Not Analysed</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-full dark:bg-[#1a1a1a] bg-white flex items-center justify-center dark:text-neutral-400 text-slate-500 hover:text-red-500 dark:hover:text-red-400 border dark:border-white/10 border-gray-200 shadow-md cursor-pointer"
          title="Delete Email"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
}

