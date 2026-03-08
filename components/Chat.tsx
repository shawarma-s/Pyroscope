"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  threadId: string | null;
  onThreadId: (id: string) => void;
}

export function Chat({ threadId, onThreadId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolCallNotice, setToolCallNotice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ensureThread(): Promise<string> {
    if (threadId) return threadId;
    const res = await fetch("/api/thread", { method: "POST" });
    if (!res.ok) throw new Error("Failed to create thread");
    const data = await res.json();
    onThreadId(data.thread_id);
    return data.thread_id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    setToolCallNotice(false);
    try {
      const tid = await ensureThread();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, thread_id: tid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (data.tool_calls_used) setToolCallNotice(true);
      setMessages((m) => [...m, { role: "assistant", content: data.content || "(No response)" }]);
      if (data.thread_id && !threadId) onThreadId(data.thread_id);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}. Check BACKBOARD_API_KEY and BACKBOARD_ASSISTANT_ID.` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="text-slate-400 text-center py-8 space-y-2">
            <p>Ask about active fires, predictions, or training.</p>
            <p className="text-sm">e.g. &quot;What active fires are there?&quot; or &quot;How will the Pine Ridge Fire spread?&quot;</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-amber-600/90 text-white"
                  : "bg-slate-800 text-slate-100 border border-slate-700"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-400 text-sm">
              {toolCallNotice ? "Checking fire data…" : "Thinking…"}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about fires, predictions, or start training..."
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
