"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { 
  Smile, ShieldAlert, BookOpen, Clock, Heart, LogOut, 
  MessageSquare, Compass, Send, CheckCircle2, Lock, Unlock, Plus,
  Sun, Moon
} from "lucide-react";

import BonoPet from "./components/BonoPet";
import GroundingWalk from "./components/GroundingWalk";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface User {
  name: string;
  email: string;
  target_exam: string;
}

export default function Home() {
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("light");

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [targetExam, setTargetExam] = useState("JEE");
  const [authError, setAuthError] = useState("");

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"chat" | "dump" | "worry" | "gratitude">("chat");
  const [bonoMood, setBonoMood] = useState<"HAPPY" | "CALM" | "LISTENING" | "SAD" | "ALERT">("HAPPY");
  const [showGrounding, setShowGrounding] = useState(false);

  // Chat Tab state
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string; created_at?: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [crisisHelplines, setCrisisHelplines] = useState<any[] | null>(null);

  // Brain Dump (Journal) Tab state
  const [dumpTitle, setDumpTitle] = useState("");
  const [dumpContent, setDumpContent] = useState("");
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);

  // Worry Box Tab state
  const [worryThought, setWorryThought] = useState("");
  const [worryHours, setWorryHours] = useState(2);
  const [worries, setWorries] = useState<any[]>([]);
  const [worryLoading, setWorryLoading] = useState(false);

  // Gratitude Tab state
  const [gratitudeText, setGratitudeText] = useState("");
  const [gratitudes, setGratitudes] = useState<any[]>([]);
  const [gratitudeLoading, setGratitudeLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check auth session on mount
  useEffect(() => {
    fetchMe();
  }, []);

  // Fetch me profile
  const fetchMe = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        fetchDashboardData();
      }
    } catch (e) {
      console.log("No active session.");
    }
  };

  // Fetch all user dashboard records
  const fetchDashboardData = () => {
    fetchChatHistory();
    fetchJournals();
    fetchWorries();
    fetchGratitudes();
  };

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Auth Submit Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const url = isLogin ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
    const body = isLogin 
      ? { email, password, name: "LoginUser", target_exam: "General" }
      : { email, password, name, target_exam: targetExam };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      if (isLogin) {
        setUser(data.user);
      } else {
        setUser(data);
      }
      
      // Fetch initial data
      fetchDashboardData();
      
      // Animate entry
      gsap.fromTo(containerRef.current, 
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
      );

    } catch (err: any) {
      setAuthError(err.message || "Connection refused by API server.");
    }
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    setChatHistory([]);
    setJournalEntries([]);
    setWorries([]);
    setGratitudes([]);
    setCrisisHelplines(null);
  };

  // --- API DATA FETCHERS ---

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/bono/history`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          setChatHistory([{ role: "bono", text: "Hey buddy! Welcome back to your safe space. Drop your books and let me know what is on your mind today! *wags tail*" }]);
        } else {
          setChatHistory(data);
        }
      }
    } catch (e) { console.error(e); }
  };

  const fetchJournals = async () => {
    try {
      const res = await fetch(`${API_BASE}/journal`, { credentials: "include" });
      if (res.ok) setJournalEntries(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchWorries = async () => {
    try {
      const res = await fetch(`${API_BASE}/workouts/worry`, { credentials: "include" });
      if (res.ok) setWorries(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchGratitudes = async () => {
    try {
      const res = await fetch(`${API_BASE}/workouts/gratitude`, { credentials: "include" });
      if (res.ok) setGratitudes(await res.json());
    } catch (e) { console.error(e); }
  };

  // --- WORKOUT SUBMISSIONS ---

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", text: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bono/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_text: userText }),
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [...prev, { role: "bono", text: data.response_text }]);
        setBonoMood(data.bono_mood);
        if (data.bono_mood === "ALERT" && data.helplines) {
          setCrisisHelplines(data.helplines);
        } else {
          setCrisisHelplines(null);
        }
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: "bono", text: "Woof! (I had a little trouble reaching my server brain. Make sure the backend is running!)" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dumpTitle.trim() || !dumpContent.trim()) return;

    setJournalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: dumpTitle, content: dumpContent }),
        credentials: "include"
      });

      if (res.ok) {
        setDumpTitle("");
        setDumpContent("");
        fetchJournals();
        setBonoMood("CALM");
      }
    } catch (e) { console.error(e); }
    finally { setJournalLoading(false); }
  };

  const handleLockWorry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worryThought.trim()) return;

    setWorryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workouts/worry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought: worryThought, lock_duration_hours: worryHours }),
        credentials: "include"
      });

      if (res.ok) {
        setWorryThought("");
        fetchWorries();
        setBonoMood("CALM");
      }
    } catch (e) { console.error(e); }
    finally { setWorryLoading(false); }
  };

  const handleAddGratitude = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gratitudeText.trim()) return;

    setGratitudeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workouts/gratitude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ win_text: gratitudeText }),
        credentials: "include"
      });

      if (res.ok) {
        setGratitudeText("");
        fetchGratitudes();
        setBonoMood("HAPPY");
      }
    } catch (e) { console.error(e); }
    finally { setGratitudeLoading(false); }
  };

  // --- RENDERING ---

  if (!user) {
    // Unauthenticated landing page
    return (
      <main className={`min-h-screen flex items-center justify-center bg-[var(--bg-color)] p-4 font-sans selection:bg-amber-500 selection:text-slate-900 transition-colors duration-300 ${theme === "light" ? "theme-light" : "theme-dark"}`}>
        <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-center relative">
          
          {/* Theme switcher on Login page */}
          <div className="absolute top-[-30px] right-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-3.5 rounded-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-color)] hover:text-amber-400 transition-colors flex items-center justify-center shadow-lg"
              title="Toggle theme (Light / Dark)"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Welcome Text Col */}
          <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/25 text-amber-500 text-xs font-bold rounded-full mb-6 uppercase tracking-wider">
              <Smile className="w-4 h-4" /> Recess Zero Pressure Zone
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black leading-tight tracking-tight text-[var(--title-color)] mb-6">
              Step away. Take a <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Recess.</span>
            </h1>
            <p className="text-[var(--text-color)] opacity-85 text-base md:text-lg max-w-md leading-relaxed mb-8">
              JEE ranks, mock scores, backlogs... it gets heavy, yaara. Come inside, pet Bono, dump your worries, and let your mind rest.
            </p>
            <BonoPet mood="HAPPY" />
          </div>

          {/* Form Col */}
          <div className="md:col-span-6 glass-card p-8 shadow-2xl relative">
            <h2 className="text-2xl font-display font-bold text-[var(--title-color)] mb-2">
              {isLogin ? "Welcome Back, Buddy!" : "Join the Safe Space"}
            </h2>
            <p className="text-sm text-[var(--text-color)] opacity-75 mb-6">
              {isLogin ? "Sign in to pet Bono and resume your check-ins." : "Create your student safe locker in 10 seconds."}
            </p>

            {authError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm flex gap-2 items-center">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{authError} (Is python backend running on port 8000?)</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-2">Your Name</label>
                    <input 
                      type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Kumar"
                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-2">Target Competitive Exam</label>
                    <select 
                      value={targetExam} onChange={(e) => setTargetExam(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none transition-colors"
                    >
                      <option value="JEE">JEE (Mains/Advanced)</option>
                      <option value="NEET">NEET (Medical)</option>
                      <option value="UPSC">UPSC Civil Services</option>
                      <option value="CAT/GATE">CAT / GATE / MBA</option>
                      <option value="Boards">Class 10/12 Board Exams</option>
                      <option value="General">Other / General Pressure</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-2">Email Address</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@student.com"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-2">Secret Key / Password</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none transition-colors"
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm"
              >
                {isLogin ? "Let's Go!" : "Create My Breakroom"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-[var(--text-muted)] hover:text-amber-500 underline transition-colors"
              >
                {isLogin ? "First time here? Register now" : "Already have a breakroom? Log in"}
              </button>
            </div>

          </div>
        </div>
      </main>
    );
  }

  // Authenticated Recess Dashboard
  return (
    <div ref={containerRef} className={`min-h-screen flex flex-col bg-[var(--bg-color)] text-[var(--text-color)] font-sans transition-colors duration-300 ${theme === "light" ? "theme-light" : "theme-dark"}`}>
      
      {/* Navigation Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--nav-bg)] backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <img 
            src="/bono_logo.jpg" 
            alt="Bono Logo" 
            className="w-10 h-10 rounded-2xl object-cover shadow-md border border-amber-450/30"
          />
          <div>
            <h1 className="text-lg font-display font-black tracking-tight text-[var(--title-color)]">RECESS</h1>
            <p className="text-2xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Zero Pressure Breakroom</p>
          </div>
        </div>

        {/* Student Tag / Theme Switcher / Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-full text-xs font-semibold text-[var(--text-color)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Target: {user.target_exam}</span>
          </div>
          
          {/* Theme switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-color)] hover:text-amber-500 transition-colors flex items-center justify-center shadow-sm"
            title="Toggle theme (Light / Dark)"
          >
            {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-rose-500 bg-[var(--input-bg)] hover:bg-rose-500/10 border border-[var(--input-border)] hover:border-rose-500/20 px-3.5 py-1.5 rounded-full transition-all"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Main Grid content */}
      <main className="flex-1 grid md:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        
        {/* Left Side: Bono the Virtual Pet */}
        <div className="md:col-span-4 flex flex-col items-center justify-between glass-card p-6 shadow-xl relative">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-500">Your Companion</span>
            <div className="px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-500 border border-amber-400/20 text-xs font-bold font-mono uppercase">
              Mood: {bonoMood}
            </div>
          </div>
          
          <BonoPet mood={bonoMood} />

          <div className="w-full mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => setShowGrounding(true)}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 animate-spin-slow" />
              1-Min Grounding Walk
            </button>
            <p className="text-2xs text-center text-[var(--text-muted)]">
              *Bono sits close to you, tail thumping, reminding you that exams are just a tiny part of your beautiful life.*
            </p>
          </div>
        </div>

        {/* Right Side: Mind Workouts Workspace */}
        <div className="md:col-span-8 flex flex-col glass-card shadow-xl overflow-hidden min-h-[500px]">
          
          {/* Workout Tabs */}
          <nav className="flex border-b border-[var(--input-border)] bg-[var(--input-bg)]/60" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "chat"}
              onClick={() => { setActiveTab("chat"); setBonoMood("LISTENING"); }}
              className={`flex-1 py-4 text-center font-display font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === "chat" 
                  ? "text-amber-500 border-amber-500 bg-[var(--bg-color)]/20" 
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--title-color)]"
              }`}
            >
              Bono Chat
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "dump"}
              onClick={() => { setActiveTab("dump"); setBonoMood("CALM"); }}
              className={`flex-1 py-4 text-center font-display font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === "dump" 
                  ? "text-amber-500 border-amber-500 bg-[var(--bg-color)]/20" 
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--title-color)]"
              }`}
            >
              Brain Dump
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "worry"}
              onClick={() => { setActiveTab("worry"); setBonoMood("CALM"); }}
              className={`flex-1 py-4 text-center font-display font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === "worry" 
                  ? "text-amber-500 border-amber-500 bg-[var(--bg-color)]/20" 
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--title-color)]"
              }`}
            >
              Worry Box
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "gratitude"}
              onClick={() => { setActiveTab("gratitude"); setBonoMood("HAPPY"); }}
              className={`flex-1 py-4 text-center font-display font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === "gratitude" 
                  ? "text-amber-500 border-amber-500 bg-[var(--bg-color)]/20" 
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--title-color)]"
              }`}
            >
              Gratitude Jar
            </button>
          </nav>

          {/* Workspace Body */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">

            {/* TAB 1: Chat With Bono */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-[400px] justify-between">
                
                {/* Crisis Alerts (Indian Helpline Integration) */}
                {crisisHelplines && (
                  <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl">
                    <div className="flex gap-2 items-center text-rose-500 mb-2">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                      <span className="font-bold text-sm">Please Reach Out for Support, Dost.</span>
                    </div>
                    <p className="text-xs text-[var(--text-color)] opacity-90 leading-relaxed mb-3">
                      I'm a puppy companion, and I want you to be safe. Please contact these free, official, confidential Indian counseling helplines immediately:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {crisisHelplines.map((h, i) => (
                        <div key={i} className="p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl">
                          <span className="block text-2xs uppercase font-bold tracking-wider text-[var(--text-muted)]">{h.name}</span>
                          <span className="block text-xs font-mono font-bold text-rose-500 mt-0.5">{h.number}</span>
                          <span className="block text-3xs text-[var(--text-muted)] mt-0.5">{h.details}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                  {chatHistory.map((msg, index) => (
                    <div 
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                        msg.role === "user" 
                          ? "bg-[var(--chat-bubble-user)] text-[var(--chat-bubble-user-text)] font-semibold rounded-tr-none" 
                          : "bg-[var(--chat-bubble-bono)] text-[var(--chat-bubble-bono-text)] rounded-tl-none border border-[var(--card-border)]"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--chat-bubble-bono)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-md animate-pulse">
                        Bono is typing... 🐾
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Form Input */}
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Talk to Bono (Hinglish works fine)... e.g. syllabus backlog se darr lag raha h"
                    className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] text-sm rounded-xl px-4 py-3.5 focus:border-amber-400 outline-none transition-colors placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    type="submit"
                    className="p-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl transition-all shadow-md flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>

              </div>
            )}

            {/* TAB 2: The Brain Dump (Encrypted Journals) */}
            {activeTab === "dump" && (
              <div className="space-y-6">
                
                {/* Journal Creator */}
                <form onSubmit={handleCreateJournal} className="space-y-4 bg-[var(--input-bg)]/40 p-4 border border-[var(--input-border)] rounded-2xl">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Dump Your Thoughts Here</h3>
                  <div>
                    <input 
                      type="text" required value={dumpTitle} onChange={(e) => setDumpTitle(e.target.value)}
                      placeholder="Title of this dump (e.g. Post-Mock test panic)"
                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] text-sm rounded-xl px-4 py-3 focus:border-amber-400 outline-none transition-colors placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div>
                    <textarea 
                      required value={dumpContent} onChange={(e) => setDumpContent(e.target.value)}
                      placeholder="Write raw. Mention syllabus backlogs, parents expectations, test stress, or whatever is cluttering your mind. We will encrypt this with AES-256 immediately so no one else can read it."
                      rows={4}
                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] text-sm rounded-xl p-4 focus:border-amber-400 outline-none transition-colors resize-none placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <button
                    type="submit" disabled={journalLoading}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Save Encrypted Dump
                  </button>
                </form>

                {/* Journal Archives */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Locked Archive (Decrypted live)</h3>
                  
                  {journalEntries.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-[var(--input-border)] rounded-2xl text-[var(--text-muted)] text-sm">
                      No mental dumps saved yet. Your locker is clean!
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {journalEntries.map((j) => (
                        <div key={j.id} className="p-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-2xl flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-sm text-[var(--title-color)]">{j.title}</span>
                              <span className="text-3xs uppercase px-2 py-0.5 rounded-full bg-[var(--bg-color)] border border-[var(--input-border)] text-[var(--text-color)]">
                                {j.sentiment_label}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-color)] opacity-80 leading-relaxed line-clamp-3 mb-3">
                              {j.content}
                            </p>
                          </div>
                          
                          {/* Metadata Indicators */}
                          <div className="pt-2 border-t border-[var(--input-border)] flex flex-wrap justify-between items-center gap-2">
                            <span className="text-3xs text-[var(--text-muted)] font-mono">
                              {new Date(j.created_at).toLocaleDateString()}
                            </span>
                            {j.cognitive_distortions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {j.cognitive_distortions.map((d: string, idx: number) => (
                                  <span key={idx} className="text-3xs px-2 py-0.5 bg-rose-550/10 border border-rose-500/20 text-rose-550 rounded-full font-semibold">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: The Worry Box (Locked anxiety items) */}
            {activeTab === "worry" && (
              <div className="space-y-6">
                
                {/* Lock Worry Form */}
                <form onSubmit={handleLockWorry} className="space-y-4 bg-[var(--input-bg)]/40 p-4 border border-[var(--input-border)] rounded-2xl">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Lock Intrusive Thoughts Away</h3>
                  <p className="text-xs text-[var(--text-color)] opacity-80 leading-relaxed">
                    Write down a worry (e.g. "What if I get a bad percentile in the next mock test?"). Choose how long to lock it away, so you can study without it sitting in your active thoughts.
                  </p>
                  <div>
                    <input 
                      type="text" required value={worryThought} onChange={(e) => setWorryThought(e.target.value)}
                      placeholder="e.g. Fail hone ka darr lag raha hai"
                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] text-sm rounded-xl px-4 py-3 focus:border-amber-400 outline-none transition-colors placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div className="flex gap-4 items-center">
                    <label className="text-xs text-[var(--text-color)]">Lock duration:</label>
                    <select
                      value={worryHours}
                      onChange={(e) => setWorryHours(parseInt(e.target.value))}
                      className="bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] text-xs rounded-lg px-3 py-1.5 outline-none"
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours (Std Study Block)</option>
                      <option value="4">4 Hours</option>
                      <option value="12">12 Hours</option>
                    </select>
                  </div>
                  <button
                    type="submit" disabled={worryLoading}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" /> Lock away worry
                  </button>
                </form>

                {/* Worries Archive */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Worry Box Drawer</h3>
                  
                  {worries.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-[var(--input-border)] rounded-2xl text-[var(--text-muted)] text-sm">
                      Your Worry Box is empty. No locked thoughts!
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {worries.map((w) => (
                        <div key={w.id} className={`p-4 border rounded-2xl flex flex-col justify-between shadow-sm transition-colors ${
                          w.is_locked 
                            ? "bg-[var(--input-bg)]/20 border-[var(--input-border)] text-[var(--text-muted)]" 
                            : "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--title-color)]"
                        }`}>
                          <div className="flex justify-between items-start mb-4 gap-2">
                            <span className="text-xs leading-relaxed italic">
                              {w.thought}
                            </span>
                            {w.is_locked ? (
                              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            ) : (
                              <Unlock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[var(--input-border)]">
                            <span className="text-3xs text-[var(--text-muted)] font-mono">
                              {new Date(w.created_at).toLocaleDateString()}
                            </span>
                            {w.is_locked && w.locked_until && (
                              <span className="text-3xs text-amber-500 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Locked until {new Date(w.locked_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {!w.is_locked && (
                              <span className="text-3xs text-emerald-500 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Unlocked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: Gratitude Jar (Non-exam daily wins) */}
            {activeTab === "gratitude" && (
              <div className="space-y-6">
                
                {/* Gratitude Creator */}
                <form onSubmit={handleAddGratitude} className="space-y-4 bg-[var(--input-bg)]/40 p-4 border border-[var(--input-border)] rounded-2xl">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Add to your Gratitude Jar</h3>
                  <p className="text-xs text-[var(--text-color)] opacity-80 leading-relaxed">
                    Write down one tiny win from today that has **nothing to do with your competitive exam scores**. E.g., "had a good cup of hot tea", "finally got 8 hours of sleep", "helped a classmate clear a chemistry doubt", or "saw a cute cat".
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" required value={gratitudeText} onChange={(e) => setGratitudeText(e.target.value)}
                      placeholder="e.g. Aaj subah cold coffee achhi bani thi"
                      className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--title-color)] text-sm rounded-xl px-4 py-3 focus:border-amber-400 outline-none transition-colors placeholder:text-[var(--text-muted)]"
                    />
                    <button
                      type="submit" disabled={gratitudeLoading}
                      className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Add Win 🐾
                    </button>
                  </div>
                </form>

                {/* Gratitude List */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">My Gratitude Jar Wins</h3>
                  
                  {gratitudes.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-[var(--input-border)] rounded-2xl text-[var(--text-muted)] text-sm">
                      Your Gratitude Jar is empty. Drop some happy thoughts in!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gratitudes.map((g) => (
                        <div key={g.id} className="flex gap-3 items-center p-3.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                            <Heart className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm text-[var(--title-color)] font-semibold">{g.win_text}</p>
                            <span className="text-3xs text-[var(--text-muted)] font-mono mt-0.5 block">
                              Saved on {new Date(g.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </main>

      {/* Grounding Exercise Overlay */}
      {showGrounding && (
        <GroundingWalk onClose={() => { setShowGrounding(false); setBonoMood("HAPPY"); }} />
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--card-border)] bg-[var(--bg-color)] py-4 text-center text-xs text-[var(--text-muted)] transition-colors duration-300">
        Recess Mental Wellness Platform • Crafted with care for competitive exam aspirants 🐾
      </footer>

    </div>
  );
}
