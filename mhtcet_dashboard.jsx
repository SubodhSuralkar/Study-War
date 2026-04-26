import { useState, useEffect, useRef, useCallback } from "react";

// ─── useLocalStorage Hook ────────────────────────────────────────────────────
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (e) {
      console.error(e);
    }
  }, [key, storedValue]);
  return [storedValue, setValue];
}

// ─── Syllabus Data ───────────────────────────────────────────────────────────
const SYLLABUS_DATA = {
  Physics: [
    { name: "Rotational Dynamics", diff: "H" },
    { name: "Kinetic Theory of Gases", diff: "M" },
    { name: "Wave Optics", diff: "H" },
    { name: "Dual Nature of Radiation", diff: "M" },
    { name: "Structure of Atom", diff: "E" },
    { name: "Semiconductors", diff: "E" },
  ],
  Chemistry: [
    { name: "Solutions", diff: "H" },
    { name: "Electrochemistry", diff: "H" },
    { name: "Halogen Derivatives", diff: "E" },
    { name: "Alcohols, Phenols and Ethers", diff: "M" },
    { name: "Ionic Equilibrium", diff: "H" },
    { name: "Amines", diff: "M" },
    { name: "Transition Elements", diff: "E" },
    { name: "Basic Concepts of Chemistry", diff: "E" },
    { name: "Atomic Structure", diff: "E" },
    { name: "Chemical Thermodynamics", diff: "M" },
  ],
  Mathematics: [
    { name: "Pair of Lines", diff: "M" },
    { name: "Line & Plane", diff: "M" },
    { name: "Differentiation", diff: "H" },
    { name: "Applications of Derivatives", diff: "H" },
    { name: "Differential Equations", diff: "H" },
  ],
};

const XP_MAP = { H: 500, M: 300, E: 150 };
const TIME_MAP = { H: 5, M: 3, E: 1.5 };
const LABEL_MAP = { H: "BOSS BATTLE", M: "ELITE ENEMY", E: "MINION" };
const COLOR_MAP = {
  H: { border: "#ff2d78", glow: "0 0 20px #ff2d7888", badge: "bg-rose-900 text-rose-300 border border-rose-700" },
  M: { border: "#f59e0b", glow: "0 0 20px #f59e0b88", badge: "bg-yellow-900 text-yellow-300 border border-yellow-700" },
  E: { border: "#00ff9f", glow: "0 0 20px #00ff9f88", badge: "bg-emerald-900 text-emerald-300 border border-emerald-700" },
};

const RANKS = [
  { name: "Recruit", min: 0 }, { name: "Initiate", min: 500 },
  { name: "Soldier", min: 1200 }, { name: "Veteran", min: 2500 },
  { name: "Elite", min: 4000 }, { name: "Champion", min: 6000 },
  { name: "Legend", min: 8500 }, { name: "God-Tier", min: 12000 },
];

function getRank(xp) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return { rank: RANKS[i], next: RANKS[i + 1] || null, idx: i };
  }
  return { rank: RANKS[0], next: RANKS[1], idx: 0 };
}

// ─── Scheduling Algorithm ────────────────────────────────────────────────────
function buildSchedule(chapters) {
  const pending = chapters.filter((c) => !c.completed);
  const H = pending.filter((c) => c.diff === "H");
  const M = pending.filter((c) => c.diff === "M");
  const E = pending.filter((c) => c.diff === "E");
  const days = [];
  const used = new Set();

  const consume = (arr) => {
    const item = arr.find((c) => !used.has(c.id));
    if (item) used.add(item.id);
    return item || null;
  };

  while (used.size < pending.length) {
    const prevSize = used.size;
    // Try Combo A: 1H + 1E
    const h = H.find((c) => !used.has(c.id));
    const e1 = E.find((c) => !used.has(c.id));
    if (h && e1) { used.add(h.id); used.add(e1.id); days.push([h, e1]); continue; }
    // Try Combo B: 2M
    const m1 = M.find((c) => !used.has(c.id));
    const m2 = M.filter((c) => !used.has(c.id))[1];
    if (m1 && m2) { used.add(m1.id); used.add(m2.id); days.push([m1, m2]); continue; }
    // Try Combo C: 3E
    const eArr = E.filter((c) => !used.has(c.id));
    if (eArr.length >= 3) { eArr.slice(0, 3).forEach((c) => used.add(c.id)); days.push(eArr.slice(0, 3)); continue; }
    // Fallback: pack remaining
    const remaining = pending.filter((c) => !used.has(c.id));
    if (remaining.length > 0) { remaining.forEach((c) => used.add(c.id)); days.push(remaining); }
    if (used.size === prevSize) break;
  }
  return days;
}

