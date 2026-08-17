import React, { useState, useRef, useEffect } from 'react';

export default function TrainingChatbot({ config, onRefreshConfig }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hey there! 👋 I'm your AI Training Assistant. I'm synchronized with your CRM rules and Italian university catalog.\n\nYou can chat with me naturally to review admissions parameters, test how I parse student inquiry emails, or check course recommendations. Feel free to click an instant test sample on the left or just tell me what you'd like to work on today!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedTurnId, setSavedTurnId] = useState(null);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [chatZoom, setChatZoom] = useState(1);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 48), 200)}px`;
    }
  }, [input]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages.slice(1).map(m => ({ role: m.role, text: m.text }))
        })
      });
      const data = await response.json();
      
      const assistantMessage = {
        role: 'assistant',
        text: data.reply || 'I have processed your query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        parentInput: userMessage.text
      };

      setMessages([...newHistory, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([...newHistory, {
        role: 'assistant',
        text: "⚠️ **Connection Error**: Unable to reach backend server. Please verify the server is running on port 5000.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSample = (sampleText) => {
    setInput(sampleText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: `### 🤖 Conversation Reset\nChat history cleared. I am ready for new test inquiries and training evaluations!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSaveAsExample = async (msgIndex) => {
    const targetMsg = messages[msgIndex];
    if (!targetMsg || !targetMsg.parentInput) return;

    let outputContent = targetMsg.text;
    const jsonMatch = targetMsg.text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        outputContent = JSON.parse(jsonMatch[1]);
      } catch(e) {}
    }

    try {
      const res = await fetch(`/api/ai/save-example`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: targetMsg.parentInput,
          output: outputContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedTurnId(msgIndex);
        if (onRefreshConfig) onRefreshConfig(data.aiConfig);
        setTimeout(() => setSavedTurnId(null), 4000);
      }
    } catch (err) {
      console.error("Failed to save example:", err);
    }
  };

  const handleZoomIn = () => setChatZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))));
  const handleZoomOut = () => setChatZoom(prev => Math.max(0.7, Number((prev - 0.1).toFixed(1))));
  const handleResetZoom = () => setChatZoom(1);

  const sampleTiles = [
    {
      title: "PCB Bio Student Inquiry",
      badge: "Extraction Test",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      desc: "Class 12th PCB student with 91% asking for biotechnology options in Italy.",
      text: "Learner Name: Sneha Patel\nAge: 19\nClass 12th - Stream: PCB\nClass 12th Score: 91%\nProgram of Interest: Biotechnology\nIntake Pitched: Sept 2027\nEligibility Country: Italy\nPlease check my eligibility and course options!"
    },
    {
      title: "Economics & Management Profile",
      badge: "Category Match",
      badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      desc: "Student interested in Economics and Business management for September 2027.",
      text: "Hi, I am Abhinav from Delhi. I scored 85% in Class 12th PCM in 2025. I am very interested in Economics and Business management courses in Italian universities for September 2027. Can you evaluate me?"
    },
    {
      title: "Query Italy Bio Rules",
      badge: "Logic Probe",
      badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      desc: "Ask Gemini to recommend Italian courses based on active inclusion rules.",
      text: "According to our active inclusion rules, what Italian courses should we recommend for a PCB student with 91% score wanting biotechnology or life sciences?"
    },
    {
      title: "Test Exclusion Filter Logic",
      badge: "Blocklist Check",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      desc: "Verify if University of Venice is properly excluded per system instructions.",
      text: "Can we suggest University of Venice for a student who wants Data Science in Italy? Explain in detail based on our exclusion filters."
    }
  ];

  const fewShotCount = (config && config.fewShotExamples) ? config.fewShotExamples.length : 0;

  return (
    <div className="w-full h-full max-w-[1750px] mx-auto p-6 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
      
      {/* ==========================================
          LEFT SIDE PANEL: OPTIONS, SAMPLES & MEMORY
          ========================================== */}
      <div className="w-full lg:w-[370px] shrink-0 flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
        
        {/* Unified Studio & Memory Control Card */}
        <div className="p-5 rounded-2xl dark:bg-[#131317] bg-white border dark:border-white/10 border-gray-200 shadow-lg shrink-0 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              ✦
            </div>
            <div>
              <h3 className="text-base font-extrabold dark:text-white text-slate-900 leading-tight">
                AI Training Console
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">gemini-2.5-flash</span>
              </div>
            </div>
          </div>

          <p className="text-xs dark:text-neutral-400 text-slate-600 leading-relaxed font-medium">
            Test inquiry parameter extraction, evaluate course matching logic, and cement ground-truth behaviors into your system prompt.
          </p>

          <div className="pt-3 border-t dark:border-white/10 border-gray-100 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold dark:text-neutral-300 text-slate-700 flex items-center gap-2">
                <span>📚 Few-Shot Memory Pool</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {fewShotCount} Recorded
              </span>
            </div>

            <button
              onClick={() => setShowExamplesModal(true)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Manage Memory Pool ({fewShotCount})</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Instant Test Sample Tiles Section */}
        <div className="flex flex-col space-y-3 shrink-0">
          <div className="px-1 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider dark:text-neutral-400 text-slate-500 flex items-center gap-1.5">
              <span>⚡</span> <span>Instant Test Feeds</span>
            </h4>
            <span className="text-[11px] font-semibold dark:text-neutral-500 text-slate-400">Click to load</span>
          </div>

          <div className="space-y-2.5">
            {sampleTiles.map((tile, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickSample(tile.text)}
                className="w-full p-4 rounded-2xl dark:bg-[#131317] bg-white hover:dark:bg-[#191921] hover:bg-indigo-50/50 border dark:border-white/10 border-gray-200 hover:border-indigo-500/40 transition-all text-left group shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] shrink-0 block"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-black dark:text-slate-200 text-slate-800 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {tile.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border shrink-0 ${tile.badgeColor}`}>
                    {tile.badge}
                  </span>
                </div>
                <p className="text-xs dark:text-neutral-400 text-slate-500 leading-relaxed font-normal">
                  {tile.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ==========================================
          RIGHT SIDE PANEL: DEDICATED CHAT WORKSPACE
          ========================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 rounded-3xl dark:bg-[#0d0d10] bg-white border dark:border-white/15 border-gray-200 shadow-2xl overflow-hidden relative">
        
        {/* Chat Workspace Header Bar with Zoom and Clear Controls */}
        <div className="px-6 py-3.5 dark:bg-[#121216]/90 bg-slate-50 border-b dark:border-white/10 border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse"></span>
            <span className="text-sm font-black dark:text-white text-slate-900">
              Live AI Reasoning Session
            </span>
            <span className="hidden md:inline-block text-[11px] font-semibold dark:text-neutral-400 text-slate-500 border-l dark:border-white/10 border-gray-300 pl-3">
              Multi-Turn Evaluation & Memory Capture
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom In & Out Controls for Text Canvas */}
            <div className="flex items-center rounded-xl dark:bg-white/5 bg-gray-200 p-0.5 border dark:border-white/10 border-gray-300">
              <button 
                onClick={handleZoomOut} 
                title="Zoom Out" 
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:dark:bg-white/10 hover:bg-gray-300 dark:text-neutral-300 text-slate-700 font-extrabold text-sm transition-all cursor-pointer active:scale-90"
              >
                —
              </button>
              <button 
                onClick={handleResetZoom} 
                title="Reset Zoom (100%)" 
                className="px-2 h-7 flex items-center justify-center text-[10px] font-black dark:text-indigo-400 text-indigo-700 hover:opacity-80 transition-all cursor-pointer select-none"
              >
                {Math.round(chatZoom * 100)}%
              </button>
              <button 
                onClick={handleZoomIn} 
                title="Zoom In" 
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:dark:bg-white/10 hover:bg-gray-300 dark:text-neutral-300 text-slate-700 font-extrabold text-sm transition-all cursor-pointer active:scale-90"
              >
                +
              </button>
            </div>

            <button
              onClick={handleClearChat}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold dark:bg-white/5 bg-gray-200 hover:dark:bg-rose-500/20 hover:bg-rose-100 dark:text-neutral-400 text-slate-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ml-1"
              title="Reset conversation history"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Main Conversation Scroll Box (with Zooming and Horizontal Scrollbar capabilities) */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-6 space-y-5 min-h-0 transition-all font-sans"
          style={{ zoom: chatZoom }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end ml-auto max-w-[75%]' : 'items-start mr-auto max-w-[85%] sm:max-w-[80%]'} group`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-bold dark:text-neutral-300 text-slate-700 flex items-center gap-1.5">
                  {msg.role === 'user' ? (
                    <><span>You</span></>
                  ) : (
                    <><span className="text-indigo-500 font-black">✨ AI Assistant</span></>
                  )}
                </span>
                <span className="text-[10px] font-medium dark:text-neutral-500 text-slate-400">{msg.timestamp}</span>
              </div>

              {/* Compact Message Bubble with Horizontal Scrollbar for wide code/text */}
              <div className={`w-fit max-w-full overflow-x-auto custom-scrollbar px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap font-sans transition-all ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs font-medium shadow-md shadow-indigo-500/15'
                  : 'dark:bg-[#1a1a22]/90 bg-white dark:text-neutral-200 text-slate-800 border dark:border-white/[0.08] border-gray-200/80 rounded-bl-xs font-normal shadow-sm'
              }`}>
                {msg.text}
              </div>

              {/* Save as Training Example Action for Assistant Turns when output has meaningful extraction or structure */}
              {msg.role === 'assistant' && msg.parentInput && (msg.text.includes('{') || msg.text.includes('```') || msg.text.length > 150) && (
                <div className="mt-2 pl-1 flex items-center gap-3">
                  <button
                    onClick={() => handleSaveAsExample(index)}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold dark:bg-white/5 bg-indigo-50/80 hover:dark:bg-emerald-500/20 hover:bg-emerald-100 dark:text-emerald-400 text-emerald-700 border dark:border-white/10 border-emerald-300 transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer opacity-85 hover:opacity-100 group-hover:border-emerald-500/40"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    <span>Save as Training Example</span>
                  </button>

                  {savedTurnId === index && (
                    <span className="text-[11px] font-extrabold text-emerald-500 animate-pulse flex items-center gap-1">
                      <span>✓ Saved to memory pool!</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 px-5 py-3.5 max-w-xs rounded-2xl dark:bg-[#1a1a22]/90 bg-white border dark:border-white/[0.08] border-slate-200 rounded-bl-xs shadow-sm animate-pulse">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                AI is thinking...
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Input Textbar */}
        <form onSubmit={handleSendMessage} className="p-4 dark:bg-[#131317] bg-gray-100/80 border-t dark:border-white/10 border-gray-200 flex items-end gap-3 shrink-0">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type instructions, test raw student inquiry email, or query rules... (Press Enter to send, Shift+Enter for line break)"
              className="w-full pl-5 pr-12 py-3 min-h-[48px] max-h-[200px] rounded-2xl dark:bg-[#1b1b22] bg-white dark:text-white text-slate-900 border dark:border-white/15 border-gray-300 focus:outline-none focus:border-indigo-500 text-sm font-medium shadow-inner resize-none custom-scrollbar placeholder:text-neutral-500 leading-relaxed transition-all overflow-y-auto"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-12 px-7 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/30 hover:opacity-95 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
          >
            <span>Send Message</span>
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </form>

      </div>

      {/* ==========================================
          MODAL: SAVED FEW-SHOT EXAMPLES POOL
          ========================================== */}
      {showExamplesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl max-h-[88vh] rounded-3xl dark:bg-[#141418] bg-white border dark:border-white/15 border-gray-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b dark:border-white/10 border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <div>
                <h3 className="text-xl font-black dark:text-white text-slate-900 flex items-center gap-2.5">
                  <span>📚 Active Few-Shot Training Memory Pool</span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {fewShotCount} Recorded Examples
                  </span>
                </h3>
                <p className="text-xs dark:text-neutral-400 text-slate-500 mt-1 font-medium">
                  These input/output pairs are dynamically injected into every Gemini API call to guarantee zero-defect structure and adherence to your rules.
                </p>
              </div>
              <button
                onClick={() => setShowExamplesModal(false)}
                className="w-9 h-9 rounded-full dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300 dark:text-white text-slate-800 font-extrabold transition-all flex items-center justify-center cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 min-h-0">
              {(config && config.fewShotExamples && config.fewShotExamples.length > 0) ? (
                config.fewShotExamples.map((ex, idx) => (
                  <div key={idx} className="p-6 rounded-3xl dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 space-y-4 shadow-sm hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center justify-between text-xs font-bold dark:text-neutral-400 text-slate-500">
                      <span className="text-indigo-400 font-extrabold text-sm flex items-center gap-1.5">
                        <span>🏷️</span> <span>Example #{idx + 1} ({ex.id || 'Recorded'})</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg dark:bg-white/5 bg-gray-200/60 text-[11px] font-semibold">{new Date(ex.timestamp || Date.now()).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-4 rounded-2xl dark:bg-[#1a1a20] bg-white border dark:border-white/10 border-gray-200 text-xs shadow-inner">
                        <p className="font-extrabold text-[11px] text-indigo-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 pb-2 border-b dark:border-white/5 border-gray-100">
                          <span>📨</span> <span>Input Student Inquiry</span>
                        </p>
                        <pre className="font-mono whitespace-pre-wrap dark:text-neutral-300 text-slate-700 leading-relaxed text-xs max-h-60 overflow-y-auto custom-scrollbar">{ex.input}</pre>
                      </div>
                      <div className="p-4 rounded-2xl dark:bg-[#1a1a20] bg-white border dark:border-white/10 border-gray-200 text-xs shadow-inner">
                        <p className="font-extrabold text-[11px] text-emerald-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 pb-2 border-b dark:border-white/5 border-gray-100">
                          <span>🎯</span> <span>Target JSON Output Structure</span>
                        </p>
                        <pre className="font-mono whitespace-pre-wrap dark:text-emerald-300 text-emerald-700 leading-relaxed text-xs max-h-60 overflow-y-auto custom-scrollbar">{ex.output}</pre>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 dark:text-neutral-500 text-slate-400 flex flex-col items-center justify-center">
                  <span className="text-5xl mb-4">📭</span>
                  <p className="font-extrabold text-lg text-slate-300">No training examples saved yet!</p>
                  <p className="text-xs mt-1 max-w-md text-neutral-400">Use the interactive chat studio on the right to test queries and record customized few-shot examples into your system prompt.</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t dark:border-white/10 border-gray-200 flex justify-end dark:bg-[#111115] bg-gray-50">
              <button
                onClick={() => setShowExamplesModal(false)}
                className="px-8 py-3 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
