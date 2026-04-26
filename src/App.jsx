import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Zap, Shield, Sword, Clock, Brain, RotateCcw,
  ChevronRight, Star, Target, Activity, X, Play, Pause,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS & STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SYLLABUS = {
  Physics: [
    { name: "Rotational Dynamics",       diff: "H" },
    { name: "Kinetic Theory of Gases",    diff: "M" },
    { name: "Wave Optics",               diff: "H" },
    { name: "Dual Nature of Radiation",  diff: "M" },
    { name: "Structure of Atom",         diff: "E" },
    { name: "Semiconductors",            diff: "E" },
  ],
  Chemistry: [
    { name: "Solutions",                       diff: "H" },
    { name: "Electrochemistry",                diff: "H" },
    { name: "Halogen Derivatives",             diff: "E" },
    { name: "Alcohols, Phenols and Ethers",    diff: "M" },
    { name: "Ionic Equilibrium",               diff: "H" },
    { name: "Amines",                          diff: "M" },
    { name: "Transition Elements",             diff: "E" },
    { name: "Basic Concepts of Chemistry",     diff: "E" },
    { name: "Atomic Structure",                diff: "E" },
    { name: "Chemical Thermodynamics",         diff: "M" },
  ],
  Mathematics: [
    { name: "Pair of Lines",              diff: "M" },
    { name: "Line & Plane",              diff: "M" },
    { name: "Differentiation",           diff: "H" },
    { name: "Applications of Derivatives", diff: "H" },
    { name: "Differential Equations",    diff: "H" },
  ],
};

const XP_MAP    = { H: 500,  M: 300, E: 150 };
const TIME_MAP  = { H: 5,    M: 3,   E: 1.5 };
const LABEL_MAP = { H: "BOSS BATTLE", M: "ELITE ENEMY", E: "MINION" };

const DIFF_STYLE = {
  H: {
    border:   "#ff2d78",
    glow:     "0 0 24px #ff2d7888",
    dimGlow:  "0 0 10px #ff2d7833",
    badge:    "bg-rose-950 text-rose-300 border border-rose-800",
    icon:     <Sword size={12} />,
    timerRing:"#ff2d78",
  },
  M: {
    border:   "#f59e0b",
    glow:     "0 0 24px #f59e0b88",
    dimGlow:  "0 0 10px #f59e0b33",
    badge:    "bg-amber-950 text-amber-300 border border-amber-800",
    icon:     <Shield size={12} />,
    timerRing:"#f59e0b",
  },
  E: {
    border:   "#00ff9f",
    glow:     "0 0 24px #00ff9f88",
    dimGlow:  "0 0 10px #00ff9f33",
    badge:    "bg-emerald-950 text-emerald-300 border border-emerald-800",
    icon:     <Star size={12} />,
    timerRing:"#00ff9f",
  },
};

const RANKS = [
  { name: "Recruit",   min: 0 },
  { name: "Initiate",  min: 500 },
  { name: "Soldier",   min: 1200 },
  { name: "Veteran",   min: 2500 },
  { name: "Elite",     min: 4000 },
  { name: "Champion",  min: 6000 },
  { name: "Legend",    min: 8500 },
  { name: "God-Tier",  min: 12000 },
];

const POMODORO_WORK = 50 * 60; // 50 minutes in seconds
const POMODORO_REST = 10 * 60; // 10 minutes in seconds

// Neural-link revision intervals in milliseconds
const REVISION_INTERVALS_MS = [
  24  * 60 * 60 * 1000,  // 1 day
  72  * 60 * 60 * 1000,  // 3 days
  168 * 60 * 60 * 1000,  // 7 days
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getRankInfo(xp) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) {
      return { rank: RANKS[i], next: RANKS[i + 1] ?? null, idx: i };
    }
  }
  return { rank: RANKS[0], next: RANKS[1], idx: 0 };
}

/** Flatten the DEFAULT_SYLLABUS into a flat array of chapter objects. */
function buildDefaultChapters() {
  let id = 0;
  const chapters = [];
  for (const [subject, items] of Object.entries(DEFAULT_SYLLABUS)) {
    for (const item of items) {
      chapters.push({
        id,
        subject,
        name:        item.name,
        diff:        item.diff,
        completed:   false,
        completedAt: null,   // ISO string when annihilated
      });
      id++;
    }
  }
  return chapters;
}

