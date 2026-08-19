import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const PRESET_COLORS = [
  { text: '#000000', bg: '#f3f4f6' }, // Light gray
  { text: '#1d4ed8', bg: '#dbeafe' }, // Blue
  { text: '#0f766e', bg: '#ccfbf1' }, // Teal
  { text: '#6d28d9', bg: '#ede9fe' }, // Purple
  { text: '#be123c', bg: '#ffe4e6' }, // Rose
  { text: '#c2410c', bg: '#ffedd5' }, // Orange
  { text: '#4d7c0f', bg: '#ecfccb' }, // Green
  { text: '#b45309', bg: '#fef3c7' }, // Amber
];

export default function LabelSettingsDropdown({ label, onClose, onUpdate, onDelete, anchorEl }) {
  const dropdownRef = useRef(null);
  const [style, setStyle] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(label.name || '');

  useEffect(() => {
    if (anchorEl && dropdownRef.current) {
      const rect = anchorEl.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      
      let top = rect.top;
      let left = rect.right + 10;
      
      if (top + dropdownRect.height > window.innerHeight) {
        top = window.innerHeight - dropdownRect.height - 20;
      }
      
      setStyle({ top: `${top}px`, left: `${left}px` });
    }
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleUpdate = (updates) => {
    onUpdate(label.id, updates);
  };

  const currentColor = label.color || null;

  if (isEditing) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#1a1a20] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-white/10" ref={dropdownRef}>
          <h3 className="text-lg font-black dark:text-white text-slate-800 mb-4">Edit Label</h3>
          <input 
            type="text" 
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl dark:bg-[#121216] bg-gray-50 border border-gray-300 dark:border-white/10 dark:text-white focus:outline-none focus:border-indigo-500 mb-4"
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 font-bold text-xs dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-slate-900 transition-colors">Cancel</button>
            <button onClick={() => { handleUpdate({ name: editName }); setIsEditing(false); }} className="px-5 py-2 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md">Save Changes</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      ref={dropdownRef}
      style={style}
      className="fixed z-[100] w-64 bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col text-sm py-2 overflow-hidden animate-fade-in text-slate-800 dark:text-slate-200"
    >
      <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500 block mb-3">Label color</span>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((c, i) => (
            <button 
              key={i} 
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${currentColor?.backgroundColor === c.bg ? 'border-indigo-500 shadow-sm' : 'border-transparent'}`}
              style={{ backgroundColor: c.bg, color: c.text }}
              onClick={() => handleUpdate({ color: { textColor: c.text, backgroundColor: c.bg } })}
            >
              <span className="font-extrabold text-[10px]">A</span>
            </button>
          ))}
          <button 
            className="w-6 h-6 rounded-full border border-gray-300 dark:border-white/20 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-gray-500"
            title="Remove color"
            onClick={() => handleUpdate({ color: null })}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500 block mb-2">In label list</span>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-md cursor-pointer">
            <input type="radio" name="labelListVisibility" checked={label.labelListVisibility === 'labelShow' || !label.labelListVisibility} onChange={() => handleUpdate({ labelListVisibility: 'labelShow' })} className="text-indigo-500 focus:ring-indigo-500" />
            Show
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-md cursor-pointer">
            <input type="radio" name="labelListVisibility" checked={label.labelListVisibility === 'labelShowIfUnread'} onChange={() => handleUpdate({ labelListVisibility: 'labelShowIfUnread' })} className="text-indigo-500 focus:ring-indigo-500" />
            Show if unread
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-md cursor-pointer">
            <input type="radio" name="labelListVisibility" checked={label.labelListVisibility === 'labelHide'} onChange={() => handleUpdate({ labelListVisibility: 'labelHide' })} className="text-indigo-500 focus:ring-indigo-500" />
            Hide
          </label>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500 block mb-2">In message list</span>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-md cursor-pointer">
            <input type="radio" name="messageListVisibility" checked={label.messageListVisibility === 'show' || !label.messageListVisibility} onChange={() => handleUpdate({ messageListVisibility: 'show' })} className="text-indigo-500 focus:ring-indigo-500" />
            Show
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-md cursor-pointer">
            <input type="radio" name="messageListVisibility" checked={label.messageListVisibility === 'hide'} onChange={() => handleUpdate({ messageListVisibility: 'hide' })} className="text-indigo-500 focus:ring-indigo-500" />
            Hide
          </label>
        </div>
      </div>

      <div className="py-1">
        <button onClick={() => setIsEditing(true)} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Edit</button>
        <button onClick={() => onDelete(label.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">Remove label</button>
      </div>
    </div>,
    document.body
  );
}
