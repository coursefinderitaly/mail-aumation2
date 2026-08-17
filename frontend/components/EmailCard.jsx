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

export default function EmailCard({ email, isSelected, isChecked, onToggleCheck, onClick, onDelete }) {
  const isUnread = email.labelIds?.includes('UNREAD');
  const senderName = emailToName(email.from);

  return (
    <div 
      className={`group relative p-4 rounded-2xl transition-all duration-200 flex items-start space-x-3.5 ${isSelected ? 'dark:bg-white/[0.08] bg-indigo-50/80 border border-indigo-200 dark:border-white/10 shadow-sm' : isUnread ? 'dark:bg-indigo-500/10 bg-indigo-50/50 border border-indigo-100 dark:border-indigo-500/20' : 'dark:hover:bg-white/[0.04] hover:bg-gray-50 border border-transparent'}`}
    >
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
      )}
      
      {/* Checkbox and Sender Profile Picture Thumbnail */}
      <div className="shrink-0 flex items-center space-x-3 mt-0.5 ml-0.5" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={isChecked}
          onChange={onToggleCheck}
          className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200 ${isChecked ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`}
        />
        <div 
          title={`Sender: ${email.from}`}
          className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarStyle(senderName)} text-white font-bold text-xs flex items-center justify-center shadow-md border border-white/20 shrink-0 select-none tracking-tight`}
        >
          {getInitials(senderName)}
        </div>
      </div>

      <div onClick={onClick} className="flex-1 cursor-pointer min-w-0 pr-10">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={`text-sm truncate pr-2 tracking-tight ${isSelected ? 'font-semibold dark:text-white text-indigo-900' : isUnread ? 'font-bold dark:text-white text-slate-900' : 'font-medium dark:text-neutral-200 text-slate-700'}`}>
            {senderName}
          </h3>
          <span className={`text-[10px] shrink-0 font-medium ${isSelected ? 'dark:text-neutral-400 text-indigo-500' : 'dark:text-neutral-500 text-slate-400'}`}>
            {formatDate(email.date)}
          </span>
        </div>
        <h4 className={`text-xs mb-1 truncate ${isUnread && !isSelected ? 'font-semibold dark:text-neutral-200 text-slate-800' : 'font-medium dark:text-neutral-300 text-slate-600'}`}>{email.subject}</h4>
        <p className="text-[11px] dark:text-neutral-500 text-slate-500 line-clamp-1 leading-relaxed mb-2.5" dangerouslySetInnerHTML={{__html: email.snippet}}></p>
        
        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {(email.hasAttachments || (email.attachments && email.attachments.length > 0)) && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-2xs">
              <svg className="w-3 h-3 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <span>{email.attachments?.length || 1} Attachment{email.attachments?.length !== 1 ? 's' : ''}</span>
            </span>
          )}
          {email.isCourseOptionSent ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
              <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              <span>Course Option Sended</span>
            </span>
          ) : email.isReadyToSend ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-2xs">
              <svg className="w-3 h-3 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>Analyzed • Ready to Send</span>
            </span>
          ) : email.isNotAnalysed ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-200/80 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border dark:border-neutral-700 border-gray-300">
              <svg className="w-3 h-3 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Not Analysed</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span>Not Sended</span>
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions (Slide in on hover) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-8 h-8 rounded-full dark:bg-[#1a1a1a] bg-white flex items-center justify-center dark:text-neutral-400 text-slate-500 hover:text-red-500 dark:hover:text-red-400 border dark:border-white/10 border-gray-200 shadow-xl dark:hover:bg-neutral-800 hover:bg-gray-50 cursor-pointer"
          title="Delete Email"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
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
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