/**
 * Scheduling algorithm: groups pending chapters into days using combos:
 *   A: 1H + 1E  (Boss + Minion)
 *   B: 2M       (two Elite Enemies)
 *   C: 3E       (three Minions)
 * Falls back to stuffing the remaining chapters into one day if combos exhaust.
 */
function buildSchedule(chapters) {
  const pending = chapters.filter((c) => !c.completed);
  const pool = { H: [...pending.filter((c) => c.diff === "H")],
                 M: [...pending.filter((c) => c.diff === "M")],
                 E: [...pending.filter((c) => c.diff === "E")] };
  const days = [];

  while (pool.H.length + pool.M.length + pool.E.length > 0) {
    // Combo A
    if (pool.H.length >= 1 && pool.E.length >= 1) {
      days.push([pool.H.shift(), pool.E.shift()]);
      continue;
    }
    // Combo B
    if (pool.M.length >= 2) {
      days.push([pool.M.shift(), pool.M.shift()]);
      continue;
    }
    // Combo C
    if (pool.E.length >= 3) {
      days.push([pool.E.shift(), pool.E.shift(), pool.E.shift()]);
      continue;
    }
    // Fallback — pack what's left into one final day
    const remaining = [...pool.H, ...pool.M, ...pool.E];
    pool.H = []; pool.M = []; pool.E = [];
    if (remaining.length > 0) days.push(remaining);
  }
  return days;
}