// ─── Init State ──────────────────────────────────────────────────────────────
function initChapters() {
  let id = 0;
  const chapters = [];
  for (const [subject, items] of Object.entries(SYLLABUS_DATA)) {
    for (const item of items) {
      chapters.push({ ...item, id: id++, subject, completed: false, completedAt: null });
    }
  }
  return chapters;
}

// ─── Particles ───────────────────────────────────────────────────────────────
function Particle({ x, y, color }) {
  const angle = Math.random() * 360;
  const dist = 60 + Math.random() * 120;
  const tx = Math.cos((angle * Math.PI) / 180) * dist;
  const ty = Math.sin((angle * Math.PI) / 180) * dist;
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: 6 + Math.random() * 8, height: 6 + Math.random() * 8,
        background: color, boxShadow: `0 0 10px ${color}`,
        animation: `explode 0.8s ease-out forwards`,
        "--tx": `${tx}px`, "--ty": `${ty}px`,
      }}
    />
  );
}

function ExplosionEffect({ x, y, onDone }) {
  const colors = ["#00ffff", "#ff2d78", "#00ff9f", "#f59e0b", "#fff"];
  const particles = Array.from({ length: 30 }, (_, i) => ({ id: i, color: colors[i % colors.length] }));
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed pointer-events-none" style={{ left: x - 3, top: y - 3, zIndex: 9999 }}>
      {particles.map((p) => <Particle key={p.id} x={0} y={0} color={p.color} />)}
    </div>
  );
}

