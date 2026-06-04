import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export function SupportBot() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: t("bot_greeting") },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // Position: distance from top-left corner; default to bottom-right
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef<{ ox: number; oy: number; moved: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 768;
    const saved = localStorage.getItem("velox.bot.pos");
    // On mobile, place above the bottom navigation (~80px tall) so it's always visible.
    const defaultY = isMobile ? window.innerHeight - 160 : window.innerHeight - 88;
    const defaultX = window.innerWidth - 76;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setPos({
          x: Math.min(Math.max(8, p.x), window.innerWidth - 64),
          y: Math.min(Math.max(8, p.y), window.innerHeight - (isMobile ? 96 : 72)),
        });
      } catch { setPos({ x: defaultX, y: defaultY }); }
    } else {
      setPos({ x: defaultX, y: defaultY });
    }
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  function onPointerDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = draggingRef.current;
    if (!d) return;
    d.moved = true;
    const x = Math.min(Math.max(0, e.clientX - d.ox), window.innerWidth - 56);
    const y = Math.min(Math.max(0, e.clientY - d.oy), window.innerHeight - 56);
    setPos({ x, y });
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = draggingRef.current;
    draggingRef.current = null;
    if (d?.moved && pos) {
      localStorage.setItem("velox.bot.pos", JSON.stringify(pos));
    } else {
      setOpen((v) => !v);
    }
  }

  async function send() {
    const txt = text.trim();
    if (!txt || busy) return;
    const next = [...msgs, { role: "user" as const, content: txt }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-support", { body: { messages: next, language: i18n.language || "az" } });
      if (error) throw error;
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "..." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: t("bot_unavailable") }]);
    } finally {
      setBusy(false);
    }
  }

  if (!pos) return null;

  // Panel position: above-left of button when there's room
  const panelStyle: React.CSSProperties = {
    left: Math.min(pos.x, window.innerWidth - 360),
    top: Math.max(10, pos.y - 480),
  };

  return (
    <>
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="fixed z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-elevated transition active:cursor-grabbing"
        aria-label={t("bot_label")}
      >
        {open ? <X className="pointer-events-none h-6 w-6" /> : <MessageSquare className="pointer-events-none h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={panelStyle}
            className="fixed z-50 flex h-[460px] w-[340px] max-w-[calc(100vw-1.25rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
          >
            <div className="flex items-center gap-3 border-b border-border bg-gradient-hero p-4 text-primary-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"><Bot className="h-5 w-5" /></div>
              <div>
                <div className="font-bold">{t("bot_title")}</div>
                <div className="text-xs opacity-80">{t("bot_subtitle")}</div>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="rounded-2xl bg-accent px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("bot_placeholder")}
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={send} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