/** Spawn three revision nodes for a chapter with the spaced-repetition schedule. */
function buildRevisionNodes(chapter) {
  const now = Date.now();
  return REVISION_INTERVALS_MS.map((ms, i) => ({
    id:          `rev-${chapter.id}-${i}-${now}`,
    chapterId:   chapter.id,
    chapterName: chapter.name,
    subject:     chapter.subject,
    diff:        chapter.diff,
    round:       i + 1,
    dueAt:       now + ms,   // epoch ms
    done:        false,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useLocalStorage — generic hook that syncs React state to localStorage.
 * On mount it reads from localStorage; every setState call immediately
 * persists the new value via localStorage.setItem so data survives refreshes.
 */
function useLocalStorage(key, initialValue) {
  const [state, setStateRaw] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch { /* corrupt data — fall through */ }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  const setState = useCallback((valueOrUpdater) => {
    setStateRaw((prev) => {
      const next =
        typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.error("[useLocalStorage] write failed:", key, e);
      }
      return next;
    });
  }, [key]);

  return [state, setState];
}

/**
 * usePersistentTimer — manages a Pomodoro timer whose startTime is persisted
 * so it survives page refreshes. On mount it calculates elapsed time from the
 * stored startTime and resumes the countdown automatically.
 */
function usePersistentTimer() {
  const [timerData, setTimerData] = useLocalStorage("ng_timer", {
    isActive:      false,
    startTime:     null,   // epoch ms when current session began
    phase:         "work", // "work" | "rest"
    baseRemaining: POMODORO_WORK, // seconds remaining when timer was last paused
    chapterId:     null,
  });

  // Derive display values from persisted data (no extra state needed)
  const getRemaining = useCallback(() => {
    if (!timerData.isActive || !timerData.startTime) {
      return timerData.baseRemaining;
    }
    const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
    return Math.max(0, timerData.baseRemaining - elapsed);
  }, [timerData]);

  const start = useCallback((chapterId) => {
    setTimerData((prev) => ({
      ...prev,
      isActive:  true,
      startTime: Date.now(),
      chapterId: chapterId ?? prev.chapterId,
    }));
  }, [setTimerData]);

  const pause = useCallback(() => {
    setTimerData((prev) => ({
      ...prev,
      isActive:      false,
      startTime:     null,
      baseRemaining: Math.max(0,
        prev.baseRemaining -
        (prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : 0)
      ),
    }));
  }, [setTimerData]);

  const reset = useCallback((phase = "work", chapterId = null) => {
    setTimerData({
      isActive:      false,
      startTime:     null,
      phase,
      baseRemaining: phase === "work" ? POMODORO_WORK : POMODORO_REST,
      chapterId,
    });
  }, [setTimerData]);

  const advancePhase = useCallback(() => {
    setTimerData((prev) => {
      const nextPhase = prev.phase === "work" ? "rest" : "work";
      return {
        isActive:      false,
        startTime:     null,
        phase:         nextPhase,
        baseRemaining: nextPhase === "work" ? POMODORO_WORK : POMODORO_REST,
        chapterId:     prev.chapterId,
      };
    });
  }, [setTimerData]);

  return { timerData, getRemaining, start, pause, reset, advancePhase };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PARTICLE / EXPLOSION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Particle({ color }) {
  const angle = Math.random() * 360;
  const dist  = 60 + Math.random() * 140;
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: 0, top: 0,
        width:  5 + Math.random() * 8,
        height: 5 + Math.random() * 8,
        background:  color,
        boxShadow:   `0 0 8px ${color}`,
        animation:   "explode 0.85s ease-out forwards",
        "--tx": `${Math.cos((angle * Math.PI) / 180) * dist}px`,
        "--ty": `${Math.sin((angle * Math.PI) / 180) * dist}px`,
      }}
    />
  );
}

function ExplosionEffect({ x, y, onDone }) {
  const COLORS = ["#00ffff", "#ff2d78", "#00ff9f", "#f59e0b", "#ffffff", "#bf00ff"];
  useEffect(() => { const t = setTimeout(onDone, 950); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed pointer-events-none" style={{ left: x, top: y, zIndex: 9999 }}>
      {Array.from({ length: 36 }, (_, i) => (
        <Particle key={i} color={COLORS[i % COLORS.length]} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. POMODORO TIMER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PomodoroModal({ chapter, timerHook, onClose }) {
  const { timerData, getRemaining, start, pause, advancePhase } = timerHook;
  const [tick, setTick]       = useState(0);
  const intervalRef           = useRef(null);
  const { phase }             = timerData;
  const ringColor             = DIFF_STYLE[chapter.diff].timerRing;
  const totalSecs             = phase === "work" ? POMODORO_WORK : POMODORO_REST;

  // Re-render every second while active
  useEffect(() => {
    if (timerData.isActive) {
      intervalRef.current = setInterval(() => setTick((n) => n + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerData.isActive]);

  // Auto-advance phase when timer hits zero
  const remaining = getRemaining();
  useEffect(() => {
    if (timerData.isActive && remaining === 0) {
      advancePhase();
    }
  }, [remaining, timerData.isActive, advancePhase]);

  const mins     = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs     = String(remaining % 60).padStart(2, "0");
  const progress = Math.min(100, ((totalSecs - remaining) / totalSecs) * 100);
  const circum   = 2 * Math.PI * 88;

  const toggle = () => timerData.isActive ? pause() : start(chapter.id);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative rounded-2xl p-8 w-full max-w-md text-center mx-4"
        style={{
          background: "#060610",
          border:     `2px solid ${ringColor}`,
          boxShadow:  `0 0 60px ${ringColor}44`,
        }}
        initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="text-xs font-mono tracking-widest mb-1" style={{ color: ringColor }}>
          {phase === "work" ? "⚡ FOCUS MODE — GRIND" : "💤 REST PHASE — RECHARGE"}
        </div>
        <div className="text-white font-bold text-base mb-1 font-orbitron">{chapter.name}</div>
        <span className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 mb-6 ${DIFF_STYLE[chapter.diff].badge}`}>
          {DIFF_STYLE[chapter.diff].icon} {LABEL_MAP[chapter.diff]}
        </span>

        {/* SVG Circular Timer */}
        <div className="relative mx-auto mb-6" style={{ width: 210, height: 210 }}>
          <svg width="210" height="210" className="absolute inset-0">
            <circle cx="105" cy="105" r="88" fill="none" stroke="#1a1a2e" strokeWidth="10" />
            <circle
              cx="105" cy="105" r="88" fill="none"
              stroke={ringColor} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circum}
              strokeDashoffset={circum * (1 - progress / 100)}
              className="timer-ring-progress"
              style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="font-orbitron text-5xl font-black tabular-nums"
              style={{ color: ringColor, textShadow: `0 0 20px ${ringColor}` }}
            >
              {mins}:{secs}
            </div>
            <div className="text-xs text-gray-600 mt-1 font-mono tracking-widest">
              {phase === "work" ? `${TIME_MAP[chapter.diff]}h TOTAL` : "NEXT POMODORO"}
            </div>
          </div>
        </div>

        <button
          onClick={toggle}
          className="px-10 py-3 rounded-xl font-bold text-black font-orbitron tracking-wider transition-all active:scale-95 flex items-center gap-2 mx-auto"
          style={{ background: ringColor, boxShadow: `0 0 24px ${ringColor}88` }}
        >
          {timerData.isActive ? <><Pause size={16} /> PAUSE</> : <><Play size={16} /> START</>}
        </button>

        <p className="mt-4 text-xs text-gray-700 font-mono">50 min work · 10 min rest · Pomodoro Protocol</p>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. REVISION SIDEBAR (Neural Link)
// ─────────────────────────────────────────────────────────────────────────────
function RevisionSidebar({ revisions, onConfidence, onClose }) {
  const due = revisions.filter((r) => !r.done && r.dueAt <= Date.now());

  return (
    <motion.div
      className="fixed right-0 top-0 h-full z-40 flex flex-col overflow-hidden"
      style={{
        width: 340,
        background: "#060610",
        borderLeft: "1px solid #00ffff33",
        boxShadow: "-15px 0 60px #00ffff1a",
      }}
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-cyan-900/40 flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} className="text-cyan-400" />
            <span className="text-cyan-400 font-mono text-xs tracking-widest">NEURAL LINK</span>
          </div>
          <div className="text-white font-orbitron font-bold text-lg leading-tight">
            Memory Hacks
          </div>
          <div className="text-gray-600 text-xs mt-0.5">{due.length} revision{due.length !== 1 ? "s" : ""} due now</div>
        </div>
        <button onClick={onClose} className="text-gray-700 hover:text-white transition-colors mt-1">
          <X size={18} />
        </button>
      </div>

      {/* Revision list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {due.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="rounded-xl p-4"
              style={{
                background: "#0d0d20",
                border: "1px solid #00ffff22",
                boxShadow: "0 0 20px #00ffff0a",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Activity size={10} className="text-cyan-500" />
                <span className="text-xs font-mono text-cyan-600 tracking-widest">
                  ROUND {r.round} · 15 min recall
                </span>
              </div>
              <div className="text-white font-semibold text-sm mb-0.5">{r.chapterName}</div>
              <div className="text-gray-600 text-xs mb-3">{r.subject}</div>

              <div className="text-xs text-gray-600 font-mono mb-2 tracking-wider">CONFIDENCE RATING:</div>
              <div className="flex gap-2">
                {[
                  { label: "Easy",   color: "#00ff9f" },
                  { label: "Medium", color: "#f59e0b" },
                  { label: "Hard",   color: "#ff2d78" },
                ].map(({ label, color }) => (
                  <button
                    key={label}
                    onClick={() => onConfidence(r.id, label)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all active:scale-95 hover:brightness-125"
                    style={{
                      background: `${color}18`,
                      border:     `1px solid ${color}66`,
                      color,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-gray-700 text-xs mt-2 font-mono">
                Hard = reschedules for tomorrow
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {due.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-700 text-sm">No revisions due right now.</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CHAPTER CARD
// ─────────────────────────────────────────────────────────────────────────────
function ChapterCard({ chapter, isToday, isActive, onStart, onAnnihilate }) {
  const s = DIFF_STYLE[chapter.diff];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: chapter.completed ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: chapter.completed ? "#0a0a0e" : "#0d0d20",
        border:     `1px solid ${chapter.completed ? "#1a1a1a" : s.border}`,
        boxShadow:  chapter.completed ? "none" : (isActive ? s.glow : s.dimGlow),
        transition: "box-shadow 0.3s, border-color 0.3s",
      }}
    >
      {/* Active pulse overlay */}
      {isActive && !chapter.completed && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ background: `${s.border}08`, animation: "pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite" }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono font-bold ${s.badge}`}>
              {s.icon} {LABEL_MAP[chapter.diff]}
            </span>
            <span className="text-xs text-gray-700 font-mono">{chapter.subject}</span>
          </div>
          {/* Chapter name */}
          <div className={`font-orbitron font-bold text-sm leading-snug ${chapter.completed ? "line-through text-gray-700" : "text-white"}`}>
            {chapter.name}
          </div>
          {/* Meta */}
          <div className="text-xs text-gray-600 mt-1 font-mono">
            {TIME_MAP[chapter.diff]}h · +{XP_MAP[chapter.diff]} XP
          </div>
        </div>

        {/* Action buttons */}
        {!chapter.completed && isToday && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onStart(chapter)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all active:scale-95 flex items-center gap-1"
              style={{
                background: isActive ? s.border : `${s.border}15`,
                color:      isActive ? "#000" : s.border,
                border:     `1px solid ${s.border}`,
                boxShadow:  isActive ? s.glow : "none",
              }}
            >
              <Clock size={11} />
              {isActive ? "ACTIVE" : "START"}
            </button>
            <button
              id={`annihilate-${chapter.id}`}
              onClick={(e) => onAnnihilate(chapter, e)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all active:scale-95 flex items-center gap-1"
              style={{
                background: "#ff2d7815",
                color:      "#ff2d78",
                border:     "1px solid #ff2d7866",
              }}
            >
              <Zap size={11} />
              ANNIHILATE
            </button>
          </div>
        )}

        {chapter.completed && (
          <div className="text-neon-green text-xl font-bold shrink-0" style={{ color: "#00ff9f" }}>✓</div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. XP BAR
// ─────────────────────────────────────────────────────────────────────────────
function XPBar({ xp }) {
  const { rank, next, idx } = getRankInfo(xp);
  const progress  = next ? Math.min(100, ((xp - rank.min) / (next.min - rank.min)) * 100) : 100;
  const xpToNext  = next ? next.min - xp : 0;

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{ background: "#0a0a18", border: "1px solid #00ffff18" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-cyan-700 tracking-widest font-mono mb-0.5">MHT-CET RANK</div>
          <div className="font-orbitron text-xl font-black tracking-wider" style={{ color: "#00ffff" }}>
            {rank.name.toUpperCase()}
          </div>
        </div>
        <div className="text-right">
          <div
            className="font-orbitron text-2xl font-black"
            style={{ color: "#f59e0b", textShadow: "0 0 15px #f59e0b88" }}
          >
            {xp.toLocaleString()} XP
          </div>
          {next && (
            <div className="text-xs text-gray-700 font-mono">{xpToNext.toLocaleString()} → {next.name}</div>
          )}
        </div>
      </div>

      {/* Track */}
      <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "#111126" }}>
        <motion.div
          className="h-full rounded-full relative"
          style={{ background: "linear-gradient(90deg, #00ffff, #00ff9f)", boxShadow: "0 0 12px #00ffff" }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.25))", animation: "pulse 3s infinite" }}
          />
        </motion.div>
      </div>

      {/* Rank pips */}
      <div className="flex justify-between px-0.5">
        {RANKS.map((r, i) => (
          <div
            key={r.name}
            className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
            style={{ background: i <= idx ? "#00ffff" : "#1a1a2e" }}
            title={r.name}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Persisted State ─────────────────────────────────────────────────────────
  const [chapters,  setChapters]  = useLocalStorage("ng_chapters",  null);
  const [xp,        setXP]        = useLocalStorage("ng_xp",        0);
  const [revisions, setRevisions] = useLocalStorage("ng_revisions", []);
  const timerHook                 = usePersistentTimer();

  // ── Ephemeral UI State ───────────────────────────────────────────────────────
  const [activeChapter,   setActiveChapter]   = useState(null);
  const [showTimer,       setShowTimer]       = useState(false);
  const [showRevisions,   setShowRevisions]   = useState(false);
  const [explosions,      setExplosions]      = useState([]);
  const [revBadgePulse,   setRevBadgePulse]   = useState(false);
  const [showAllDays,     setShowAllDays]     = useState(false);

  // ── Initialization: load from localStorage or seed from default syllabus ────
  useEffect(() => {
    if (!chapters) {
      const defaults = buildDefaultChapters();
      setChapters(defaults);
      // Immediately persist so refresh never sees null
      window.localStorage.setItem("ng_chapters", JSON.stringify(defaults));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Revision badge pulse ─────────────────────────────────────────────────────
  const dueRevisions = (revisions ?? []).filter((r) => !r.done && r.dueAt <= Date.now());
  useEffect(() => {
    if (dueRevisions.length > 0) {
      setRevBadgePulse(true);
      const t = setTimeout(() => setRevBadgePulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [dueRevisions.length]);

  const allChapters    = chapters ?? [];
  const schedule       = buildSchedule(allChapters);
  const today          = schedule[0] ?? [];
  const completedCount = allChapters.filter((c) => c.completed).length;
  const hoursLeft      = allChapters.filter((c) => !c.completed).reduce((a, c) => a + TIME_MAP[c.diff], 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Start a chapter's Pomodoro timer. */
  const handleStart = useCallback((chapter) => {
    setActiveChapter(chapter);
    timerHook.reset("work", chapter.id);
    setShowTimer(true);
  }, [timerHook]);

  /**
   * ANNIHILATE — mark chapter complete.
   * Immediately calls localStorage.setItem twice:
   *   1. Updated chapters array
   *   2. Updated XP
   * This guarantees data is never lost even if React re-render is slow.
   */
  const handleAnnihilate = useCallback((chapter, e) => {
    // ① Explosion effect origin
    const rect = e?.currentTarget?.getBoundingClientRect?.();
    const ex   = { id: Date.now(), x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
                                   y: rect ? rect.top  + rect.height / 2 : window.innerHeight / 2 };
    setExplosions((prev) => [...prev, ex]);

    // ② canvas-confetti burst
    confetti({
      particleCount: 120,
      spread:        80,
      origin:        { x: ex.x / window.innerWidth, y: ex.y / window.innerHeight },
      colors:        ["#00ffff", "#ff2d78", "#00ff9f", "#f59e0b", "#ffffff"],
      disableForReducedMotion: true,
    });

    // ③ Update chapters — IMMEDIATELY persist to localStorage
    setChapters((prev) => {
      const next = prev.map((c) =>
        c.id === chapter.id
          ? { ...c, completed: true, completedAt: new Date().toISOString() }
          : c
      );
      // Direct write — belt-and-suspenders on top of useLocalStorage's own write
      window.localStorage.setItem("ng_chapters", JSON.stringify(next));
      return next;
    });

    // ④ Grant XP — IMMEDIATELY persist
    setXP((prev) => {
      const next = prev + XP_MAP[chapter.diff];
      window.localStorage.setItem("ng_xp", JSON.stringify(next));
      return next;
    });

    // ⑤ Spawn Neural-Link revision nodes (spaced repetition)
    setRevisions((prev) => {
      const next = [...prev, ...buildRevisionNodes(chapter)];
      window.localStorage.setItem("ng_revisions", JSON.stringify(next));
      return next;
    });

    // ⑥ Stop timer if this chapter was active
    if (activeChapter?.id === chapter.id) {
      setActiveChapter(null);
      setShowTimer(false);
      timerHook.reset();
    }
  }, [activeChapter, setChapters, setXP, setRevisions, timerHook]);

  /**
   * Confidence rating on a revision node.
   * "Hard" → reschedule for 24 h from now.
   * "Easy" | "Medium" → mark done.
   */
  const handleConfidence = useCallback((revId, level) => {
    setRevisions((prev) => {
      const next = prev.map((r) => {
        if (r.id !== revId) return r;
        if (level === "Hard") {
          return { ...r, dueAt: Date.now() + 24 * 60 * 60 * 1000, done: false };
        }
        return { ...r, done: true };
      });
      window.localStorage.setItem("ng_revisions", JSON.stringify(next));
      return next;
    });
  }, [setRevisions]);

  /** Hard reset — wipes all localStorage keys used by the app. */
  const handleReset = useCallback(() => {
    if (!window.confirm("⚠️  TACTICAL WIPE: Delete ALL progress? This cannot be undone.")) return;
    ["ng_chapters", "ng_xp", "ng_revisions", "ng_timer"].forEach((k) =>
      window.localStorage.removeItem(k)
    );
    setChapters(buildDefaultChapters());
    setXP(0);
    setRevisions([]);
    timerHook.reset();
    setActiveChapter(null);
    setShowTimer(false);
  }, [setChapters, setXP, setRevisions, timerHook]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const allDone = completedCount === allChapters.length && allChapters.length > 0;

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "#030308",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, #0d0d2e 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1a0d2e 0%, transparent 50%)",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* ── Global Styles ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:.3}50%{opacity:.9} }
        @keyframes explode{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes glowPulse{0%,100%{text-shadow:0 0 10px #00ffff,0 0 20px #00ffff}50%{text-shadow:0 0 25px #00ffff,0 0 50px #00ffff,0 0 80px #00ffff44}}
        .font-orbitron{ font-family:'Orbitron',monospace; }
        .animate-glow-text{ animation:glowPulse 3s ease-in-out infinite; }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a1a}::-webkit-scrollbar-thumb{background:#00ffff33;border-radius:2px}
      `}</style>

      {/* ── Scanline overlay ────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden" style={{ opacity: 0.025 }}>
        <div style={{ height: 2, background: "rgba(0,255,255,0.6)", animation: "scanline 5s linear infinite" }} />
      </div>

      {/* ── Explosions ──────────────────────────────────────────────────────────── */}
      {explosions.map((ex) => (
        <ExplosionEffect
          key={ex.id}
          x={ex.x}
          y={ex.y}
          onDone={() => setExplosions((prev) => prev.filter((e) => e.id !== ex.id))}
        />
      ))}

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTimer && activeChapter && (
          <PomodoroModal
            key="timer-modal"
            chapter={activeChapter}
            timerHook={timerHook}
            onClose={() => setShowTimer(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRevisions && (
          <RevisionSidebar
            key="revision-sidebar"
            revisions={revisions}
            onConfidence={handleConfidence}
            onClose={() => setShowRevisions(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Main Layout ─────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs tracking-widest text-cyan-800 font-mono mb-1">MHT-CET COMBAT SYSTEM v2.1</div>
            <h1
              className="font-orbitron text-3xl sm:text-4xl font-black tracking-wider animate-glow-text"
              style={{ color: "#00ffff" }}
            >
              NEURAL GRIND
            </h1>
            <div className="text-gray-700 text-xs mt-1.5 font-mono">
              {completedCount}/{allChapters.length} CHAPTERS ANNIHILATED · {hoursLeft}h REMAINING
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {/* Neural Link / Revision badge */}
            {dueRevisions.length > 0 && (
              <motion.button
                onClick={() => setShowRevisions(true)}
                className="relative px-4 py-2 rounded-xl text-sm font-bold font-mono transition-all active:scale-95 flex items-center gap-2"
                style={{
                  background: "#00ffff12",
                  border:     "1px solid #00ffff55",
                  color:      "#00ffff",
                  boxShadow:  revBadgePulse ? "0 0 20px #00ffff66" : "0 0 10px #00ffff22",
                }}
                animate={revBadgePulse ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Brain size={14} />
                MEMORY HACKS
                <motion.span
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: "#ff2d78", color: "#fff" }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {dueRevisions.length}
                </motion.span>
              </motion.button>
            )}

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-mono text-gray-700 hover:text-red-500 border border-gray-900 hover:border-red-900 transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> RESET
            </button>
          </div>
        </div>

        {/* ── XP Bar ──────────────────────────────────────────────────────────────── */}
        <XPBar xp={xp} />

        {/* ── Stats Row ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "DAYS LEFT",       value: schedule.length,  color: "#ff2d78", icon: <Target size={14} /> },
            { label: "HOURS REMAINING", value: `${hoursLeft}h`,  color: "#f59e0b", icon: <Clock size={14} /> },
            { label: "COMPLETION",
              value: `${allChapters.length ? Math.round((completedCount / allChapters.length) * 100) : 0}%`,
              color: "#00ff9f", icon: <Activity size={14} /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 text-center"
              style={{ background: "#0a0a18", border: `1px solid ${stat.color}22` }}
            >
              <div className="flex justify-center mb-1.5" style={{ color: stat.color }}>{stat.icon}</div>
              <div
                className="font-orbitron text-2xl font-black"
                style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}88` }}
              >
                {stat.value}
              </div>
              <div className="text-xs text-gray-700 mt-1 tracking-wider font-mono">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Victory Screen ───────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 mb-8 rounded-2xl"
              style={{ background: "#0a0a18", border: "1px solid #00ffff33", boxShadow: "0 0 60px #00ffff22" }}
            >
              <div
                className="font-orbitron text-5xl font-black mb-4 animate-glow-text"
                style={{ color: "#00ffff" }}
              >
                MISSION COMPLETE
              </div>
              <p className="text-gray-400 text-lg mb-4">
                You've annihilated the entire MHT-CET syllabus. 🏆
              </p>
              <div
                className="font-orbitron text-3xl font-black"
                style={{ color: "#f59e0b", textShadow: "0 0 20px #f59e0b" }}
              >
                {xp.toLocaleString()} XP EARNED
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Today's Missions ─────────────────────────────────────────────────────── */}
        {today.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,#ff2d78,transparent)" }} />
              <div
                className="font-orbitron text-xs font-bold tracking-widest flex items-center gap-1.5"
                style={{ color: "#ff2d78" }}
              >
                <Sword size={12} /> TODAY'S MISSIONS
              </div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,transparent,#ff2d78)" }} />
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {today.map((ch) => (
                  <ChapterCard
                    key={ch.id}
                    chapter={ch}
                    isToday
                    isActive={activeChapter?.id === ch.id}
                    onStart={handleStart}
                    onAnnihilate={handleAnnihilate}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Upcoming Campaigns ──────────────────────────────────────────────────── */}
        {schedule.slice(1).length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,#00ffff22,transparent)" }} />
              <div className="font-orbitron text-xs font-bold tracking-widest text-cyan-900 flex items-center gap-1.5">
                <ChevronRight size={12} /> UPCOMING CAMPAIGNS
              </div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,transparent,#00ffff22)" }} />
            </div>

            <div className="space-y-6">
              {(showAllDays ? schedule.slice(1) : schedule.slice(1, 7)).map((day, di) => (
                <div key={di}>
                  <div className="text-xs text-gray-800 font-mono mb-2 tracking-widest">DAY {di + 2}</div>
                  <div className="space-y-2">
                    {day.map((ch) => (
                      <div
                        key={ch.id}
                        className="rounded-xl px-4 py-3 flex items-center gap-3"
                        style={{
                          background: "#0a0a15",
                          border: `1px solid ${DIFF_STYLE[ch.diff].border}18`,
                        }}
                      >
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono ${DIFF_STYLE[ch.diff].badge}`}>
                          {DIFF_STYLE[ch.diff].icon} {LABEL_MAP[ch.diff]}
                        </span>
                        <span className="text-gray-500 text-sm flex-1 min-w-0 truncate">{ch.name}</span>
                        <span className="text-gray-700 text-xs font-mono shrink-0">{ch.subject}</span>
                        <span className="text-gray-800 text-xs font-mono shrink-0">+{XP_MAP[ch.diff]}XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {schedule.length > 7 && (
                <button
                  onClick={() => setShowAllDays((v) => !v)}
                  className="w-full py-3 rounded-xl text-xs font-mono tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: "#0a0a15", border: "1px solid #00ffff18", color: "#00ffff66" }}
                >
                  <ChevronRight
                    size={12}
                    style={{ transform: showAllDays ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                  />
                  {showAllDays
                    ? "COLLAPSE CAMPAIGN"
                    : `SHOW ALL ${schedule.length - 1} DAYS (+${schedule.length - 7} hidden)`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────────────── */}
        <div className="text-center text-gray-900 text-xs mt-16 pb-8 font-mono tracking-widest">
          NEURAL GRIND · MHT-CET COMBAT SYSTEM · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
