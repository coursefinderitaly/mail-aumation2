'use client';

import React, { useState, useEffect } from 'react';

const DEFAULT_TEMPLATES = {
  greetings: "Greetings!",
  safeToApplyText: "SAFE TO APPLY - Only if s/he clears the admission test!!",
  gapWarningText: "NEED TO JUSTIFY GAP WITH PROPER CERTIFICATES",
  pursuing12thWarningText: "Course options are shared only on the basis of predicted marks above 70% also the 12th result will be required till 20th of June 2027.",
  pursuingBachelorWarningText: "NEED PROVISIONAL DEGREE / FINAL TRANSCRIPTS BY JUNE 2027",
  reEvaluationNote: "Before starting the process for {intake} - we will evaluate the profile again as per updated requirements and then finalize the options!!",
  courseAvailabilityIntro: "I have added overall possible course options based on {educationLevel} subjects & preferences, that are available in Italian public universities with 100% Scholarship.",
  updatesDisclaimer: "We will share the information regarding updates (If Any). Also, throughout the process, if we find any more options, we will update the same to you.",
  examBookingNote: "Note: It is essential to book an exam prior to the application submission. The score card will be required when submitting the applications.",
  currentYearDisclaimer: "Note: These details are as per the current year {currentYear} guidelines. If any updates or changes occur for {intake} intake, we will update you accordingly.",
  tableRemarks: {
    headerText: "REMARKS: Details for {intake} Intake",
    point1: "1. We will evaluate the profile again before starting the admission application submission",
    point2: "2. Admission will depend on admission test: CEnT-S, SAT (1300/1600), or respective university test",
    point3: "3. IELTS: Overall 6 band (B2 Level)",
    point4: "4. Application will begin only after completion of all the required documents.",
    point5Highlight: "5. CEnT-S registration is open now - students can book the test for timely results and applications",
    applicationStartHighlight: "We can start admission applications for {intake} by November {previousYear}!!",
    veniceWarning: "We do not proceed with University of Venice - as it has some scholarship issues"
  },
  lowProfile: {
    badgeText: "RISK APPLICATION",
    mainNotice: "This is to inform you that we are unable to proceed with this application due to the low percentage. No university will give priority to this cgpa/percentage.",
    reasonText: "The percentage is very low, that's why we can not take this profile.",
    suretyNotice: "We can not give surety on any part (Admission, Scholarship or Visa)"
  },
  ineligibleBackground: {
    badgeText: "ACADEMIC BACKGROUND MISMATCH",
    mainNotice: "This is to inform you that there are no eligible options available in public universities for the requested program due to academic stream / background requirements (e.g. Non-PCM / domain mismatch).",
    alternativeOffer: "If you want, we can evaluate and send you available university course options according to your academic profile.",
    suretyNotice: "We cannot proceed with applications for off-domain programs as universities strictly filter out incompatible backgrounds."
  },
  missing11th: {
    title: "ACTION REQUIRED: 11th Grade Marks Missing",
    message1: "Thank you for reaching out to us.",
    message2: "We noticed that you are currently pursuing your 12th standard, but we do not have your 11th standard percentage.",
    message3: "As we don't have enough information to accurately recommend universities, kindly reply to this email with your 11th percentage.",
    followUp: "Once we receive this information, we will gladly curate a list of matching programs for you."
  },
  lowCourseOptions: {
    badgeText: "PRE-ENROLLMENT RISK WARNING",
    mainNotice: "This is to inform you that we found very few course options matching your profile.",
    reasonText: "As your percentage is low as per the university criteria, even after clearing the university test, your admission can be cancelled at the pre-enrollment stage.",
    alternativeOffer: "If you want, we can send you the remaining course options too."
  },
  noCourseAvailable: {
    badgeText: "NO COURSE OPTIONS AVAILABLE",
    mainNotice: "This is to inform you that there are no course options available for this profile matching what the student has required.",
    alternativeOffer: "If you would like, we can evaluate the profile for alternative related domains or locations, if applicable."
  },
  signature: "Best regards,<br><b style=\"color: #000;\">Presume Overseas Admission Team</b>"
};

