import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";

import { analyzeQuery } from "./queryEngine";

// ── Renderer imports ──────────────────────────────────────────────────────────
import {
  TeacherInfoRenderer,
  OverloadedRenderer,
  UnderutilisedRenderer,
  CompareRenderer,
} from "./renderers/TeacherRenderers";

import {
  ReplaceCellRenderer,
  ReplaceGlobalRenderer,
  RemoveRenderer,
  FindSubstituteRenderer,
} from "./renderers/ReplacementRenderers";

import {
  CellInfoRenderer,
  EmptyCellRenderer,
  SubjectCoverageRenderer,
  GapsRenderer,
  GradeCompletionRenderer,
} from "./renderers/CoverageRenderers";

import { DepartmentLoadRenderer } from "./renderers/DepartmentRenderers";

// ── Renderer registry ─────────────────────────────────────────────────────────
// Maps result.type → the React component that renders it.
// To add a new question: create a renderer, add one line here.
const RENDERERS = {
  info: TeacherInfoRenderer,
  overloaded: OverloadedRenderer,
  underutilised: UnderutilisedRenderer,
  compare: CompareRenderer,
  replace_cell: ReplaceCellRenderer,
  replace_global: ReplaceGlobalRenderer,
  remove: RemoveRenderer,
  find_substitute: FindSubstituteRenderer,
  cell_info: CellInfoRenderer,
  empty_cell: EmptyCellRenderer,
  subject_coverage: SubjectCoverageRenderer,
  gaps: GapsRenderer,
  grade_completion: GradeCompletionRenderer,
  department_load: DepartmentLoadRenderer,
};

// ── Built-in renderers (too simple to need their own files) ───────────────────

const ErrorRenderer = ({ result }) => (
  <div className="flex items-start gap-2">
    <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
    <p
      className="text-xs leading-relaxed"
      dangerouslySetInnerHTML={{
        __html: result.message.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
      }}
    />
  </div>
);

const HelpRenderer = () => (
  <div>
    <p className="text-xs opacity-80 mb-2">Try asking things like:</p>
    <div className="flex flex-col gap-1.5">
      {[
        "replace Ahmed with Sara",
        "who is overloaded?",
        "who has free periods?",
        "show gaps",
        "is Math fully covered?",
        "who can cover Ahmed in Grade 5 for Math?",
        "English department load",
        "compare Ahmed and Sara",
        "how complete is Grade 7?",
        "what does Sara teach?",
        "what if Ahmed leaves?",
      ].map((s, i) => (
        <div
          key={i}
          className="text-[11px] bg-white/10 rounded-lg px-2.5 py-1.5 font-mono flex items-center gap-1.5"
        >
          <ChevronRight size={9} className="opacity-40 shrink-0" />
          {s}
        </div>
      ))}
    </div>
  </div>
);

// ── Result dispatcher ─────────────────────────────────────────────────────────
// Looks up the right renderer and renders it.
// Falls back to HelpRenderer if the type is unknown.
const ResultMessage = ({ result }) => {
  if (!result) return null;
  if (result.type === "help") return <HelpRenderer />;
  if (result.type === "error") return <ErrorRenderer result={result} />;

  const Renderer = RENDERERS[result.type];
  if (!Renderer) {
    console.warn(
      `AllocationChat: no renderer found for result type "${result.type}"`,
    );
    return <HelpRenderer />;
  }

  return <Renderer result={result} />;
};

// ── Single chat message bubble ────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
const AllocationChat = ({
  grades,
  subjects,
  teachers,
  allocations,
  departments = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: 0, role: "assistant", text: null, result: { type: "help" } },
  ]);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll and auto-focus when chat opens or a new message arrives
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
      departments,
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
      {/* ── Floating bubble (chat closed) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center group"
          title="Allocation Assistant"
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 animate-ping" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-xl shadow-indigo-900/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare size={20} className="text-white" />
            </div>
          </div>
        </button>
      )}

      {/* ── Chat window (chat open) ── */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/40"
          style={{ height: "500px" }}
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
                  Ask about teachers & allocations
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
                placeholder="Ask anything about allocations…"
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
