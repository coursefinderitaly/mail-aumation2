import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Pure Red', value: '#FF0000' },
  { name: 'Pure Green', value: '#00FF00' },
  { name: 'Pure Blue', value: '#0000FF' },
  { name: 'Pure Yellow', value: '#FFFF00' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Peach', value: '#fce4d6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Clear', value: 'transparent' }
];

export default function ComposeModal({ isOpen, onClose, initialData }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [messageId, setMessageId] = useState('');
  const [references, setReferences] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  // Template builder states
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [studentName, setStudentName] = useState('Student');
  const [programOfInterest, setProgramOfInterest] = useState('Computer Science & Engineering');
  const [intakePitched, setIntakePitched] = useState('Sept 2027');

  const editableRef = useRef(null);
  const currentHtmlRef = useRef('');
  const isEditableMounted = useRef(false);

  useEffect(() => {
    if (editableRef.current && !isEditableMounted.current) {
      isEditableMounted.current = true;
      editableRef.current.innerHTML = currentHtmlRef.current || htmlBody || '';
    } else if (!editableRef.current) {
      isEditableMounted.current = false;
    }
  });

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/courses`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllCourses(data);
        })
        .catch(e => console.error('Failed to fetch courses:', e));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTo(initialData.to || '');
        setSubject(initialData.subject || '');
        setHtmlBody(initialData.htmlBody || '');
        currentHtmlRef.current = initialData.htmlBody || '';
        setBody(initialData.body || '');
        setThreadId(initialData.threadId || null);
        setMessageId(initialData.messageId || '');
        setReferences(initialData.references || '');
        setIsTemplateMode(Boolean(initialData.htmlBody));
      } else {
        setTo(''); setSubject(''); setBody(''); setHtmlBody(''); setThreadId(null); setMessageId(''); setReferences('');
        setIsTemplateMode(false);
        setSelectedCourses([]);
      }
      setSendSuccess(false);
      setIsSending(false);
    }
  }, [isOpen, initialData]);

  const generateLiveTemplate = (sName, prog, intake, coursesList) => {
    const coursesHtml = coursesList.map((c, i) => `
      <tr style="text-align: center; border-bottom: 1px solid #ccc;">
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; font-weight: bold; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; font-weight: bold; text-align: left; color: #111;">${c.universityName || c.university || 'University Option'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; text-align: center;">${c.duration || '3 Years'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; font-weight: bold; text-align: left; color: #0056b3;">${c.programName || c.name || prog || 'B.Sc / B.Tech'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; font-weight: bold; text-align: center;">${c.percentage || c.score || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; text-align: center;">${c.languageRequirement || 'IELTS 6.0'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; text-align: center;">${c.otherReq || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; font-weight: bold; text-align: center;">${c.admissionTest || 'CEnT-S / SAT / Interview'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; text-align: center;">${c.applicationFees || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 5px 8px; font-size: 12px; text-align: center;">${c.tentativeMonths || '-'}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5; font-size: 14px; max-width: 100%; margin: 0 auto; padding: 4px;">
        <p style="font-size: 15px; font-weight: bold; margin: 0 0 12px 0;">Greetings!</p>

        <p style="margin: 10px 0;">
          <span style="background-color: #fce4d6; padding: 4px 10px; font-weight: bold; font-size: 13.5px; color: #000; display: inline-block; border-radius: 4px;">For ${intake || 'September 2027'} Intake</span>
        </p>

        <p style="margin: 10px 0; font-size: 13.5px;">
          <span style="background-color: #00FF00; padding: 4px 10px; font-weight: bold; color: #000; display: inline-block; border-radius: 4px;">SAFE TO APPLY</span> <span style="font-weight: bold; color: #000;"> - Only if s/he clears the admission test!!</span>
        </p>

        <p style="margin: 10px 0;">
          <span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 4px 10px; font-size: 13.5px; display: inline-block; border-radius: 4px;">NEED TO JUSTIFY GAP WITH PROPER CERTIFICATES</span>
        </p>

        <p style="font-weight: bold; font-size: 13.5px; color: #000; margin: 12px 0; line-height: 1.5;">
          Before starting the process for ${intake || 'Sept 2027'} - we will evaluate the profile again as per updated requirements and then finalize the options!!
        </p>

        <p style="color: #0000FF; font-weight: bold; font-size: 13.5px; margin: 12px 0; line-height: 1.5;">
          I have added overall possible course options based on 12th subjects & preferences, that are available in Italian public universities with 100% Scholarship.
        </p>

        <p style="font-weight: bold; font-size: 13.5px; color: #000; margin: 12px 0; line-height: 1.5;">
          We will share the information regarding updates (If Any). Also, throughout the process, if we find any more options, we will update the same to you.
        </p>

        <p style="margin: 12px 0;">
          <span style="background-color: #fde8d7; padding: 4px 10px; font-weight: bold; font-size: 13px; color: #000; display: inline-block; border-radius: 4px; line-height: 1.4;">
            Note: It is essential to book an exam prior to the application submission. The score card will be required when submitting the applications.
          </span>
        </p>

        <div style="margin-top: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; border: 1px solid #ccc;">
            <thead>
              <tr style="background-color: #FCE4D6; color: #111;">
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">S.No</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: left;">University Name</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Duration</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: left;">Program Name</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Percentage</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Lang. Req.</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Other Req.</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Admission Test/Interview</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Application Fees</th>
                <th style="border: 1px solid #ccc; padding: 6px 8px; font-size: 12.5px; font-weight: bold; text-align: center;">Tentative Months (Only Opening)</th>
              </tr>
            </thead>
            <tbody>
              ${coursesHtml || '<tr><td colspan="10" style="padding: 12px; text-align: center; color: #777; font-style: italic;">No courses added yet. Use the dropdown menu in the left panel to add university course options.</td></tr>'}
            </tbody>
          </table>
        </div>

        <p style="margin-top: 20px; font-size: 13.5px; color: #333;">Best regards,<br><b style="color: #000;">Presume Overseas Admission Team</b></p>
      </div>
    `;
  };

  const handleCreateDraft = () => {
    setIsTemplateMode(true);
    let initialCourses = selectedCourses.length > 0 ? selectedCourses : allCourses.slice(0, 3);
    setSelectedCourses(initialCourses);
    
    let sName = studentName;
    if ((!sName || sName === 'Student') && to) {
      const match = to.match(/^([^<]+)/);
      if (match) sName = match[1].trim().replace(/"/g, '');
    }
    setStudentName(sName || 'Student');

    if (!subject || subject === 'No Subject') {
      setSubject(`Re: Course Recommendation & Admission Options (${sName || 'Applicant'})`);
    }
    
    const generatedHtml = generateLiveTemplate(sName || 'Student', programOfInterest, intakePitched, initialCourses);
    setHtmlBody(generatedHtml);
    currentHtmlRef.current = generatedHtml;
    if (editableRef.current) editableRef.current.innerHTML = generatedHtml;
  };

  const handleAddCourse = (courseId) => {
    if (!courseId) return;
    const courseToAdd = allCourses.find(c => String(c.id || c.universityName) === String(courseId));
    if (courseToAdd && !selectedCourses.some(sc => String(sc.id || sc.universityName) === String(courseId))) {
      const newCourses = [...selectedCourses, courseToAdd];
      setSelectedCourses(newCourses);
      const generated = generateLiveTemplate(studentName, programOfInterest, intakePitched, newCourses);
      setHtmlBody(generated);
      currentHtmlRef.current = generated;
      if (editableRef.current) editableRef.current.innerHTML = generated;
    }
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editableRef.current) {
      editableRef.current.focus();
      currentHtmlRef.current = editableRef.current.innerHTML;
    }
  };

  const handleRemoveCourse = (courseId) => {
    if (!courseId) return;
    const newCourses = selectedCourses.filter(sc => String(sc.id || sc.universityName) !== String(courseId));
    setSelectedCourses(newCourses);
    const generated = generateLiveTemplate(studentName, programOfInterest, intakePitched, newCourses);
    setHtmlBody(generated);
    currentHtmlRef.current = generated;
    if (editableRef.current) editableRef.current.innerHTML = generated;
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const finalHtml = editableRef.current ? editableRef.current.innerHTML : (currentHtmlRef.current || htmlBody);
      const payload = {
        to,
        subject,
        htmlBody: finalHtml || `<p>${body.replace(/\n/g, '<br/>')}</p>`,
        threadId,
        messageId,
        references
      };
      const res = await fetch(`/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSendSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md -z-10 cursor-pointer"
          />
          {/* Substantially increased popup dimensions & Side-by-Side 2-Column layout */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-[1450px] max-w-[99vw] h-[97vh] max-h-[1150px] dark:bg-[#0d0d0d] bg-white border dark:border-neutral-800 border-gray-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative z-10"
          >
            {/* Top Bar Header */}
            <div className="h-14 border-b dark:border-white/[0.08] border-gray-200 flex items-center justify-between px-7 dark:bg-[#151515] bg-gray-50/90 shrink-0">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-extrabold dark:text-neutral-200 text-slate-800 tracking-wide uppercase flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse shadow-sm"></span>
                  <span>{htmlBody ? "AI Draft & Course Template Editor" : "New Message"}</span>
                </span>
                {!isTemplateMode && (
                  <button 
                    type="button"
                    onClick={handleCreateDraft}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-extrabold shadow-lg hover:opacity-95 transition-all transform active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>✨ Create Draft (Auto-Analyzed Template)</span>
                  </button>
                )}
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center dark:text-neutral-400 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer" title="Close modal">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            {/* Main Workspace (2-Column Side-by-Side Layout when in Template Mode!) */}
            <div className="flex-1 flex flex-row overflow-hidden min-h-0">
              
              {/* LEFT COLUMN: Template & Course Management Panel */}
              {isTemplateMode && (
                <div className="w-[420px] shrink-0 border-r dark:border-white/[0.08] border-gray-200 dark:bg-[#111111] bg-indigo-50/30 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                  <div className="border-b dark:border-white/10 border-indigo-200/60 pb-3.5">
                    <h3 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase flex items-center gap-2 mb-1.5">
                      <span className="text-base">🎯</span>
                      <span>Course Template Management</span>
                    </h3>
                    <p className="text-[11px] dark:text-neutral-400 text-slate-500 leading-relaxed font-medium">
                      Modify profile fields or select options from dropmenus below to instantly update the live draft preview on the right.
                    </p>
                  </div>

                  {/* Student Details Section */}
                  <div className="flex flex-col gap-3.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider dark:text-neutral-300 text-slate-700 border-l-2 border-indigo-500 pl-2">
                      1. Learner Profile Details
                    </span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase dark:text-neutral-400 text-slate-500">Learner Name</label>
                      <input 
                        type="text" 
                        value={studentName} 
                        onChange={(e) => {
                          setStudentName(e.target.value);
                          const generated = generateLiveTemplate(e.target.value, programOfInterest, intakePitched, selectedCourses);
                          setHtmlBody(generated);
                          currentHtmlRef.current = generated;
                          if (editableRef.current) editableRef.current.innerHTML = generated;
                        }}
                        className="px-3.5 py-2.5 rounded-xl text-xs dark:bg-black/60 bg-white border dark:border-white/15 border-gray-300 dark:text-white text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase dark:text-neutral-400 text-slate-500">Program of Interest</label>
                      <input 
                        type="text" 
                        value={programOfInterest} 
                        onChange={(e) => {
                          setProgramOfInterest(e.target.value);
                          const generated = generateLiveTemplate(studentName, e.target.value, intakePitched, selectedCourses);
                          setHtmlBody(generated);
                          currentHtmlRef.current = generated;
                          if (editableRef.current) editableRef.current.innerHTML = generated;
                        }}
                        className="px-3.5 py-2.5 rounded-xl text-xs dark:bg-black/60 bg-white border dark:border-white/15 border-gray-300 dark:text-white text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase dark:text-neutral-400 text-slate-500">Intake Pitched</label>
                      <input 
                        type="text" 
                        value={intakePitched} 
                        onChange={(e) => {
                          setIntakePitched(e.target.value);
                          const generated = generateLiveTemplate(studentName, programOfInterest, e.target.value, selectedCourses);
                          setHtmlBody(generated);
                          currentHtmlRef.current = generated;
                          if (editableRef.current) editableRef.current.innerHTML = generated;
                        }}
                        className="px-3.5 py-2.5 rounded-xl text-xs dark:bg-black/60 bg-white border dark:border-white/15 border-gray-300 dark:text-white text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Course Options Dropmenu Section */}
                  <div className="flex flex-col gap-4 pt-4 border-t dark:border-white/10 border-indigo-200/60">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider dark:text-neutral-300 text-slate-700 border-l-2 border-emerald-500 pl-2">
                      2. Course Option Dropmenus
                    </span>

                    {/* ADD DROPMENU */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span>➕ Add Course Option Dropmenu</span>
                      </label>
                      <select
                        onChange={(e) => {
                          handleAddCourse(e.target.value);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="w-full px-3.5 py-3 rounded-xl text-xs dark:bg-[#1c1c1c] bg-white border-2 border-emerald-500/35 hover:border-emerald-500 dark:text-emerald-300 text-emerald-800 font-extrabold outline-none cursor-pointer transition-all shadow-sm truncate"
                      >
                        <option value="" disabled>-- Select Course Option to Add --</option>
                        {allCourses.filter(c => !selectedCourses.some(sc => String(sc.id || sc.universityName) === String(c.id || c.universityName))).map((course, idx) => (
                          <option key={idx} value={course.id || course.universityName} className="dark:bg-[#1a1a1a] bg-white text-xs font-semibold py-1">
                            {course.universityName} ({course.programName || course.subField})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* REMOVE DROPMENU */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span>➖ Remove Course Option Dropmenu</span>
                      </label>
                      <select
                        onChange={(e) => {
                          handleRemoveCourse(e.target.value);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="w-full px-3.5 py-3 rounded-xl text-xs dark:bg-[#1c1c1c] bg-white border-2 border-rose-500/35 hover:border-rose-500 dark:text-rose-300 text-rose-800 font-extrabold outline-none cursor-pointer transition-all shadow-sm truncate"
                      >
                        <option value="" disabled>-- Select Course Option to Remove --</option>
                        {selectedCourses.map((course, idx) => (
                          <option key={idx} value={course.id || course.universityName} className="dark:bg-[#1a1a1a] bg-white text-xs font-semibold py-1">
                            {course.universityName} ({course.programName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active Course Cards / Chips */}
                  <div className="flex flex-col gap-2.5 pt-2 border-t dark:border-white/5 border-indigo-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase dark:text-neutral-400 text-slate-500">
                        Active Course Options ({selectedCourses.length})
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedCourses.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl text-xs font-semibold dark:bg-[#1a1a1a] bg-white border dark:border-white/10 border-gray-200 shadow-xs hover:border-indigo-500/50 transition-colors">
                          <div className="flex flex-col min-w-0 pr-3">
                            <span className="font-bold dark:text-white text-slate-900 truncate flex items-center gap-1.5">
                              <span className="text-sm">🏫</span>
                              <span>{c.universityName}</span>
                            </span>
                            <span className="text-[11px] dark:text-indigo-400 text-indigo-600 truncate font-medium pl-6">{c.programName}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleRemoveCourse(c.id || c.universityName)}
                            className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all shrink-0 font-extrabold text-xs cursor-pointer shadow-2xs"
                            title="Remove from template"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {selectedCourses.length === 0 && (
                        <div className="p-5 text-center border-2 border-dashed dark:border-white/10 border-gray-300 rounded-xl text-xs dark:text-neutral-500 text-slate-400 italic">
                          No course options added yet. Select options above to add to table!
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* RIGHT COLUMN: Email Headers & Full Live Draft Preview */}
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden px-7 py-4 bg-transparent">
                
                {/* Email Header Fields (To & Subject) - Compacted for maximum vertical preview area */}
                <div className="flex flex-col gap-2 pb-3.5 border-b dark:border-white/10 border-gray-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-extrabold uppercase w-16 dark:text-neutral-400 text-slate-500 tracking-wider">To</span>
                    <input 
                      type="text" 
                      placeholder="Recipient Email Address" 
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      className="flex-1 bg-transparent border dark:border-white/15 border-gray-300 rounded-xl px-3.5 py-1.5 text-xs dark:text-white text-slate-900 dark:placeholder-neutral-600 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors font-semibold shadow-2xs" 
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-extrabold uppercase w-16 dark:text-neutral-400 text-slate-500 tracking-wider">Subject</span>
                    <input 
                      type="text" 
                      placeholder="Subject Line" 
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="flex-1 bg-transparent border dark:border-white/15 border-gray-300 rounded-xl px-3.5 py-1.5 text-xs font-bold dark:text-white text-slate-900 dark:placeholder-neutral-600 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors shadow-2xs" 
                    />
                  </div>
                </div>

                {/* Live Preview & Direct Editor Area */}
                <div className="flex-1 flex flex-col pt-3 overflow-hidden min-h-0">
                  {htmlBody ? (
                    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 shrink-0 border-b border-gray-200 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
                            ✏️ DRAFT EDITOR
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold uppercase tracking-wide">Live Mode</span>
                        </div>

                        {/* Rich Text Editor Toolbar */}
                        <div className="flex items-center space-x-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg px-2.5 py-1 border dark:border-white/10 border-gray-200 shadow-sm relative z-30">
                          <button onClick={() => handleFormat('bold')} className="w-6 h-6 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Bold">B</button>
                          <button onClick={() => handleFormat('italic')} className="w-6 h-6 flex items-center justify-center font-bold italic text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Italic">I</button>
                          <button onClick={() => handleFormat('underline')} className="w-6 h-6 flex items-center justify-center font-bold underline text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Underline">U</button>
                          
                          <div className="w-[1px] h-4 bg-gray-300 dark:bg-neutral-700 mx-1"></div>
                          
                          <select onChange={(e) => handleFormat('fontSize', e.target.value)} defaultValue="3" className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer px-1 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-neutral-700" title="Font Size">
                            <option value="1" className="text-black dark:text-white">Tiny</option>
                            <option value="2" className="text-black dark:text-white">Small</option>
                            <option value="3" className="text-black dark:text-white">Normal</option>
                            <option value="4" className="text-black dark:text-white">Large</option>
                            <option value="5" className="text-black dark:text-white">Huge</option>
                          </select>

                          <div className="w-[1px] h-4 bg-gray-300 dark:bg-neutral-700 mx-1"></div>

                          <button onClick={() => handleFormat('justifyLeft')} className="w-6 h-6 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Align Left">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h10M4 18h16" /></svg>
                          </button>
                          <button onClick={() => handleFormat('justifyCenter')} className="w-6 h-6 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Align Center">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M7 12h10M4 18h16" /></svg>
                          </button>
                          <button onClick={() => handleFormat('justifyRight')} className="w-6 h-6 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Align Right">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M10 12h10M4 18h16" /></svg>
                          </button>
                          
                          <div className="w-[1px] h-4 bg-gray-300 dark:bg-neutral-700 mx-1"></div>
                          
                          {/* Text Color Button & Dropdown */}
                          <div className="relative flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => { setShowTextColorPicker(!showTextColorPicker); setShowBgColorPicker(false); }} 
                              className={`flex items-center justify-center gap-1 w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 cursor-pointer ${showTextColorPicker ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : ''}`} 
                              title="Text Color"
                            >
                              <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">A</span>
                            </button>

                            {showTextColorPicker && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 p-2.5 rounded-xl shadow-2xl z-50 flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Text Color</div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {PRESET_COLORS.map(c => (
                                    <button 
                                      key={c.name} 
                                      onMouseDown={(e) => { e.preventDefault(); handleFormat('foreColor', c.value); setShowTextColorPicker(false); }} 
                                      className="w-6 h-6 rounded border border-gray-300 dark:border-neutral-600 hover:scale-110 transition-transform cursor-pointer relative overflow-hidden" 
                                      style={{ backgroundColor: c.value === 'transparent' ? '#f1f5f9' : c.value }} 
                                      title={c.name}
                                    >
                                      {c.value === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-[10px] leading-none">/</div>}
                                    </button>
                                  ))}
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Custom Color</span>
                                  <input 
                                    type="color" 
                                    onChange={(e) => { handleFormat('foreColor', e.target.value); setShowTextColorPicker(false); }} 
                                    className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer rounded overflow-hidden" 
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Highlight Color Button & Dropdown */}
                          <div className="relative flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowTextColorPicker(false); }} 
                              className={`flex items-center justify-center gap-1 w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 cursor-pointer ${showBgColorPicker ? 'bg-yellow-100 dark:bg-yellow-900/50' : ''}`} 
                              title="Highlight Color"
                            >
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded leading-tight">bg</span>
                            </button>

                            {showBgColorPicker && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 p-2.5 rounded-xl shadow-2xl z-50 flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highlight Color</div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {PRESET_COLORS.map(c => (
                                    <button 
                                      key={c.name} 
                                      onMouseDown={(e) => { e.preventDefault(); handleFormat('hiliteColor', c.value); setShowBgColorPicker(false); }} 
                                      className="w-6 h-6 rounded border border-gray-300 dark:border-neutral-600 hover:scale-110 transition-transform cursor-pointer relative overflow-hidden" 
                                      style={{ backgroundColor: c.value === 'transparent' ? '#f1f5f9' : c.value }} 
                                      title={c.name}
                                    >
                                      {c.value === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-[10px] leading-none">/</div>}
                                    </button>
                                  ))}
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Custom Highlight</span>
                                  <input 
                                    type="color" 
                                    onChange={(e) => { handleFormat('hiliteColor', e.target.value); setShowBgColorPicker(false); }} 
                                    className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer rounded overflow-hidden" 
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="w-[1px] h-4 bg-gray-300 dark:bg-neutral-700 mx-1"></div>
                          
                          <button onClick={() => handleFormat('removeFormat')} className="w-6 h-6 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded cursor-pointer transition-colors" title="Clear Formatting">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                          </button>
                        </div>

                        {/* Zoom controls */}
                        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg px-2 py-0.5 border dark:border-white/10 border-gray-200 shadow-sm">
                          <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="text-base hover:text-indigo-500 w-5 h-5 flex items-center justify-center cursor-pointer font-black" title="Zoom Out">-</button>
                          <span className="text-[10px] font-bold w-9 text-center text-slate-700 dark:text-slate-300">{Math.round(zoomLevel * 100)}%</span>
                          <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} className="text-base hover:text-indigo-500 w-5 h-5 flex items-center justify-center cursor-pointer font-black" title="Zoom In">+</button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto overflow-x-auto shadow-inner custom-scrollbar bg-white dark:bg-[#161616] rounded-2xl border-2 dark:border-neutral-700/70 border-gray-300">
                        <div 
                          ref={editableRef}
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          className="w-full min-h-full p-8 sm:p-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base leading-relaxed font-sans selection:bg-indigo-500/30 text-slate-900 dark:text-neutral-100"
                          style={{ zoom: zoomLevel }}
                          onInput={(e) => {
                            currentHtmlRef.current = e.target.innerHTML;
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <textarea 
                      placeholder="Write your email message here..." 
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      className="w-full h-full bg-transparent text-sm dark:text-neutral-200 text-slate-700 dark:placeholder-neutral-600 placeholder-slate-400 outline-none resize-none leading-relaxed p-2 font-sans overflow-y-auto custom-scrollbar"
                    ></textarea>
                  )}
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t dark:border-white/[0.08] border-gray-200 flex justify-between items-center dark:bg-[#151515] bg-gray-50 shrink-0">
              <div className="flex items-center space-x-3 dark:text-neutral-400 text-slate-500">
                <span className="text-xs font-semibold dark:text-neutral-300 text-slate-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                  <span>Ready to send with automated thread tracking & status labeling</span>
                </span>
              </div>
              <button 
                onClick={handleSend}
                disabled={isSending || sendSuccess}
                className={`px-12 py-3 text-sm font-extrabold rounded-xl shadow-xl transition-all flex items-center justify-center cursor-pointer ${sendSuccess ? 'bg-emerald-600 text-white shadow-emerald-600/30' : isSending ? 'bg-indigo-950 text-indigo-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white active:scale-95 shadow-indigo-600/30'}`}
              >
                {sendSuccess ? "✓ Sent & Tagged Successfully!" : isSending ? "Sending Reply..." : "Confirm & Send Reply"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