const SAMPLE_STUDENTS = {
  BACHELOR_GAP: {
    label: "Bachelor (PCM, 74.6%, Gap Year)",
    studentData: { learnerName: "Jay Kumar Jhirwal", class12Stream: "pcm", class12Score: "74.6%", intakePitched: "Sept 2027", programOfInterest: "Bachelors in Computer science and AI" },
    isGap: true,
    isPursuing: false,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: false
  },
  BACHELOR_PURSUING: {
    label: "Bachelor (12th Pursuing, Predicted 75%)",
    studentData: { learnerName: "Ananya Roy", class12Stream: "pcm", class12Score: "75%", class11Score: "78%", intakePitched: "Sept 2027", programOfInterest: "Bachelors in Artificial Intelligence" },
    isGap: false,
    isPursuing: true,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: false
  },
  MASTER_GAP: {
    label: "Master (BCA 72%, 2 Yr Gap)",
    studentData: { learnerName: "Rohit Phulara", bachelorDegree: "BCA", bachelorScore: "72%", intakePitched: "Sept 2027", programOfInterest: "Masters in Data Science" },
    isGap: true,
    isPursuing: false,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: false
  },
  MASTER_PURSUING: {
    label: "Master (B.Tech Final Year Pursuing)",
    studentData: { learnerName: "Pooja Verma", bachelorDegree: "B.Tech", bachelorScore: "78%", intakePitched: "Sept 2027", programOfInterest: "Masters in Computer Engineering" },
    isGap: false,
    isPursuing: true,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: false
  },
  LOW_PROFILE: {
    label: "Low Profile / Low Score (< 65% Risk)",
    studentData: { learnerName: "Krishan Bhati", bachelorDegree: "BA General", bachelorScore: "50%", intakePitched: "Sept 2027", programOfInterest: "Masters in Management" },
    isGap: true,
    isPursuing: false,
    isLowProfile: true,
    isIneligibleBackground: false,
    missing11thScore: false
  },
  INELIGIBLE_BG: {
    label: "Ineligible Background (Commerce -> CS/Engineering)",
    studentData: { learnerName: "Deepak Mehta", class12Stream: "commerce", class12Score: "82%", intakePitched: "Sept 2027", programOfInterest: "Bachelors in Computer Engineering" },
    isGap: false,
    isPursuing: false,
    isLowProfile: false,
    isIneligibleBackground: true,
    missing11thScore: false
  },
  MISSING_11TH: {
    label: "Missing 11th Grade Marks Alert",
    studentData: { learnerName: "Sarthak Jain", class12Stream: "pcm", isPursuing: true, intakePitched: "Sept 2027", programOfInterest: "Bachelors in Engineering" },
    isGap: false,
    isPursuing: true,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: true
  },
  LOW_COURSE_OPTIONS: {
    label: "Low Course Options (1-2 Matches)",
    studentData: { learnerName: "Aman Sharma", class12Stream: "pcm", class12Score: "62%", intakePitched: "Sept 2027", programOfInterest: "Bachelors in Computer Engineering" },
    isGap: false,
    isPursuing: false,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: false,
    isLowCourseOptions: true
  },
  NO_COURSE_AVAILABLE: {
    label: "No Course Available (0 Matches for Specific POI)",
    studentData: { learnerName: "Tushar Rawat", bachelorDegree: "BA General / BSc General", bachelorProgram: "Animation", bachelorScore: "71.55%", targetDegreeLevel: "Masters", intakePitched: "Sept 2027", programOfInterest: "Masters In Animation Masters in UI/UX" },
    isGap: true,
    isPursuing: false,
    isLowProfile: false,
    isIneligibleBackground: false,
    missing11thScore: false,
    isLowCourseOptions: false,
    isNoCourseOptionsForPoi: true
  }
};

