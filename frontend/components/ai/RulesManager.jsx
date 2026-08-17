import React, { useState, useEffect } from 'react';

export default function RulesManager({ config, onSaveConfig }) {
  const [systemInstructions, setSystemInstructions] = useState('');
  const [intakeRemarks, setIntakeRemarks] = useState('');
  const [inclusionRules, setInclusionRules] = useState([]);
  const [exclusionRules, setExclusionRules] = useState([]);
  
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Confirmation state before deleting a rule/filter
  const [ruleToDelete, setRuleToDelete] = useState(null); // { type: 'inclusion'|'exclusion', index: number, text: string }

  useEffect(() => {
    if (config) {
      setSystemInstructions(config.systemInstructions || '');
      setIntakeRemarks(config.intakeRemarks || '');
      setInclusionRules(config.inclusionRules || []);
      setExclusionRules(config.exclusionRules || []);
    }
  }, [config]);

  const handleAddInclusion = (e) => {
    e.preventDefault();
    if (!newInclusion.trim()) return;
    setInclusionRules([...inclusionRules, newInclusion.trim()]);
    setNewInclusion('');
  };

  const confirmRemoveInclusion = (idx) => {
    setRuleToDelete({ type: 'inclusion', index: idx, text: inclusionRules[idx] });
  };

  const handleAddExclusion = (e) => {
    e.preventDefault();
    if (!newExclusion.trim()) return;
    setExclusionRules([...exclusionRules, newExclusion.trim()]);
    setNewExclusion('');
  };

  const confirmRemoveExclusion = (idx) => {
    setRuleToDelete({ type: 'exclusion', index: idx, text: exclusionRules[idx] });
  };

  const handleConfirmDelete = () => {
    if (!ruleToDelete) return;
    if (ruleToDelete.type === 'inclusion') {
      setInclusionRules(inclusionRules.filter((_, i) => i !== ruleToDelete.index));
    } else if (ruleToDelete.type === 'exclusion') {
      setExclusionRules(exclusionRules.filter((_, i) => i !== ruleToDelete.index));
    }
    setRuleToDelete(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveConfig({
        systemInstructions,
        intakeRemarks,
        inclusionRules,
        exclusionRules
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving rules:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 pb-32 shrink-0 relative">
      
      {/* Top Banner & Save Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl dark:bg-white/[0.03] bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border dark:border-white/10 border-indigo-100 backdrop-blur-xl shadow-lg">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white text-slate-900 flex items-center gap-2">
            <span>⚡ Dynamic Rules & Filters Manager</span>
          </h2>
          <p className="text-sm dark:text-neutral-400 text-slate-600 mt-1 font-medium">
            Configure live prompt constraints, university exclusion logic, and seasonal intake formatting. Changes directly modulate Gemini's reasoning engine.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm animate-pulse">
              ✅ Applied & AiTraining.md Refreshed!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3.5 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>Saving Rules...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                <span>Save & Apply Rules</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid for Inclusion and Exclusion Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Inclusion Rules Card */}
        <div className="flex flex-col p-6 rounded-3xl dark:bg-[#121216] bg-white border dark:border-white/10 border-gray-200 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-teal-600"></div>
          <div className="flex items-center justify-between mb-4 pl-2">
            <div>
              <h3 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                <span>Inclusion & Match Rules</span>
              </h3>
              <p className="text-xs dark:text-neutral-400 text-slate-500 mt-0.5">Priorities & guidance applied during student evaluation</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold dark:bg-emerald-500/10 bg-emerald-50 text-emerald-400 border dark:border-emerald-500/20 border-emerald-200">
              {inclusionRules.length} Active
            </span>
          </div>

          {/* List of active rules */}
          <div className="space-y-2.5 flex-1 min-h-[220px] max-h-[320px] overflow-y-auto custom-scrollbar pr-1 pl-2">
            {inclusionRules.length === 0 ? (
              <p className="text-sm dark:text-neutral-500 text-slate-400 italic text-center my-12">No custom inclusion rules configured.</p>
            ) : (
              inclusionRules.map((rule, idx) => (
                <div key={idx} className="flex items-start justify-between p-3.5 rounded-2xl dark:bg-white/[0.03] bg-emerald-50/40 border dark:border-white/5 border-emerald-100 group/item hover:border-emerald-500/30 transition-colors gap-3">
                  <p className="text-sm dark:text-slate-200 text-slate-800 leading-relaxed font-medium">{rule}</p>
                  <button
                    onClick={() => confirmRemoveInclusion(idx)}
                    title="Remove rule"
                    className="w-7 h-7 rounded-xl flex items-center justify-center dark:text-neutral-500 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 opacity-80 group-hover/item:opacity-100 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Input to add new inclusion rule */}
          <form onSubmit={handleAddInclusion} className="mt-6 pt-4 border-t dark:border-white/5 border-gray-100 flex items-center gap-2 pl-2">
            <input
              type="text"
              placeholder="e.g. Prioritize Bio/Life Science for PCB students..."
              value={newInclusion}
              onChange={(e) => setNewInclusion(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl dark:bg-[#1b1b22] bg-gray-50 dark:text-white text-slate-900 border dark:border-white/10 border-gray-200 focus:outline-none focus:border-emerald-500 text-sm placeholder:text-neutral-500 font-medium shadow-inner transition-all"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-2xl font-extrabold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              + Add Rule
            </button>
          </form>
        </div>

        {/* Exclusion Rules Card */}
        <div className="flex flex-col p-6 rounded-3xl dark:bg-[#121216] bg-white border dark:border-white/10 border-gray-200 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-rose-500 to-amber-600"></div>
          <div className="flex items-center justify-between mb-4 pl-2">
            <div>
              <h3 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50"></span>
                <span>Exclusion Filters</span>
              </h3>
              <p className="text-xs dark:text-neutral-400 text-slate-500 mt-0.5">Hard restrictions & blocklisted programs or universities</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold dark:bg-rose-500/10 bg-rose-50 text-rose-400 border dark:border-rose-500/20 border-rose-200">
              {exclusionRules.length} Active
            </span>
          </div>

          {/* List of active exclusion rules */}
          <div className="space-y-2.5 flex-1 min-h-[220px] max-h-[320px] overflow-y-auto custom-scrollbar pr-1 pl-2">
            {exclusionRules.length === 0 ? (
              <p className="text-sm dark:text-neutral-500 text-slate-400 italic text-center my-12">No custom exclusion rules configured.</p>
            ) : (
              exclusionRules.map((rule, idx) => (
                <div key={idx} className="flex items-start justify-between p-3.5 rounded-2xl dark:bg-white/[0.03] bg-rose-50/30 border dark:border-white/5 border-rose-100 group/item hover:border-rose-500/30 transition-colors gap-3">
                  <p className="text-sm dark:text-slate-200 text-slate-800 leading-relaxed font-medium">{rule}</p>
                  <button
                    onClick={() => confirmRemoveExclusion(idx)}
                    title="Remove rule"
                    className="w-7 h-7 rounded-xl flex items-center justify-center dark:text-neutral-500 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 opacity-80 group-hover/item:opacity-100 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Input to add new exclusion rule */}
          <form onSubmit={handleAddExclusion} className="mt-6 pt-4 border-t dark:border-white/5 border-gray-100 flex items-center gap-2 pl-2">
            <input
              type="text"
              placeholder="e.g. Never recommend University of Venice..."
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl dark:bg-[#1b1b22] bg-gray-50 dark:text-white text-slate-900 border dark:border-white/10 border-gray-200 focus:outline-none focus:border-rose-500 text-sm placeholder:text-neutral-500 font-medium shadow-inner transition-all"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-2xl font-extrabold text-sm bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              + Add Filter
            </button>
          </form>
        </div>
      </div>

      {/* System Instructions and Intake Remarks Textbox Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* System Instructions Editor */}
        <div className="p-6 rounded-3xl dark:bg-[#121216] bg-white border dark:border-white/10 border-gray-200 shadow-xl flex flex-col space-y-4">
          <div>
            <h3 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-xl">🧠</span>
              <span>System Instructions (LLM Persona)</span>
            </h3>
            <p className="text-xs dark:text-neutral-400 text-slate-500 mt-1 font-medium">
              Core directives governing Gemini's tone, extraction precision, and domain identity.
            </p>
          </div>
          <textarea
            value={systemInstructions}
            onChange={(e) => setSystemInstructions(e.target.value)}
            rows={8}
            className="w-full flex-1 p-4 rounded-2xl dark:bg-[#1b1b22] bg-gray-50 dark:text-white text-slate-800 border dark:border-white/10 border-gray-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500 shadow-inner custom-scrollbar resize-none"
            placeholder="Enter core system instructions for Gemini..."
          />
        </div>

        {/* Seasonal Intake Remarks Editor */}
        <div className="p-6 rounded-3xl dark:bg-[#121216] bg-white border dark:border-white/10 border-gray-200 shadow-xl flex flex-col space-y-4">
          <div>
            <h3 className="text-lg font-black dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span>Seasonal Intake Remarks</span>
            </h3>
            <p className="text-xs dark:text-neutral-400 text-slate-500 mt-1 font-medium">
              Standard application timelines & policy notices appended to student email replies.
            </p>
          </div>
          <textarea
            value={intakeRemarks}
            onChange={(e) => setIntakeRemarks(e.target.value)}
            rows={8}
            className="w-full flex-1 p-4 rounded-2xl dark:bg-[#1b1b22] bg-gray-50 dark:text-white text-slate-800 border dark:border-white/10 border-gray-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-purple-500 shadow-inner custom-scrollbar resize-none"
            placeholder="Enter seasonal intake remarks and application timeline details..."
          />
        </div>
      </div>

      {/* ==========================================
          MODAL: CONFIRM DELETION OF RULE / FILTER
          ========================================== */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl dark:bg-[#16161b] bg-white border dark:border-white/15 border-gray-200 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-black text-2xl shrink-0 border border-rose-500/20">
                🗑️
              </div>
              <div>
                <h4 className="text-lg font-black dark:text-white text-slate-900 leading-tight">
                  Confirm Rule Deletion
                </h4>
                <p className="text-xs dark:text-neutral-400 text-slate-500 font-medium">
                  {ruleToDelete.type === 'inclusion' ? 'Inclusion & Match Rule' : 'Exclusion Filter Restriction'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#1b1b22] bg-gray-50 border dark:border-white/10 border-gray-200 text-xs">
              <p className="font-mono dark:text-slate-300 text-slate-700 leading-relaxed italic">
                "{ruleToDelete.text}"
              </p>
            </div>

            <p className="text-xs dark:text-neutral-400 text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this rule from your reasoning configuration? This action takes effect upon saving.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t dark:border-white/10 border-gray-100">
              <button
                onClick={() => setRuleToDelete(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs dark:bg-white/10 bg-gray-200 hover:dark:bg-white/15 hover:bg-gray-300 dark:text-neutral-200 text-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
              >
                Permanently Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