// ─── Pomodoro Timer ──────────────────────────────────────────────────────────
function PomodoroTimer({ chapter, onClose, timerState, setTimerState }) {
  const WORK = 50 * 60, REST = 10 * 60;
  const intervalRef = useRef(null);

  const elapsed = timerState.isActive && timerState.startTime
    ? Math.floor((Date.now() - timerState.startTime) / 1000)
    : 0;
  const phase = timerState.phase || "work";
  const total = phase === "work" ? WORK : REST;
  const base = timerState.baseRemaining ?? total;
  const remaining = Math.max(0, base - (timerState.isActive ? elapsed : 0));
  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");
  const progress = ((total - remaining) / total) * 100;

  useEffect(() => {
    if (timerState.isActive) {
      intervalRef.current = setInterval(() => {
        const el = Math.floor((Date.now() - timerState.startTime) / 1000);
        const rem = Math.max(0, (timerState.baseRemaining ?? total) - el);
        if (rem === 0) {
          clearInterval(intervalRef.current);
          const nextPhase = phase === "work" ? "rest" : "work";
          const nextTotal = nextPhase === "work" ? WORK : REST;
          setTimerState({ isActive: false, startTime: null, phase: nextPhase, baseRemaining: nextTotal });
        }
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerState.isActive, timerState.startTime, timerState.baseRemaining, phase]);

  const toggle = () => {
    if (timerState.isActive) {
      const el = Math.floor((Date.now() - timerState.startTime) / 1000);
      const rem = Math.max(0, (timerState.baseRemaining ?? total) - el);
      setTimerState({ ...timerState, isActive: false, startTime: null, baseRemaining: rem });
    } else {
      setTimerState({ ...timerState, isActive: true, startTime: Date.now() });
    }
  };

  const phaseColor = phase === "work" ? "#00ffff" : "#00ff9f";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="relative rounded-2xl p-8 w-full max-w-md text-center" style={{ background: "#0a0a1a", border: `2px solid ${phaseColor}`, boxShadow: `0 0 40px ${phaseColor}44` }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
        <div className="text-xs font-mono tracking-widest mb-1" style={{ color: phaseColor }}>{phase === "work" ? "⚡ FOCUS MODE" : "💤 REST PHASE"}</div>
        <div className="text-lg font-bold text-white mb-1">{chapter.name}</div>
        <div className={`text-xs px-2 py-1 rounded inline-block mb-6 ${COLOR_MAP[chapter.diff].badge}`}>{LABEL_MAP[chapter.diff]}</div>

        <div className="relative mx-auto mb-6" style={{ width: 200, height: 200 }}>
          <svg width="200" height="200" className="absolute inset-0">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#1a1a2e" strokeWidth="12" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={phaseColor} strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", filter: `drop-shadow(0 0 8px ${phaseColor})`, transition: "stroke-dashoffset 0.5s" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-5xl font-bold" style={{ color: phaseColor, textShadow: `0 0 20px ${phaseColor}` }}>{mins}:{secs}</div>
            <div className="text-xs text-gray-500 mt-1 font-mono">{phase === "work" ? "GRIND" : "RECHARGE"}</div>
          </div>
        </div>

        <button onClick={toggle} className="px-8 py-3 rounded-lg font-bold text-black transition-all active:scale-95"
          style={{ background: phaseColor, boxShadow: `0 0 20px ${phaseColor}88` }}>
          {timerState.isActive ? "⏸ PAUSE" : "▶ START"}
        </button>

        <div className="mt-4 text-xs text-gray-600 font-mono">50 min WORK · 10 min REST · {TIME_MAP[chapter.diff]}hr total</div>
      </div>
    </div>
  );
}

// ─── Revision Sidebar ─────────────────────────────────────────────────────────
function RevisionSidebar({ revisions, onConfidence, onClose }) {
  const due = revisions.filter((r) => !r.done && new Date(r.dueDate) <= new Date());
  if (due.length === 0) return null;
  return (
    <div className="fixed right-0 top-0 h-full z-40 flex flex-col" style={{ width: 320, background: "#060610", borderLeft: "1px solid #00ffff44", boxShadow: "-10px 0 40px #00ffff22", animation: "slideIn 0.4s cubic-bezier(0.23,1,0.32,1)" }}>
      <div className="p-4 border-b border-cyan-900 flex items-center justify-between">
        <div>
          <div className="text-cyan-400 font-mono text-xs tracking-widest">MEMORY HACKS</div>
          <div className="text-white font-bold text-lg">{due.length} Revision{due.length > 1 ? "s" : ""} Due</div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white text-xl">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {due.map((r) => (
          <div key={r.id} className="rounded-xl p-4" style={{ background: "#0d0d20", border: "1px solid #00ffff33", boxShadow: "0 0 15px #00ffff11" }}>
            <div className="text-xs font-mono text-cyan-500 mb-1">📡 MEMORY HACK · Round {r.round}</div>
            <div className="text-white font-semibold text-sm mb-1">{r.chapterName}</div>
            <div className="text-gray-500 text-xs mb-3">{r.subject} · 15 min quick recall</div>
            <div className="text-xs text-gray-400 mb-2 font-mono">CONFIDENCE:</div>
            <div className="flex gap-2">
              {["Easy", "Medium", "Hard"].map((lvl) => (
                <button key={lvl} onClick={() => onConfidence(r.id, lvl)}
                  className="flex-1 py-1 rounded text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: lvl === "Easy" ? "#00ff9f22" : lvl === "Medium" ? "#f59e0b22" : "#ff2d7822",
                    border: `1px solid ${lvl === "Easy" ? "#00ff9f" : lvl === "Medium" ? "#f59e0b" : "#ff2d78"}`,
                    color: lvl === "Easy" ? "#00ff9f" : lvl === "Medium" ? "#f59e0b" : "#ff2d78",
                  }}>{lvl}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────
function ChapterCard({ chapter, dayIdx, onStart, onAnnihilate, activeChapter }) {
  const c = COLOR_MAP[chapter.diff];
  const isActive = activeChapter?.id === chapter.id;
  return (
    <div className="rounded-xl p-4 transition-all duration-300 relative overflow-hidden"
      style={{
        background: chapter.completed ? "#0a0a0a" : "#0d0d20",
        border: `1px solid ${chapter.completed ? "#1a1a1a" : c.border}`,
        boxShadow: chapter.completed ? "none" : (isActive ? c.glow : `0 0 10px ${c.border}33`),
        opacity: chapter.completed ? 0.4 : 1,
      }}>
      {isActive && <div className="absolute inset-0 pointer-events-none" style={{ background: `${c.border}08`, animation: "pulse 2s infinite" }} />}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${c.badge}`}>{LABEL_MAP[chapter.diff]}</span>
            <span className="text-xs text-gray-600 font-mono">{chapter.subject}</span>
          </div>
          <div className={`font-bold text-sm ${chapter.completed ? "line-through text-gray-600" : "text-white"}`}>{chapter.name}</div>
          <div className="text-xs text-gray-500 mt-1 font-mono">{TIME_MAP[chapter.diff]}h · +{XP_MAP[chapter.diff]} XP</div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {!chapter.completed && (
            <>
              <button onClick={() => onStart(chapter)}
                className="px-3 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
                style={{ background: isActive ? c.border : `${c.border}22`, color: isActive ? "#000" : c.border, border: `1px solid ${c.border}` }}>
                {isActive ? "▶ ACTIVE" : "▶ START"}
              </button>
              <button onClick={() => onAnnihilate(chapter)}
                className="px-3 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
                style={{ background: "#ff2d7822", color: "#ff2d78", border: "1px solid #ff2d78" }}>
                💀 ANNIHILATE
              </button>
            </>
          )}
          {chapter.completed && <div className="text-green-400 text-lg">✓</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function MHTCETDashboard() {
  const [chapters, setChapters] = useLocalStorage("mhtcet_chapters", null);
  const [xp, setXp] = useLocalStorage("mhtcet_xp", 0);
  const [revisions, setRevisions] = useLocalStorage("mhtcet_revisions", []);
  const [timerState, setTimerState] = useLocalStorage("mhtcet_timer", { isActive: false, startTime: null, phase: "work", baseRemaining: 50 * 60 });
  const [activeChapter, setActiveChapter] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [explosions, setExplosions] = useState([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revBadge, setRevBadge] = useState(0);

  // Init chapters
  const allChapters = chapters || initChapters();
  useEffect(() => { if (!chapters) setChapters(initChapters()); }, []);

  // Revision badge
  useEffect(() => {
    const due = revisions.filter((r) => !r.done && new Date(r.dueDate) <= new Date()).length;
    setRevBadge(due);
  }, [revisions]);

  const schedule = buildSchedule(allChapters);
  const today = schedule[0] || [];
  const { rank, next, idx } = getRank(xp);
  const xpForNext = next ? next.min - xp : 0;
  const xpProgress = next ? ((xp - rank.min) / (next.min - rank.min)) * 100 : 100;
  const totalXP = allChapters.reduce((a, c) => a + XP_MAP[c.diff], 0);
  const completedCount = allChapters.filter((c) => c.completed).length;

  const spawnRevisions = (chapter) => {
    const now = Date.now();
    const newRevs = [1, 3, 7].map((days, i) => ({
      id: `${chapter.id}-rev-${i}-${now}`,
      chapterId: chapter.id,
      chapterName: chapter.name,
      subject: chapter.subject,
      round: i + 1,
      dueDate: new Date(now + days * 86400000).toISOString(),
      done: false,
    }));
    setRevisions((prev) => [...prev, ...newRevs]);
  };

  const handleAnnihilate = (chapter, e) => {
    const rect = e?.currentTarget?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const id = Date.now();
    setExplosions((prev) => [...prev, { id, x, y }]);

    setChapters((prev) => prev.map((c) => c.id === chapter.id ? { ...c, completed: true, completedAt: new Date().toISOString() } : c));
    setXp((prev) => prev + XP_MAP[chapter.diff]);
    spawnRevisions(chapter);
    if (activeChapter?.id === chapter.id) { setActiveChapter(null); setShowTimer(false); }
  };

  const handleStart = (chapter) => {
    setActiveChapter(chapter);
    setTimerState({ isActive: false, startTime: null, phase: "work", baseRemaining: 50 * 60 });
    setShowTimer(true);
  };

  const handleConfidence = (revId, level) => {
    setRevisions((prev) => prev.map((r) => {
      if (r.id !== revId) return r;
      if (level === "Hard") {
        return { ...r, dueDate: new Date(Date.now() + 86400000).toISOString(), done: false };
      }
      return { ...r, done: true };
    }));
  };

  const handleReset = () => {
    if (!confirm("Reset ALL progress? This cannot be undone.")) return;
    setChapters(initChapters()); setXp(0); setRevisions([]);
    setTimerState({ isActive: false, startTime: null, phase: "work", baseRemaining: 50 * 60 });
  };

  const dueRevs = revisions.filter((r) => !r.done && new Date(r.dueDate) <= new Date()).length;

  return (
    <div className="min-h-screen text-white font-mono" style={{ background: "#030308", backgroundImage: "radial-gradient(ellipse at 20% 50%, #0d0d2e 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1a0d2e 0%, transparent 50%)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .font-orbitron { font-family: 'Orbitron', monospace; }
        .font-mono { font-family: 'Share Tech Mono', monospace; }
        @keyframes explode {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes flicker { 0%,100% { opacity: 1; } 50% { opacity: 0.95; } }
        @keyframes glow { 0%,100% { text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff; } 50% { text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff44; } }
        .glow-text { animation: glow 3s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a1a; } ::-webkit-scrollbar-thumb { background: #00ffff44; border-radius: 2px; }
      `}</style>

      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden" style={{ opacity: 0.03 }}>
        <div style={{ height: 2, background: "rgba(0,255,255,0.5)", animation: "scanline 4s linear infinite" }} />
      </div>

      {/* Explosions */}
      {explosions.map((ex) => (
        <ExplosionEffect key={ex.id} x={ex.x} y={ex.y} onDone={() => setExplosions((p) => p.filter((e) => e.id !== ex.id))} />
      ))}

      {/* Revision Sidebar */}
      {showRevisions && <RevisionSidebar revisions={revisions} onConfidence={handleConfidence} onClose={() => setShowRevisions(false)} />}

      {/* Timer Modal */}
      {showTimer && activeChapter && (
        <PomodoroTimer chapter={activeChapter} onClose={() => setShowTimer(false)} timerState={timerState} setTimerState={setTimerState} />
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs tracking-widest text-cyan-600 mb-1">MHT-CET COMBAT SYSTEM v2.0</div>
            <h1 className="font-orbitron text-3xl font-black glow-text" style={{ color: "#00ffff" }}>NEURAL GRIND</h1>
            <div className="text-gray-500 text-xs mt-1">{completedCount}/{allChapters.length} CHAPTERS ANNIHILATED</div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {dueRevs > 0 && (
              <button onClick={() => setShowRevisions(true)}
                className="relative px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
                style={{ background: "#00ffff22", border: "1px solid #00ffff", color: "#00ffff", boxShadow: "0 0 15px #00ffff44" }}>
                📡 MEMORY HACKS
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: "#ff2d78", color: "#fff" }}>{dueRevs}</span>
              </button>
            )}
            <button onClick={handleReset} className="px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-red-500 border border-gray-800 hover:border-red-900 transition-all">↺ RESET</button>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-8 rounded-xl p-5" style={{ background: "#0a0a18", border: "1px solid #00ffff22" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-cyan-600 tracking-widest">MHT-CET RANK</div>
              <div className="font-orbitron text-xl font-black" style={{ color: "#00ffff" }}>{rank.name.toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="font-orbitron text-2xl font-black" style={{ color: "#f59e0b", textShadow: "0 0 15px #f59e0b" }}>{xp.toLocaleString()} XP</div>
              {next && <div className="text-xs text-gray-600">{xpForNext} to {next.name}</div>}
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#1a1a2e" }}>
            <div className="h-full rounded-full transition-all duration-500 relative"
              style={{ width: `${Math.min(100, xpProgress)}%`, background: "linear-gradient(90deg, #00ffff, #00ff9f)", boxShadow: "0 0 10px #00ffff" }}>
              <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3))", animation: "pulse 2s infinite" }} />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            {RANKS.slice(0, 8).map((r, i) => (
              <div key={r.name} className="w-1 h-1 rounded-full" style={{ background: i <= idx ? "#00ffff" : "#1a1a2e" }} />
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "DAYS LEFT", value: schedule.length, color: "#ff2d78" },
            { label: "HOURS REMAINING", value: `${allChapters.filter(c=>!c.completed).reduce((a,c)=>a+TIME_MAP[c.diff],0)}h`, color: "#f59e0b" },
            { label: "COMPLETION", value: `${Math.round((completedCount/allChapters.length)*100)}%`, color: "#00ff9f" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-4 text-center" style={{ background: "#0a0a18", border: `1px solid ${stat.color}33` }}>
              <div className="font-orbitron text-2xl font-black" style={{ color: stat.color, textShadow: `0 0 15px ${stat.color}` }}>{stat.value}</div>
              <div className="text-xs text-gray-600 mt-1 tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Today's Missions */}
        {today.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #ff2d78, transparent)" }} />
              <div className="font-orbitron text-sm font-bold tracking-widest" style={{ color: "#ff2d78" }}>⚔ TODAY'S MISSIONS</div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #ff2d78)" }} />
            </div>
            <div className="space-y-3">
              {today.map((ch) => (
                <ChapterCard key={ch.id} chapter={ch} dayIdx={0} onStart={handleStart} activeChapter={activeChapter}
                  onAnnihilate={(chapter) => {
                    const el = document.getElementById(`btn-${chapter.id}`);
                    const rect = el?.getBoundingClientRect();
                    handleAnnihilate(chapter, { currentTarget: { getBoundingClientRect: () => rect || { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 } } });
                  }} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Days */}
        {schedule.slice(1).length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #00ffff44, transparent)" }} />
              <div className="font-orbitron text-sm font-bold tracking-widest text-cyan-700">UPCOMING CAMPAIGNS</div>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #00ffff44)" }} />
            </div>
            <div className="space-y-6">
              {schedule.slice(1, 6).map((day, di) => (
                <div key={di}>
                  <div className="text-xs text-gray-600 font-mono mb-2 tracking-widest">DAY {di + 2}</div>
                  <div className="space-y-2">
                    {day.map((ch) => (
                      <div key={ch.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "#0a0a15", border: `1px solid ${COLOR_MAP[ch.diff].border}22` }}>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${COLOR_MAP[ch.diff].badge}`}>{LABEL_MAP[ch.diff]}</span>
                        <span className="text-gray-400 text-sm">{ch.name}</span>
                        <span className="text-gray-600 text-xs ml-auto">{ch.subject}</span>
                        <span className="text-gray-700 text-xs">+{XP_MAP[ch.diff]}XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {schedule.length > 6 && (
                <div className="text-center text-gray-700 text-xs py-2">+{schedule.length - 6} more days in the campaign</div>
              )}
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {completedCount === allChapters.length && (
          <div className="text-center py-16">
            <div className="font-orbitron text-5xl font-black mb-4" style={{ color: "#00ffff", textShadow: "0 0 40px #00ffff, 0 0 80px #00ffff44", animation: "glow 1s ease-in-out infinite" }}>
              MISSION COMPLETE
            </div>
            <div className="text-gray-400 text-lg">You've annihilated the entire MHT-CET syllabus. 🏆</div>
            <div className="font-orbitron text-3xl font-black mt-4" style={{ color: "#f59e0b" }}>{xp.toLocaleString()} XP EARNED</div>
          </div>
        )}

        <div className="text-center text-gray-800 text-xs mt-12 pb-6">NEURAL GRIND · MHT-CET COMBAT SYSTEM · {new Date().getFullYear()}</div>
      </div>
    </div>
  );
}