export default function MailFormatsDashboard() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [activeTab, setActiveTab] = useState('BACHELORS');
  const [selectedSampleKey, setSelectedSampleKey] = useState('BACHELOR_GAP');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' or 'html'
  const [previewLayout, setPreviewLayout] = useState('split'); // 'split', 'wide', 'full'
  const [zoomPercent, setZoomPercent] = useState(115); // 90, 100, 115, 125, 140, 150, 175
  const [isMaximized, setIsMaximized] = useState(false);

  // Fetch saved templates from backend on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/mail-templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(prev => ({
          ...DEFAULT_TEMPLATES,
          ...data,
          tableRemarks: { ...DEFAULT_TEMPLATES.tableRemarks, ...(data.tableRemarks || {}) },
          lowProfile: { ...DEFAULT_TEMPLATES.lowProfile, ...(data.lowProfile || {}) },
          ineligibleBackground: { ...DEFAULT_TEMPLATES.ineligibleBackground, ...(data.ineligibleBackground || {}) },
          missing11th: { ...DEFAULT_TEMPLATES.missing11th, ...(data.missing11th || {}) },
          lowCourseOptions: { ...DEFAULT_TEMPLATES.lowCourseOptions, ...(data.lowCourseOptions || {}) }
        }));
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-render preview whenever templates or sample student changes
  useEffect(() => {
    renderPreview();
  }, [templates, selectedSampleKey]);

  const renderPreview = async () => {
    const sample = SAMPLE_STUDENTS[selectedSampleKey] || SAMPLE_STUDENTS.BACHELOR_GAP;
    try {
      const res = await fetch(`/api/mail-templates/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateConfig: templates,
          studentData: sample.studentData,
          isPursuing: sample.isPursuing,
          isGap: sample.isGap,
          missing11thScore: sample.missing11thScore,
          isLowProfile: sample.isLowProfile,
          isIneligibleBackground: sample.isIneligibleBackground,
          isLowCourseOptions: sample.isLowCourseOptions,
          isNoCourseOptionsForPoi: sample.isNoCourseOptionsForPoi
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html || '');
      }
    } catch (err) {
      console.error("Preview render failed:", err);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/mail-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert("Error saving mail templates: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all mail templates to agency defaults?")) return;
    try {
      const res = await fetch(`/api/mail-templates/reset`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.mailTemplates || DEFAULT_TEMPLATES);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert("Error resetting templates: " + err.message);
    }
  };

  const updateField = (field, value) => {
    setTemplates(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent, field, value) => {
    setTemplates(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || {}),
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'BACHELORS', label: 'Bachelors', icon: '🎓', sample: 'BACHELOR_GAP' },
    { id: 'MASTERS', label: 'Masters', icon: '🏛️', sample: 'MASTER_GAP' },
    { id: 'PURSUING', label: 'Pursuing (12th/UG)', icon: '⏳', sample: 'BACHELOR_PURSUING' },
    { id: 'GAP_YEAR', label: 'Gap Justification', icon: '⚠️', sample: 'BACHELOR_GAP' },
    { id: 'LOW_PROFILE', label: 'Low Profile (Risk)', icon: '🚨', sample: 'LOW_PROFILE' },
    { id: 'INELIGIBLE_BG', label: 'Ineligible Background', icon: '🚫', sample: 'INELIGIBLE_BG' },
    { id: 'MISSING_11TH', label: 'Missing 11th Marks', icon: '📋', sample: 'MISSING_11TH' },
    { id: 'LOW_COURSE_OPTIONS', label: 'Low Course Options', icon: '📉', sample: 'LOW_COURSE_OPTIONS' },
    { id: 'NO_COURSE_AVAILABLE', label: 'No Course Available', icon: '0️⃣', sample: 'NO_COURSE_AVAILABLE' },
    { id: 'REMARKS_TABLE', label: 'Table Remarks & Venice', icon: '📊', sample: 'BACHELOR_GAP' }
  ];

  return (
    <div className="w-full h-full flex flex-col dark:bg-[#0c0c0e] bg-slate-50 overflow-hidden select-none">
      
      {/* Top Banner Header */}
      <div className="shrink-0 p-4 sm:px-6 border-b dark:border-white/10 border-slate-200 dark:bg-[#111115] bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 text-lg shrink-0">
            ✉️
          </div>
          <div>
            <h1 className="text-lg font-black dark:text-white text-slate-900 tracking-tight flex items-center gap-2">
              Mail Formats & Template Studio
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md dark:bg-amber-500/20 bg-amber-100 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                Live Editor
              </span>
            </h1>
            <p className="text-xs dark:text-neutral-400 text-slate-500 mt-0.5">
              Customize outgoing email drafts, remarks, table headers, risk warnings, and disclaimers.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              Saved Successfully!
            </span>
          )}

          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-bold dark:bg-neutral-800 bg-slate-100 hover:dark:bg-neutral-700 hover:bg-slate-200 dark:text-neutral-300 text-slate-700 transition-all cursor-pointer"
          >
            Reset Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 active:scale-95 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="shrink-0 px-4 sm:px-6 py-2 border-b dark:border-white/5 border-slate-200 dark:bg-[#15151a] bg-slate-100/70 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedSampleKey(tab.sample);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'dark:bg-amber-500/20 bg-amber-100 dark:text-amber-300 text-amber-800 border dark:border-amber-500/30 border-amber-300 shadow-sm'
                : 'dark:text-neutral-400 text-slate-600 dark:hover:bg-white/5 hover:bg-slate-200 border border-transparent'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Workspace (2 Panels: Left Editor, Right Live Preview) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT PANEL: Interactive Editor */}
        <div className={`${
          previewLayout === 'full' ? 'hidden' : previewLayout === 'wide' ? 'w-full lg:w-[24%]' : 'w-full lg:w-[34%]'
        } h-full overflow-y-auto p-4 sm:p-6 space-y-5 border-r dark:border-white/10 border-slate-200 scrollbar-thin shrink-0 transition-all duration-300`}>
          
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Customize: {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
              Placeholders: {'{intake}'}, {'{currentYear}'}
            </span>
          </div>

          {/* TAB 1: BACHELORS & GENERAL HEADERS */}
          {(activeTab === 'BACHELORS' || activeTab === 'MASTERS') && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Greetings Opening
                </label>
                <input
                  type="text"
                  value={templates.greetings || ''}
                  onChange={(e) => updateField('greetings', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="Greetings!"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Safe To Apply Text (Green Highlight)
                </label>
                <input
                  type="text"
                  value={templates.safeToApplyText || ''}
                  onChange={(e) => updateField('safeToApplyText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Profile Re-Evaluation Note
                </label>
                <textarea
                  rows={2}
                  value={templates.reEvaluationNote || ''}
                  onChange={(e) => updateField('reEvaluationNote', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Course Availability Introduction (Blue Text)
                </label>
                <textarea
                  rows={2}
                  value={templates.courseAvailabilityIntro || ''}
                  onChange={(e) => updateField('courseAvailabilityIntro', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Updates Disclaimer Line
                </label>
                <textarea
                  rows={2}
                  value={templates.updatesDisclaimer || ''}
                  onChange={(e) => updateField('updatesDisclaimer', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Exam Booking Note (Peach Box)
                </label>
                <textarea
                  rows={2}
                  value={templates.examBookingNote || ''}
                  onChange={(e) => updateField('examBookingNote', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-indigo-950/20 bg-indigo-50 border dark:border-indigo-500/20 border-indigo-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                  <span>📅 Dynamic Current Year Notice (All non-low profile mails)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Automatically replaces <code>{'{currentYear}'}</code> with current active year (e.g. 2026) and <code>{'{intake}'}</code> with target intake.
                </p>
                <textarea
                  rows={2}
                  value={templates.currentYearDisclaimer || ''}
                  onChange={(e) => updateField('currentYearDisclaimer', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-white border dark:border-white/10 border-indigo-200 dark:text-white text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PURSUING STUDENTS */}
          {activeTab === 'PURSUING' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-amber-500">
                  Class 12th Pursuing Alert (Predicted Marks Banner - Image 3)
                </label>
                <textarea
                  rows={3}
                  value={templates.pursuing12thWarningText || ''}
                  onChange={(e) => updateField('pursuing12thWarningText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-amber-500">
                  Bachelor Degree Pursuing Alert (Provisional Degree Deadline)
                </label>
                <textarea
                  rows={2}
                  value={templates.pursuingBachelorWarningText || ''}
                  onChange={(e) => updateField('pursuingBachelorWarningText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: GAP YEAR */}
          {activeTab === 'GAP_YEAR' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-red-500">
                  Gap Year Justification Banner (Yellow background, Red text)
                </label>
                <input
                  type="text"
                  value={templates.gapWarningText || ''}
                  onChange={(e) => updateField('gapWarningText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: LOW PROFILE / RISK APPLICATION */}
          {activeTab === 'LOW_PROFILE' && (
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                Sent to students with low score percentages (&lt; 65%) where no public university options can proceed.
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-red-500">
                  Risk Application Badge
                </label>
                <input
                  type="text"
                  value={templates.lowProfile?.badgeText || ''}
                  onChange={(e) => updateNestedField('lowProfile', 'badgeText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Main Inability Notice
                </label>
                <textarea
                  rows={3}
                  value={templates.lowProfile?.mainNotice || ''}
                  onChange={(e) => updateNestedField('lowProfile', 'mainNotice', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Reason Explanation
                </label>
                <input
                  type="text"
                  value={templates.lowProfile?.reasonText || ''}
                  onChange={(e) => updateNestedField('lowProfile', 'reasonText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Surety & Guarantee Disclaimer
                </label>
                <input
                  type="text"
                  value={templates.lowProfile?.suretyNotice || ''}
                  onChange={(e) => updateNestedField('lowProfile', 'suretyNotice', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 5: INELIGIBLE BACKGROUND */}
          {activeTab === 'INELIGIBLE_BG' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium">
                Sent when a student requests a field incompatible with their stream (e.g. Commerce applying to Engineering).
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-red-500">
                  Background Mismatch Badge
                </label>
                <input
                  type="text"
                  value={templates.ineligibleBackground?.badgeText || ''}
                  onChange={(e) => updateNestedField('ineligibleBackground', 'badgeText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Ineligible Explanation
                </label>
                <textarea
                  rows={3}
                  value={templates.ineligibleBackground?.mainNotice || ''}
                  onChange={(e) => updateNestedField('ineligibleBackground', 'mainNotice', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-blue-950/20 bg-blue-50 border dark:border-blue-500/20 border-blue-200 space-y-3">
                <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                  Alternative Profile Courses Offer
                </label>
                <textarea
                  rows={2}
                  value={templates.ineligibleBackground?.alternativeOffer || ''}
                  onChange={(e) => updateNestedField('ineligibleBackground', 'alternativeOffer', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-white border dark:border-white/10 border-blue-200 dark:text-white text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 6: MISSING 11TH SCORE */}
          {activeTab === 'MISSING_11TH' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-amber-500">
                  Card Title
                </label>
                <input
                  type="text"
                  value={templates.missing11th?.title || ''}
                  onChange={(e) => updateNestedField('missing11th', 'title', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Message Lines
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={templates.missing11th?.message1 || ''}
                    onChange={(e) => updateNestedField('missing11th', 'message1', e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                  />
                  <input
                    type="text"
                    value={templates.missing11th?.message2 || ''}
                    onChange={(e) => updateNestedField('missing11th', 'message2', e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                  />
                  <input
                    type="text"
                    value={templates.missing11th?.message3 || ''}
                    onChange={(e) => updateNestedField('missing11th', 'message3', e.target.value)}
                    className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Follow-up Line
                </label>
                <input
                  type="text"
                  value={templates.missing11th?.followUp || ''}
                  onChange={(e) => updateNestedField('missing11th', 'followUp', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 7: LOW COURSE OPTIONS */}
          {activeTab === 'LOW_COURSE_OPTIONS' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium">
                Sent when a bachelor student has fewer than 3 matching course options.
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-amber-500">
                  Warning Badge Text
                </label>
                <input
                  type="text"
                  value={templates.lowCourseOptions?.badgeText || ''}
                  onChange={(e) => updateNestedField('lowCourseOptions', 'badgeText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Main Notice
                </label>
                <textarea
                  rows={2}
                  value={templates.lowCourseOptions?.mainNotice || ''}
                  onChange={(e) => updateNestedField('lowCourseOptions', 'mainNotice', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Reason / Risk Explanation
                </label>
                <textarea
                  rows={3}
                  value={templates.lowCourseOptions?.reasonText || ''}
                  onChange={(e) => updateNestedField('lowCourseOptions', 'reasonText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-blue-950/20 bg-blue-50 border dark:border-blue-500/20 border-blue-200 space-y-3">
                <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                  Alternative Offer
                </label>
                <input
                  type="text"
                  value={templates.lowCourseOptions?.alternativeOffer || ''}
                  onChange={(e) => updateNestedField('lowCourseOptions', 'alternativeOffer', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-white border dark:border-white/10 border-blue-200 dark:text-white text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 8: NO COURSE AVAILABLE */}
          {activeTab === 'NO_COURSE_AVAILABLE' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium">
                Sent when a student requests a specific program but there are 0 matches in the database.
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-amber-500">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={templates.noCourseAvailable?.badgeText || ''}
                  onChange={(e) => updateNestedField('noCourseAvailable', 'badgeText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Main Notice
                </label>
                <textarea
                  rows={2}
                  value={templates.noCourseAvailable?.mainNotice || ''}
                  onChange={(e) => updateNestedField('noCourseAvailable', 'mainNotice', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                  Alternative Offer
                </label>
                <textarea
                  rows={2}
                  value={templates.noCourseAvailable?.alternativeOffer || ''}
                  onChange={(e) => updateNestedField('noCourseAvailable', 'alternativeOffer', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 9: TABLE REMARKS & VENICE WARNING */}
          {activeTab === 'REMARKS_TABLE' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                  Remarks Header Box Title
                </label>
                <input
                  type="text"
                  value={templates.tableRemarks?.headerText || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'headerText', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
                  Numbered Application Rules
                </label>
                <input
                  type="text"
                  value={templates.tableRemarks?.point1 || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'point1', e.target.value)}
                  className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                />
                <input
                  type="text"
                  value={templates.tableRemarks?.point2 || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'point2', e.target.value)}
                  className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                />
                <input
                  type="text"
                  value={templates.tableRemarks?.point3 || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'point3', e.target.value)}
                  className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                />
                <input
                  type="text"
                  value={templates.tableRemarks?.point4 || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'point4', e.target.value)}
                  className="w-full text-xs font-medium p-2 rounded-lg dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-amber-500">
                  CEnT-S Registration Highlight (Yellow Box)
                </label>
                <input
                  type="text"
                  value={templates.tableRemarks?.point5Highlight || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'point5Highlight', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                  Application Start Date Timeline
                </label>
                <input
                  type="text"
                  value={templates.tableRemarks?.applicationStartHighlight || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'applicationStartHighlight', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 rounded-2xl dark:bg-red-950/20 bg-red-50 border dark:border-red-500/20 border-red-200 space-y-3">
                <label className="block text-xs font-bold text-red-600 dark:text-red-400">
                  University of Venice Exclusion Warning
                </label>
                <input
                  type="text"
                  value={templates.tableRemarks?.veniceWarning || ''}
                  onChange={(e) => updateNestedField('tableRemarks', 'veniceWarning', e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-white border dark:border-white/10 border-red-200 dark:text-white text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          {/* SIGNATURE (Common to all tabs) */}
          <div className="p-4 rounded-2xl dark:bg-[#18181d] bg-white border dark:border-white/5 border-slate-200 space-y-3">
            <label className="block text-xs font-bold dark:text-neutral-300 text-slate-700">
              Email Signature Line (HTML Supported)
            </label>
            <input
              type="text"
              value={templates.signature || ''}
              onChange={(e) => updateField('signature', e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl dark:bg-black/40 bg-slate-50 border dark:border-white/10 border-slate-300 dark:text-white text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* RIGHT PANEL: Live Rendered Preview (Spacious & Scalable) */}
        <div className="flex-1 h-full flex flex-col dark:bg-[#09090b] bg-slate-100/80 overflow-hidden">
          
          {/* Preview Controls Header Toolbar */}
          <div className="shrink-0 p-3 sm:px-5 border-b dark:border-white/10 border-slate-200 dark:bg-[#111115] bg-white flex flex-wrap items-center justify-between gap-3">
            
            {/* Left: Test Profile Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 shrink-0">Profile:</span>
              <select
                value={selectedSampleKey}
                onChange={(e) => setSelectedSampleKey(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl dark:bg-neutral-800 bg-slate-100 dark:text-white text-slate-800 border dark:border-white/10 border-slate-300 focus:outline-none cursor-pointer"
              >
                {Object.entries(SAMPLE_STUDENTS).map(([key, item]) => (
                  <option key={key} value={key}>{item.label}</option>
                ))}
              </select>
            </div>

            {/* Center: Layout View Switcher & Zoom Controls */}
            <div className="flex items-center gap-2">
              
              {/* Layout Mode Pill */}
              <div className="flex items-center p-0.5 rounded-xl dark:bg-neutral-800 bg-slate-200/80 border dark:border-white/5 border-slate-300">
                <button
                  onClick={() => setPreviewLayout('split')}
                  title="Split View (40% Editor / 60% Preview)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewLayout === 'split'
                      ? 'dark:bg-amber-500 bg-white dark:text-black text-amber-900 shadow-sm'
                      : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-black'
                  }`}
                >
                  🔲 Split
                </button>
                <button
                  onClick={() => setPreviewLayout('wide')}
                  title="Wide Preview (28% Editor / 72% Preview)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewLayout === 'wide'
                      ? 'dark:bg-amber-500 bg-white dark:text-black text-amber-900 shadow-sm'
                      : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-black'
                  }`}
                >
                  🖥️ Wide
                </button>
                <button
                  onClick={() => setPreviewLayout('full')}
                  title="Full Preview (100% Full Width Preview)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewLayout === 'full'
                      ? 'dark:bg-amber-500 bg-white dark:text-black text-amber-900 shadow-sm'
                      : 'dark:text-neutral-400 text-slate-600 hover:dark:text-white hover:text-black'
                  }`}
                >
                  📄 Full View
                </button>
              </div>

              {/* Zoom Scale Controls */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl dark:bg-neutral-800 bg-slate-200/80 border dark:border-white/5 border-slate-300 text-xs font-bold">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 mr-0.5">Zoom:</span>
                <button
                  onClick={() => setZoomPercent(prev => Math.max(75, prev - 10))}
                  title="Zoom Out"
                  className="w-5 h-5 rounded flex items-center justify-center hover:dark:bg-white/10 hover:bg-white text-slate-700 dark:text-neutral-300 cursor-pointer text-sm font-bold"
                >
                  -
                </button>
                <span className="min-w-[36px] text-center dark:text-white text-slate-800 text-xs font-black">
                  {zoomPercent}%
                </span>
                <button
                  onClick={() => setZoomPercent(prev => Math.min(200, prev + 10))}
                  title="Zoom In"
                  className="w-5 h-5 rounded flex items-center justify-center hover:dark:bg-white/10 hover:bg-white text-slate-700 dark:text-neutral-300 cursor-pointer text-sm font-bold"
                >
                  +
                </button>
                {zoomPercent !== 115 && (
                  <button
                    onClick={() => setZoomPercent(115)}
                    title="Reset Zoom to 115%"
                    className="text-[10px] text-amber-600 dark:text-amber-400 ml-1 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Right: Maximize, View Mode & Copy */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMaximized(true)}
                title="Fullscreen Preview Modal"
                className="text-xs font-bold px-3.5 py-1.5 rounded-xl dark:bg-amber-500/20 bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>⛶</span>
                <span>Maximize</span>
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'rendered' ? 'html' : 'rendered')}
                className="text-xs font-bold px-3 py-1.5 rounded-xl dark:bg-neutral-800 bg-slate-100 dark:text-neutral-300 text-slate-700 hover:dark:bg-neutral-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                {viewMode === 'rendered' ? '</> HTML' : '👁️ Visual'}
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewHtml);
                  alert("Email HTML copied to clipboard!");
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl dark:bg-white/10 bg-slate-200 dark:text-white text-slate-800 hover:opacity-80 transition-all cursor-pointer"
                title="Copy HTML to clipboard"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Full-view quick return banner when in 'full' layout */}
          {previewLayout === 'full' && (
            <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold flex items-center gap-1.5">
                <span>👁️ Full-Width Preview Active</span>
                <span className="text-slate-400 dark:text-neutral-500">• Complete email draft is expanded without sidebar constraints.</span>
              </span>
              <button
                onClick={() => setPreviewLayout('split')}
                className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] hover:opacity-90 cursor-pointer"
              >
                ← Back to Editor Split
              </button>
            </div>
          )}

          {/* Rendered Window (Generous size with Zoom & Table Support) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin">
            <div 
              style={{ zoom: `${zoomPercent}%` }}
              className="w-full max-w-7xl mx-auto rounded-2xl shadow-2xl border dark:border-white/10 border-slate-200 bg-white text-slate-900 p-8 sm:p-12 min-h-[650px] transition-all duration-200"
            >
              {viewMode === 'rendered' ? (
                <div 
                  className="w-full text-slate-900 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }} 
                />
              ) : (
                <pre className="text-xs font-mono p-5 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {previewHtml}
                </pre>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* FULLSCREEN POPUP MODAL (100% Screen Immersion) */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-fadeIn">
          
          {/* Fullscreen Header */}
          <div className="shrink-0 p-3 sm:px-6 rounded-t-2xl dark:bg-[#15151a] bg-white border-b dark:border-white/10 border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base font-black dark:text-white text-slate-900 flex items-center gap-2">
                ✉️ Full-Screen Email Preview
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
                  {SAMPLE_STUDENTS[selectedSampleKey]?.label}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl dark:bg-neutral-800 bg-slate-100 text-xs font-bold">
                <span className="text-slate-500 dark:text-neutral-400">Zoom:</span>
                <button
                  onClick={() => setZoomPercent(prev => Math.max(75, prev - 10))}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold"
                >
                  -
                </button>
                <span className="min-w-[36px] text-center font-black">{zoomPercent}%</span>
                <button
                  onClick={() => setZoomPercent(prev => Math.min(200, prev + 10))}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewHtml);
                  alert("Email HTML copied!");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:opacity-80"
              >
                Copy HTML
              </button>

              <button
                onClick={() => setIsMaximized(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-red-500 text-white hover:opacity-90 flex items-center gap-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Fullscreen Email Content Scroll Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-10 rounded-b-2xl dark:bg-[#0c0c0e] bg-slate-100">
            <div 
              style={{ zoom: `${zoomPercent}%` }}
              className="w-full max-w-6xl mx-auto rounded-2xl shadow-2xl border dark:border-white/10 border-slate-200 bg-white text-slate-900 p-10 sm:p-16 min-h-[700px]"
            >
              <div 
                className="w-full text-slate-900 text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml }} 
              />
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
