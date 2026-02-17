import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Minimize2,
  ArrowRightLeft,
  User,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// ─── Fuzzy name matcher ────────────────────────────────────────────────────────
const matchName = (query, list) => {
  const q = query.toLowerCase().trim();
  // Exact match first
  let found = list.find((item) => item.name.toLowerCase() === q);
  if (found) return found;
  // Starts-with
  found = list.find((item) => item.name.toLowerCase().startsWith(q));
  if (found) return found;
  // Contains any word
  const words = q.split(/\s+/);
  found = list.find((item) =>
    words.some((w) => w.length > 2 && item.name.toLowerCase().includes(w)),
  );
  return found || null;
};

// ─── Core Analysis Engine ─────────────────────────────────────────────────────
const analyzeQuery = (input, { grades, subjects, teachers, allocations }) => {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  // ── Helper: teacher load ──
  const getLoad = (teacherId) =>
    allocations
      .filter((a) => a.teacherId === teacherId)
      .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

  const getMax = (teacher) => parseInt(teacher?.maxLoad) || 30;

  // ── Pattern 1: "what does [teacher] teach" / "[teacher] load" / "show [teacher]" ──
  const infoPatterns = [
    /what does (.+?) teach/i,
    /show (.+?)(?:'s)? (?:load|allocations|assignments)/i,
    /(.+?)(?:'s)? workload/i,
    /^(?:load|info|details)(?: for| of)? (.+)/i,
  ];
  for (const pat of infoPatterns) {
    const m = raw.match(pat);
    if (m) {
      const teacher = matchName(m[1], teachers);
      if (!teacher) return notFound("teacher", m[1]);
      return teacherInfo(teacher, allocations, getLoad, getMax);
    }
  }

  // ── Pattern 2: "who teaches [subject] in [grade]" ──
  const whoTeachesMatch = raw.match(
    /who (?:teaches?|is teaching) (.+?) in (.+)/i,
  );
  if (whoTeachesMatch) {
    const subject = matchName(whoTeachesMatch[1], subjects);
    const grade = matchName(whoTeachesMatch[2], grades);
    if (!subject) return notFound("subject", whoTeachesMatch[1]);
    if (!grade) return notFound("grade", whoTeachesMatch[2]);
    return whoTeaches(grade, subject, allocations, teachers, getLoad, getMax);
  }

  // ── Pattern 3: "replace A with B in [grade] [subject]" ──
  const replaceSpecific = raw.match(
    /replace (.+?) with (.+?) in (.+?) (?:for|in|–|-) (.+)/i,
  );
  if (replaceSpecific) {
    const from = matchName(replaceSpecific[1], teachers);
    const to = matchName(replaceSpecific[2], teachers);
    const grade = matchName(replaceSpecific[3], grades);
    const subject = matchName(replaceSpecific[4], subjects);
    if (!from) return notFound("teacher", replaceSpecific[1]);
    if (!to) return notFound("teacher", replaceSpecific[2]);
    if (!grade) return notFound("grade", replaceSpecific[3]);
    if (!subject) return notFound("subject", replaceSpecific[4]);
    return replaceInCell(
      from,
      to,
      grade,
      subject,
      allocations,
      getLoad,
      getMax,
    );
  }

  // ── Pattern 4: "replace A with B" (global) ──
  const replaceGlobal = raw.match(
    /(?:replace|swap|substitute) (.+?) with (.+?)(?:\?|$)/i,
  );
  if (replaceGlobal) {
    const from = matchName(replaceGlobal[1], teachers);
    const to = matchName(replaceGlobal[2], teachers);
    if (!from) return notFound("teacher", replaceGlobal[1]);
    if (!to) return notFound("teacher", replaceGlobal[2]);
    return replaceGlobalAnalysis(
      from,
      to,
      allocations,
      subjects,
      grades,
      getLoad,
      getMax,
    );
  }

  // ── Pattern 5: "can A take over from B" / "can A cover B" ──
  const canTakeOver = raw.match(
    /can (.+?) (?:take over|cover|replace) (?:from |for )?(.+?)(?:\?|$)/i,
  );
  if (canTakeOver) {
    const to = matchName(canTakeOver[1], teachers);
    const from = matchName(canTakeOver[2], teachers);
    if (!to) return notFound("teacher", canTakeOver[1]);
    if (!from) return notFound("teacher", canTakeOver[2]);
    return replaceGlobalAnalysis(
      from,
      to,
      allocations,
      subjects,
      grades,
      getLoad,
      getMax,
    );
  }

  // ── Pattern 6: "remove / what if [teacher] leaves" ──
  const removeMatch = raw.match(
    /(?:remove|what if|if) (.+?) (?:leaves?|is removed|is unavailable|resigns?)/i,
  );
  if (removeMatch) {
    const teacher = matchName(removeMatch[1], teachers);
    if (!teacher) return notFound("teacher", removeMatch[1]);
    return removeTeacher(
      teacher,
      allocations,
      subjects,
      grades,
      getLoad,
      getMax,
    );
  }

  // ── Fallback ──
  return {
    type: "help",
    message: null,
    suggestions: [
      "replace Mr. Smith with Ms. Jones",
      "what does Sarah teach?",
      "who teaches Math in Grade 5?",
      "can Ali take over from Hassan?",
      "what if Ahmed leaves?",
    ],
  };
};

// ─── Analysis functions ───────────────────────────────────────────────────────

const notFound = (kind, name) => ({
  type: "error",
  message: `I couldn't find a ${kind} matching "${name}". Check the spelling or try a partial name.`,
});

const teacherInfo = (teacher, allocations, getLoad, getMax) => {
  const myAllocs = allocations.filter((a) => a.teacherId === teacher.id);
  const load = getLoad(teacher.id);
  const max = getMax(teacher);
  const pct = Math.round((load / max) * 100);

  return {
    type: "info",
    teacher,
    load,
    max,
    pct,
    allocations: myAllocs,
    message: null,
  };
};

const whoTeaches = (grade, subject, allocations, teachers, getLoad, getMax) => {
  const cellAllocs = allocations.filter(
    (a) => a.gradeId === grade.id && a.subjectId === subject.id,
  );
  if (cellAllocs.length === 0) {
    return {
      type: "empty_cell",
      message: `No teacher is currently assigned to **${subject.name}** in **${grade.name}**.`,
    };
  }
  const enriched = cellAllocs.map((a) => {
    const t = teachers.find((t) => t.id === a.teacherId);
    return { ...a, load: getLoad(a.teacherId), max: getMax(t) };
  });
  return { type: "cell_info", grade, subject, allocations: enriched };
};

const replaceInCell = (
  from,
  to,
  grade,
  subject,
  allocations,
  getLoad,
  getMax,
) => {
  const cellAlloc = allocations.find(
    (a) =>
      a.teacherId === from.id &&
      a.gradeId === grade.id &&
      a.subjectId === subject.id,
  );
  if (!cellAlloc) {
    return {
      type: "error",
      message: `**${from.name}** is not assigned to **${subject.name}** in **${grade.name}**. Nothing to replace.`,
    };
  }

  const isQualified = to.subjectIds?.includes(subject.id);
  const periodsNeeded = parseInt(cellAlloc.periodsPerWeek) || 0;
  const toCurrentLoad = getLoad(to.id);
  const toMax = getMax(to);
  const toAvailable = toMax - toCurrentLoad;
  const fromNewLoad = getLoad(from.id) - periodsNeeded;
  const toNewLoad = toCurrentLoad + periodsNeeded;
  const overCapacity = toNewLoad > toMax;

  return {
    type: "replace_cell",
    from,
    to,
    grade,
    subject,
    periodsNeeded,
    isQualified,
    fromNewLoad,
    toCurrentLoad,
    toNewLoad,
    toMax,
    toAvailable,
    overCapacity,
  };
};

const replaceGlobalAnalysis = (
  from,
  to,
  allocations,
  subjects,
  grades,
  getLoad,
  getMax,
) => {
  const fromAllocs = allocations.filter((a) => a.teacherId === from.id);
  if (fromAllocs.length === 0) {
    return {
      type: "error",
      message: `**${from.name}** has no current allocations to replace.`,
    };
  }

  const totalPeriods = fromAllocs.reduce(
    (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
    0,
  );
  const toCurrentLoad = getLoad(to.id);
  const toMax = getMax(to);
  const toNewLoad = toCurrentLoad + totalPeriods;
  const overCapacity = toNewLoad > toMax;
  const shortage = overCapacity ? toNewLoad - toMax : 0;

  // Check subject qualification per cell
  const cellDetails = fromAllocs.map((a) => {
    const subject = subjects.find((s) => s.id === a.subjectId);
    const grade = grades.find((g) => g.id === a.gradeId);
    const qualified = to.subjectIds?.includes(a.subjectId);
    return {
      ...a,
      subject,
      grade,
      qualified,
      periods: parseInt(a.periodsPerWeek) || 0,
    };
  });

  const unqualified = cellDetails.filter((c) => !c.qualified);
  const fromNewLoad = getLoad(from.id) - totalPeriods;

  return {
    type: "replace_global",
    from,
    to,
    fromAllocs,
    totalPeriods,
    toCurrentLoad,
    toNewLoad,
    toMax,
    overCapacity,
    shortage,
    cellDetails,
    unqualified,
    fromNewLoad,
  };
};

const removeTeacher = (
  teacher,
  allocations,
  subjects,
  grades,
  getLoad,
  getMax,
) => {
  const myAllocs = allocations.filter((a) => a.teacherId === teacher.id);
  if (myAllocs.length === 0) {
    return {
      type: "error",
      message: `**${teacher.name}** has no allocations. Removing them has no impact.`,
    };
  }
  const totalPeriods = myAllocs.reduce(
    (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
    0,
  );
  const cellDetails = myAllocs.map((a) => {
    const subject = subjects.find((s) => s.id === a.subjectId);
    const grade = grades.find((g) => g.id === a.gradeId);
    return { ...a, subject, grade, periods: parseInt(a.periodsPerWeek) || 0 };
  });

  return {
    type: "remove",
    teacher,
    totalPeriods,
    cellDetails,
    load: getLoad(teacher.id),
    max: getMax(teacher),
  };
};

// ─── Message Renderer ─────────────────────────────────────────────────────────
const ResultMessage = ({ result }) => {
  if (!result) return null;

  const pctBar = (current, max) => {
    const pct = Math.min(100, Math.round((current / (max || 30)) * 100));
    const color =
      pct > 90 ? "bg-red-400" : pct > 70 ? "bg-amber-400" : "bg-emerald-400";
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-mono opacity-70 whitespace-nowrap">
          {current}/{max} ({pct}%)
        </span>
      </div>
    );
  };

  // ── HELP ──
  if (result.type === "help") {
    return (
      <div>
        <p className="text-xs opacity-80 mb-2">I can answer questions like:</p>
        <div className="flex flex-col gap-1.5">
          {result.suggestions.map((s, i) => (
            <div
              key={i}
              className="text-xs bg-white/10 rounded-lg px-3 py-1.5 font-mono opacity-90 flex items-center gap-2"
            >
              <ChevronRight size={10} className="opacity-50 shrink-0" />
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (result.type === "error") {
    return (
      <div className="flex items-start gap-2">
        <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
        <p
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: result.message.replace(
              /\*\*(.+?)\*\*/g,
              "<strong>$1</strong>",
            ),
          }}
        />
      </div>
    );
  }

  // ── TEACHER INFO ──
  if (result.type === "info") {
    const { teacher, load, max, pct, allocations: allocs } = result;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User size={12} />
          </div>
          <span className="text-sm font-bold">{teacher.name}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              pct > 90
                ? "bg-red-400/30 text-red-200"
                : pct > 70
                  ? "bg-amber-400/30 text-amber-200"
                  : "bg-emerald-400/30 text-emerald-200"
            }`}
          >
            {pct}% utilised
          </span>
        </div>
        {pctBar(load, max)}
        {allocs.length > 0 ? (
          <div className="mt-2 space-y-1">
            {allocs.map((a) => (
              <div
                key={a.id}
                className="flex justify-between text-[10px] bg-white/10 rounded px-2 py-1"
              >
                <span className="opacity-80">
                  {a.gradeName} · {a.subjectName}
                </span>
                <span className="font-mono font-bold">{a.periodsPerWeek}p</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs opacity-60 mt-2">No allocations found.</p>
        )}
      </div>
    );
  }

  // ── CELL INFO ──
  if (result.type === "cell_info") {
    const { grade, subject, allocations: allocs } = result;
    return (
      <div>
        <p className="text-xs font-bold mb-2">
          {subject.name} in {grade.name}
        </p>
        {allocs.map((a) => (
          <div key={a.id} className="mb-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{a.teacherName}</span>
              <span className="font-mono opacity-70">
                {a.periodsPerWeek}p/wk
              </span>
            </div>
            {pctBar(a.load, a.max)}
          </div>
        ))}
      </div>
    );
  }

  // ── EMPTY CELL ──
  if (result.type === "empty_cell") {
    return (
      <div className="flex items-start gap-2">
        <Info size={13} className="text-blue-300 mt-0.5 shrink-0" />
        <p
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: result.message.replace(
              /\*\*(.+?)\*\*/g,
              "<strong>$1</strong>",
            ),
          }}
        />
      </div>
    );
  }

  // ── REPLACE CELL ──
  if (result.type === "replace_cell") {
    const {
      from,
      to,
      grade,
      subject,
      periodsNeeded,
      isQualified,
      fromNewLoad,
      toNewLoad,
      toMax,
      overCapacity,
    } = result;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="font-bold">{from.name}</span>
          <ArrowRightLeft size={11} className="opacity-50" />
          <span className="font-bold">{to.name}</span>
          <span className="opacity-50">
            in {grade.name} · {subject.name}
          </span>
        </div>

        {/* Qualification */}
        <div
          className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-2 ${isQualified ? "bg-emerald-500/20" : "bg-red-500/20"}`}
        >
          {isQualified ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={12} className="text-red-400" />
          )}
          <span>
            {isQualified
              ? `${to.name} is qualified to teach ${subject.name}`
              : `${to.name} is NOT qualified for ${subject.name}`}
          </span>
        </div>

        {/* Capacity */}
        <div
          className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-2 ${overCapacity ? "bg-red-500/20" : "bg-emerald-500/20"}`}
        >
          {overCapacity ? (
            <AlertTriangle size={12} className="text-red-400" />
          ) : (
            <CheckCircle2 size={12} className="text-emerald-400" />
          )}
          <span>
            {to.name}'s load: {toNewLoad}/{toMax}
            {overCapacity
              ? ` — OVER by ${toNewLoad - toMax}p`
              : " — within capacity"}
          </span>
        </div>

        <div className="text-[10px] opacity-60 mt-1">
          {periodsNeeded}p transferred · {from.name} freed load → {fromNewLoad}p
        </div>
      </div>
    );
  }

  // ── REPLACE GLOBAL ──
  if (result.type === "replace_global") {
    const {
      from,
      to,
      totalPeriods,
      toCurrentLoad,
      toNewLoad,
      toMax,
      overCapacity,
      shortage,
      cellDetails,
      unqualified,
      fromNewLoad,
    } = result;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="font-bold">{from.name}</span>
          <ArrowRightLeft size={11} className="opacity-50" />
          <span className="font-bold">{to.name}</span>
          <span className="opacity-50">({cellDetails.length} cells)</span>
        </div>

        {/* Capacity impact */}
        <div className="mb-2">
          <p className="text-[10px] opacity-60 mb-1">
            {to.name}'s workload after replacement:
          </p>
          {(() => {
            const pct = Math.min(100, Math.round((toNewLoad / toMax) * 100));
            const color =
              pct > 100
                ? "bg-red-400"
                : pct > 90
                  ? "bg-red-400"
                  : pct > 70
                    ? "bg-amber-400"
                    : "bg-emerald-400";
            return (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold whitespace-nowrap">
                  {toNewLoad}/{toMax}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Over capacity warning */}
        {overCapacity && (
          <div className="flex items-center gap-2 text-xs bg-red-500/20 rounded-lg px-3 py-2 mb-2">
            <AlertTriangle size={12} className="text-red-400 shrink-0" />
            <span>
              Over capacity by <strong>{shortage} periods</strong> — cannot
              fully absorb {from.name}'s load.
            </span>
          </div>
        )}

        {/* Unqualified subjects */}
        {unqualified.length > 0 && (
          <div className="flex items-start gap-2 text-xs bg-amber-500/20 rounded-lg px-3 py-2 mb-2">
            <AlertTriangle
              size={12}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <div>
              <span className="font-semibold">Not qualified for:</span>
              <div className="mt-1 space-y-0.5">
                {unqualified.map((c) => (
                  <div key={c.id} className="opacity-80">
                    {c.grade?.name} · {c.subject?.name} ({c.periods}p)
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All good summary */}
        {!overCapacity && unqualified.length === 0 && (
          <div className="flex items-center gap-2 text-xs bg-emerald-500/20 rounded-lg px-3 py-2 mb-2">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>
              Replacement is fully feasible — qualified and within capacity.
            </span>
          </div>
        )}

        {/* Cell breakdown */}
        <div className="mt-2 space-y-1">
          {cellDetails.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-center text-[10px] bg-white/10 rounded px-2 py-1"
            >
              <span className="opacity-80">
                {c.grade?.name} · {c.subject?.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{c.periods}p</span>
                {c.qualified ? (
                  <CheckCircle2 size={10} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={10} className="text-amber-400" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[10px] opacity-50 mt-2">
          {from.name} freed → {fromNewLoad}p remaining load
        </div>
      </div>
    );
  }

  // ── REMOVE ──
  if (result.type === "remove") {
    const { teacher, totalPeriods, cellDetails } = result;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3 text-xs bg-red-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-red-400" />
          <span>
            Removing <strong>{teacher.name}</strong> leaves{" "}
            <strong>{totalPeriods} periods</strong> unallocated across{" "}
            {cellDetails.length} cell{cellDetails.length !== 1 ? "s" : ""}.
          </span>
        </div>
        <div className="space-y-1">
          {cellDetails.map((c) => (
            <div
              key={c.id}
              className="flex justify-between text-[10px] bg-white/10 rounded px-2 py-1"
            >
              <span className="opacity-80">
                {c.grade?.name} · {c.subject?.name}
              </span>
              <span className="font-mono font-bold text-red-300">
                -{c.periods}p
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-50 mt-2">
          Use Smart Allocate or manual assignment to fill these gaps.
        </p>
      </div>
    );
  }

  return null;
};

// ─── Chat Message ─────────────────────────────────────────────────────────────
const ChatMessage = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <Sparkles size={10} className="text-indigo-300" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
          isUser
            ? "bg-indigo-500 text-white rounded-tr-sm"
            : "bg-white/10 text-white rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p>{msg.text}</p>
        ) : msg.result ? (
          <ResultMessage result={msg.result} />
        ) : (
          <p>{msg.text}</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AllocationChat = ({ grades, subjects, teachers, allocations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: "assistant",
      text: null,
      result: {
        type: "help",
        suggestions: [
          "replace Mr. Smith with Ms. Jones",
          "what does Sarah teach?",
          "who teaches Math in Grade 5?",
          "can Ali take over from Hassan?",
          "what if Ahmed leaves?",
        ],
      },
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: Date.now(), role: "user", text };
    const result = analyzeQuery(text, {
      grades,
      subjects,
      teachers,
      allocations,
    });
    const botMsg = {
      id: Date.now() + 1,
      role: "assistant",
      text: null,
      result,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Floating Bubble ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-13 h-13 flex items-center justify-center group"
          title="Allocation Assistant"
        >
          <div className="relative w-13 h-13">
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 animate-ping" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-xl shadow-indigo-900/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare size={20} className="text-white" />
            </div>
          </div>
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/40"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-violet-700 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">
                  Allocation Assistant
                </p>
                <p className="text-[10px] text-indigo-200 mt-0.5">
                  Ask about teacher replacements
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{
              background:
                "linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
            }}
          >
            {messages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 shrink-0 border-t border-white/10"
            style={{ background: "#1e1b4b" }}
          >
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about a replacement…"
                className="flex-1 bg-transparent text-white text-xs placeholder-white/30 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-6 h-6 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={11} className="text-white" />
              </button>
            </div>
            <p className="text-[9px] text-white/20 text-center mt-1.5">
              Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AllocationChat;
