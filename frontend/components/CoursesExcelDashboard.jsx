import React, { useState, useEffect, useRef } from 'react';

const ColumnFilter = ({ label, options, value = [], onChange, alignRight = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const isPercentage = label.toLowerCase().includes('percentage') || label.toLowerCase().includes('score');

  let filteredOptions = options;
  if (search.trim().match(/^[<>]=?/)) {
    const operator = search.trim().match(/^[<>]=?/)[0];
    const targetNum = parseFloat(search.replace(/[^0-9.-]/g, ''));
    if (!isNaN(targetNum)) {
      filteredOptions = options.filter(o => {
        const valNum = parseFloat(String(o).replace(/[^0-9.-]/g, ''));
        if (isNaN(valNum)) return false;
        if (operator === '<') return valNum < targetNum;
        if (operator === '>') return valNum > targetNum;
        if (operator === '<=') return valNum <= targetNum;
        if (operator === '>=') return valNum >= targetNum;
        return false;
      });
    } else {
      filteredOptions = options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()));
    }
  } else {
    filteredOptions = options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()));
  }
  
  // Individual checkbox toggle strictly selects/deselects ONLY that specific option
  const handleToggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  // Auto-Cutoff: Selecting a preset button (e.g. ≤ 75%) auto-selects all lower/equal percentages
  const handleCutoffPreset = (preset) => {
    const targetVal = parseFloat(preset.replace(/[^0-9.-]/g, ''));
    if (isNaN(targetVal)) return;

    const toSelect = options.filter(o => {
      const vNum = parseFloat(String(o).replace(/[^0-9.-]/g, ''));
      return !isNaN(vNum) && vNum <= targetVal;
    });

    const isAlreadyActive = toSelect.length > 0 && toSelect.every(o => value.includes(o)) && value.length === toSelect.length;
    if (isAlreadyActive) {
      onChange([]);
    } else {
      onChange(toSelect);
    }
  };

  const handleSelectAll = () => {
    const allSelected = filteredOptions.length > 0 && filteredOptions.every(o => value.includes(o));
    if (allSelected) {
      onChange(value.filter(v => !filteredOptions.includes(v)));
    } else {
      const newSelections = new Set([...value, ...filteredOptions]);
      onChange(Array.from(newSelections));
    }
  };

  let displayText = 'All';
  if (value.length === 1) {
    displayText = value[0];
  } else if (value.length > 1) {
    if (isPercentage) {
      const nums = value.map(v => parseFloat(String(v).replace(/[^0-9.-]/g, ''))).filter(n => !isNaN(n));
      if (nums.length > 0) {
        const maxPerc = Math.max(...nums);
        displayText = `≤ ${maxPerc}% (${value.length})`;
      } else {
        displayText = `${value.length} sel`;
      }
    } else {
      displayText = `${value.length} sel`;
    }
  }

  return (
    <div className="relative inline-block text-left w-full mt-1 font-normal">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white dark:bg-[#1a1a1e] border rounded px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[130px] ${value.length > 0 ? 'border-emerald-400 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm' : 'border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300'}`}
      >
        <span className="truncate max-w-[90px]">{displayText}</span>
        <svg className="w-3 h-3 ml-1 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(''); }}></div>
          <div className={`absolute z-50 mt-1 w-72 max-w-[90vw] bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl top-full ${alignRight ? 'right-0' : 'left-0'} flex flex-col text-slate-800 dark:text-slate-200 overflow-hidden`}>
            
            {/* Percentage Auto-Cutoff Presets Header */}
            {isPercentage && (
              <div className="p-3 bg-emerald-50/90 dark:bg-emerald-500/10 border-b border-emerald-200/60 dark:border-emerald-500/20 box-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
                    Auto Cutoff Presets
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-neutral-400 font-medium">Selects ≤ %</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['65%', '70%', '75%', '80%', '85%', '90%'].map(preset => {
                    const targetVal = parseFloat(preset.replace(/[^0-9.-]/g, ''));
                    const toSelect = options.filter(o => {
                      const vNum = parseFloat(String(o).replace(/[^0-9.-]/g, ''));
                      return !isNaN(vNum) && vNum <= targetVal;
                    });
                    const isPresetActive = toSelect.length > 0 && toSelect.every(o => value.includes(o)) && value.length === toSelect.length;

                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleCutoffPreset(preset)}
                        className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ${isPresetActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-[#141418] text-slate-700 dark:text-slate-200 border-gray-200 dark:border-white/10 hover:border-emerald-400 hover:text-emerald-600'}`}
                      >
                        ≤ {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="p-2.5 border-b border-gray-100 dark:border-white/5 shrink-0">
              <input 
                type="text" 
                placeholder={isPercentage ? "Filter e.g. <= 75 or 70..." : "Search options..."} 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#121216] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2 px-1">
                <button type="button" onClick={handleSelectAll} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                  {filteredOptions.length > 0 && filteredOptions.every(o => value.includes(o)) ? 'Deselect All' : 'Select All'}
                </button>
                <button type="button" onClick={() => onChange([])} className="text-[10px] font-bold text-rose-500 hover:text-rose-600">
                  Clear
                </button>
              </div>
            </div>

            {/* Options List with Individual Checkboxes */}
            <div className="max-h-52 overflow-y-auto custom-scrollbar p-1.5 flex-1">
              {filteredOptions.map(opt => (
                <label 
                  key={opt}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-[11px] cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 w-full select-none transition-colors"
                >
                  <input 
                    type="checkbox" 
                    checked={value.includes(opt)} 
                    onChange={() => handleToggle(opt)}
                    className="rounded border-gray-300 dark:border-white/20 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className={`${value.includes(opt) ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {opt}
                  </span>
                </label>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-2 py-3 text-[11px] text-gray-400 text-center">No matching options</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function CoursesExcelDashboard() {
  const [courses, setCourses] = useState([]);
  const [editedCourses, setEditedCourses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [freezeColumns, setFreezeColumns] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const tableContainerRef = useRef(null);

  const columns = [
    { key: 'category', label: 'Category', minWidth: '110px' },
    { key: 'universityName', label: 'University Name', minWidth: '220px' },
    { key: 'programLevel', label: 'Program Level', minWidth: '130px' },
    { key: 'duration', label: 'Duration', minWidth: '100px' },
    { key: 'programName', label: 'Program Name', minWidth: '260px' },
    { key: 'interestedField', label: 'Interested Field', minWidth: '150px' },
    { key: 'subField', label: 'Sub Field', minWidth: '160px' },
    { key: 'percentage', label: 'Min Percentage', minWidth: '130px' },
    { key: 'academicBackground', label: 'Academic Background', minWidth: '180px' },
    { key: 'backgroundField', label: 'Background Field', minWidth: '200px' },
    { key: 'pursuingPassOut', label: 'Pursuing / Pass Out', minWidth: '150px' },
    { key: 'languageRequirement', label: 'Lang. Req.', minWidth: '130px' },
    { key: 'otherReq', label: 'Other Req.', minWidth: '130px' },
    { key: 'admissionTest', label: 'Admission Test/Interview', minWidth: '200px' },
    { key: 'applicationFees', label: 'Application Fees', minWidth: '140px' },
    { key: 'tentativeMonths', label: 'Tentative Months', minWidth: '170px' }
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses`);
      const data = await res.json();
      setCourses(data);
      setEditedCourses(JSON.parse(JSON.stringify(data)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = () => {
    if (!tableContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.round((scrollLeft / maxScroll) * 100));
    }
  };

  const shiftLeft = (amount = 350) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -amount, behavior: 'smooth' });
    }
  };

  const shiftRight = (amount = 350) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const shiftToStart = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const shiftToEnd = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: tableContainerRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  const jumpToColumn = (colKey) => {
    if (!tableContainerRef.current) return;
    const el = document.getElementById(`col-th-${colKey}`);
    if (el) {
      const containerLeft = tableContainerRef.current.getBoundingClientRect().left;
      const elLeft = el.getBoundingClientRect().left;
      tableContainerRef.current.scrollBy({ left: elLeft - containerLeft - 100, behavior: 'smooth' });
    }
  };

  const handleCellChange = (rowIndex, colKey, val) => {
    const updated = [...editedCourses];
    updated[rowIndex][colKey] = val;
    setEditedCourses(updated);
  };

  const handleAddRow = () => {
    const newRow = {};
    columns.forEach(c => newRow[c.key] = '');
    setEditedCourses([newRow, ...editedCourses]);
  };

  const handleDeleteRow = (rowIndex) => {
    const updated = [...editedCourses];
    updated.splice(rowIndex, 1);
    setEditedCourses(updated);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: editedCourses })
      });
      const data = await res.json();
      if (data.success) {
        setCourses(JSON.parse(JSON.stringify(editedCourses)));
        setIsEditing(false);
        setShowConfirm(false);
        setFilters({});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdits = () => {
    setEditedCourses(JSON.parse(JSON.stringify(courses)));
    setIsEditing(false);
    setFilters({});
  };

  const handleFilterChange = (colKey, val) => {
    setFilters(prev => ({ ...prev, [colKey]: val }));
  };

  const dataToRender = isEditing ? editedCourses : courses;
  
  const getUniqueValues = (colKey) => {
    const vals = dataToRender.map(r => r[colKey]).filter(Boolean);
    const unique = [...new Set(vals)];
    if (colKey === 'percentage' || colKey.toLowerCase().includes('score')) {
      return unique.sort((a, b) => {
        const numA = parseFloat(String(a).replace(/[^0-9.-]/g, '')) || 0;
        const numB = parseFloat(String(b).replace(/[^0-9.-]/g, '')) || 0;
        return numB - numA;
      });
    }
    return unique.sort();
  };

  const filteredData = dataToRender.map((row, index) => ({ row, index })).filter(item => {
    if (search) {
      const term = search.toLowerCase();
      if (!Object.values(item.row).some(v => String(v || '').toLowerCase().includes(term))) {
        return false;
      }
    }
    
    for (const key in filters) {
      if (filters[key] && filters[key].length > 0) {
        const rowVal = String(item.row[key] || '');
        if (!filters[key].includes(rowVal)) {
          return false;
        }
      }
    }
    
    return true;
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-full w-full dark:bg-[#0a0a0a] bg-white">
      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">Loading Courses Database...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full dark:bg-[#0a0a0a] bg-white text-slate-800 dark:text-slate-200 overflow-hidden select-none">
      
      {/* Top Header & Search Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b dark:border-white/10 border-gray-200 bg-white/50 dark:bg-[#121216]/60 backdrop-blur-lg shrink-0 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
            DB
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Courses Database Preview</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {filteredData.length} of {courses.length} courses
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">Shift sheet left/right to inspect all university eligibility requirements.</p>
          </div>
        </div>
        
        {/* Navigation & Search & Edit Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Search Box */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search across all columns..." 
              className="w-48 sm:w-60 pl-8 pr-3 py-1.5 text-xs border dark:border-white/10 border-gray-300 rounded-xl dark:bg-black/30 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
            )}
          </div>

          {/* Jump to Column dropdown */}
          <select 
            onChange={(e) => { if (e.target.value) jumpToColumn(e.target.value); }}
            defaultValue=""
            className="text-xs bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
          >
            <option value="" disabled>Jump to Column...</option>
            {columns.map(col => (
              <option key={col.key} value={col.key}>{col.label}</option>
            ))}
          </select>

          {/* Freeze Columns Toggle */}
          <button 
            onClick={() => setFreezeColumns(!freezeColumns)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${freezeColumns ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-400 border border-transparent'}`}
            title="Toggle sticky left columns for easy horizontal scrolling"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{freezeColumns ? 'Frozen' : 'Unfreeze'}</span>
          </button>

          {/* Edit / Save Actions */}
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <span>Edit Sheet</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button 
                onClick={cancelEdits}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-neutral-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowConfirm(true)}
                className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sheet Shift Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-slate-50/80 dark:bg-[#151518]/90 border-b dark:border-white/5 border-gray-200 text-xs shrink-0">
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-neutral-400 mr-2 flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Shift Sheet:
          </span>

          <button 
            type="button"
            onClick={shiftToStart}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold text-[11px] flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
            title="Scroll to First Column"
          >
            <span>⇤ First</span>
          </button>

          <button 
            type="button"
            onClick={() => shiftLeft(350)}
            className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-bold text-[11px] flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
            title="Shift Left (350px)"
          >
            <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            <span>Shift Left</span>
          </button>

          <button 
            type="button"
            onClick={() => shiftRight(350)}
            className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-bold text-[11px] flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
            title="Shift Right (350px)"
          >
            <span>Shift Right</span>
            <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <button 
            type="button"
            onClick={shiftToEnd}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold text-[11px] flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
            title="Scroll to Last Column (Fees & Months)"
          >
            <span>Last ⇥</span>
          </button>
        </div>

        {/* Scroll percentage bar */}
        <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500 dark:text-neutral-400">
          <span>Columns Position</span>
          <div className="w-24 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-150" 
              style={{ width: `${Math.max(10, scrollProgress)}%` }}
            ></div>
          </div>
          <span className="w-7 text-right">{scrollProgress}%</span>
        </div>
      </div>

      {/* Main Single-Scroll Table Container */}
      <div 
        ref={tableContainerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/50 dark:bg-[#0c0c0e]"
      >
        {isEditing && !search && (
          <div className="p-3 bg-white dark:bg-[#121216] border-b dark:border-white/10 border-gray-200">
            <button 
              onClick={handleAddRow} 
              className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-1"
            >
              <span>+ Add New Course Row</span>
            </button>
          </div>
        )}
        
        <table className="w-full text-left text-xs whitespace-nowrap min-w-max border-separate border-spacing-0">
          
          {/* Sticky Table Header with Backdrop Blur */}
          <thead className="sticky top-0 z-30 bg-slate-100/95 dark:bg-[#18181c]/95 backdrop-blur-md text-slate-600 dark:text-neutral-300 uppercase font-black text-[10px] shadow-sm">
            <tr>
              {/* Row index header */}
              <th className={`px-3 py-2.5 border-b border-r dark:border-white/10 border-gray-300 text-center align-top w-12 ${freezeColumns ? 'sticky left-0 z-40 bg-slate-200 dark:bg-[#1f1f25]' : ''}`}>
                #
              </th>

              {isEditing && (
                <th className={`px-2 py-2.5 border-b border-r dark:border-white/10 border-gray-300 text-center align-top w-12 ${freezeColumns ? 'sticky left-12 z-40 bg-slate-200 dark:bg-[#1f1f25]' : ''}`}>
                  Act
                </th>
              )}

              {columns.map((c, colIdx) => {
                const isSticky = freezeColumns && (colIdx === 0 || colIdx === 1);
                const stickyLeft = isSticky ? (colIdx === 0 ? (isEditing ? 'left-24' : 'left-12') : (isEditing ? 'left-48' : 'left-36')) : '';

                return (
                  <th 
                    key={c.key} 
                    id={`col-th-${c.key}`}
                    style={{ minWidth: c.minWidth }}
                    className={`px-3 py-2.5 border-b border-r dark:border-white/10 border-gray-300 align-top ${isSticky ? `sticky ${stickyLeft} z-40 bg-slate-100 dark:bg-[#18181c] shadow-[2px_0_5px_rgba(0,0,0,0.05)]` : ''}`}
                  >
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate pr-1">{c.label}</span>
                      </div>
                      {!isEditing && (
                        <ColumnFilter 
                          label={c.label}
                          options={getUniqueValues(c.key)}
                          value={filters[c.key] || []}
                          onChange={(val) => handleFilterChange(c.key, val)}
                          alignRight={colIdx > 7}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y dark:divide-white/5 divide-gray-200">
            {filteredData.map(({ row, index }, rowIdx) => (
              <tr 
                key={index} 
                className="hover:bg-emerald-500/5 dark:hover:bg-white/[0.04] transition-colors group"
              >
                {/* Row Number */}
                <td className={`px-3 py-2 border-r dark:border-white/5 border-gray-200 text-center text-[10px] font-bold text-slate-400 dark:text-neutral-500 ${freezeColumns ? 'sticky left-0 z-20 bg-white dark:bg-[#0c0c0e] group-hover:bg-emerald-50/50 dark:group-hover:bg-[#151518]' : ''}`}>
                  {rowIdx + 1}
                </td>

                {/* Edit Actions */}
                {isEditing && (
                  <td className={`px-2 py-2 border-r dark:border-white/5 border-gray-200 text-center ${freezeColumns ? 'sticky left-12 z-20 bg-white dark:bg-[#0c0c0e] group-hover:bg-emerald-50/50 dark:group-hover:bg-[#151518]' : ''}`}>
                    <button onClick={() => handleDeleteRow(index)} className="text-red-500 hover:text-red-700 font-bold px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete Row">✕</button>
                  </td>
                )}

                {/* Course Data Columns */}
                {columns.map((col, colIdx) => {
                  const isSticky = freezeColumns && (colIdx === 0 || colIdx === 1);
                  const stickyLeft = isSticky ? (colIdx === 0 ? (isEditing ? 'left-24' : 'left-12') : (isEditing ? 'left-48' : 'left-36')) : '';
                  const cellVal = row[col.key] || '';

                  return (
                    <td 
                      key={col.key} 
                      style={{ minWidth: col.minWidth }}
                      className={`px-3 py-2 border-r dark:border-white/5 border-gray-200 ${isSticky ? `sticky ${stickyLeft} z-20 bg-white dark:bg-[#0c0c0e] group-hover:bg-emerald-50/50 dark:group-hover:bg-[#151518] shadow-[2px_0_5px_rgba(0,0,0,0.05)]` : ''}`}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={cellVal}
                          onChange={(e) => handleCellChange(index, col.key, e.target.value)}
                          className="w-full bg-transparent border border-gray-200 dark:border-white/10 focus:border-emerald-500 focus:outline-none px-1.5 py-1 rounded text-xs text-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <div className="truncate max-w-[320px]" title={cellVal}>
                          {col.key === 'category' ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${cellVal.toLowerCase().includes('master') ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                              {cellVal || 'Bachelor'}
                            </span>
                          ) : col.key === 'universityName' ? (
                            <span className="font-bold text-slate-900 dark:text-white">{cellVal || '-'}</span>
                          ) : col.key === 'programName' ? (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{cellVal || '-'}</span>
                          ) : col.key === 'percentage' ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{cellVal || '-'}</span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300">{cellVal || '-'}</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="p-12 text-center text-slate-400 dark:text-neutral-500">
                  <p className="text-sm font-bold mb-1">No courses match the active search or column filters.</p>
                  <button 
                    onClick={() => { setSearch(''); setFilters({}); }}
                    className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 underline"
                  >
                    Clear All Filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Quick Shift Controls at Bottom Right */}
      <div className="absolute bottom-4 right-6 z-40 flex items-center space-x-2 bg-white/90 dark:bg-[#18181c]/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border dark:border-white/10 border-gray-200">
        <button 
          onClick={() => shiftLeft(400)}
          className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm active:scale-95"
          title="Shift Sheet Left (←)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button 
          onClick={() => shiftRight(400)}
          className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm active:scale-95"
          title="Shift Sheet Right (→)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl w-full max-w-md shadow-2xl border dark:border-white/10">
            <h3 className="text-xl font-bold mb-2">Confirm Save</h3>
            <p className="text-sm text-slate-500 dark:text-neutral-400 mb-6">Are you sure you want to save these changes to the Courses Database? This will immediately affect the AI Engine's matching results.</p>
            <div className="flex justify-end space-x-3">
              <button 
                disabled={isSaving}
                onClick={() => setShowConfirm(false)} 
                className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                onClick={saveChanges} 
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 flex items-center"
              >
                {isSaving ? 'Saving...' : 'Yes, Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

