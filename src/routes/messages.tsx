import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Mesajlar · VeloX" }] }),
  component: () => <RequireAuth><MessagesPage /></RequireAuth>,
});

type Conv = { id: string; user_a: string; user_b: string; other?: { id: string; full_name: string | null } };
type Msg = { id: string; sender_id: string; body: string; created_at: string };

function MessagesPage() {
  const { user } = useAuthSession();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });
      const list = (data || []) as Conv[];
      // hydrate other-user names
      const otherIds = list.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
      if (otherIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", otherIds);
        const map = new Map((profs || []).map((p) => [p.id, p]));
        list.forEach((c) => {
          const oid = c.user_a === user.id ? c.user_b : c.user_a;
          c.other = (map.get(oid) as any) || { id: oid, full_name: "İstifadəçi" };
        });
      }
      setConvs(list);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", active.id)
        .order("created_at", { ascending: true });
      setMsgs((data || []) as Msg[]);
    })();
    const channel = supabase
      .channel(`msg-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${active.id}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!text.trim() || !active || !user) return;
    await supabase.from("messages").insert({ conversation_id: active.id, sender_id: user.id, body: text.trim() });
    setText("");
  }

  async function startConvByEmail() {
    if (!user || !newEmail.trim()) return;
    // find user by profile full_name match would need email; we'll match profiles by id via auth — fallback: search by full_name
    const { data: profs } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${newEmail.trim()}%`).limit(1);
    const other = profs?.[0];
    if (!other || other.id === user.id) { alert("İstifadəçi tapılmadı"); return; }
    const [a, b] = [user.id, other.id].sort();
    const { data: existing } = await supabase.from("conversations").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
    let conv = existing as Conv | null;
    if (!conv) {
      const { data: created } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select().single();
      conv = created as Conv;
    }
    if (conv) {
      conv.other = other as any;
      setConvs((c) => [conv!, ...c.filter((x) => x.id !== conv!.id)]);
      setActive(conv);
      setNewEmail("");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Mesajlar" />
      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6 md:grid-cols-3">
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-card md:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><MessageCircle className="h-4 w-4" /> Söhbətlər</h2>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Ad ilə axtar..." value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-9 rounded-lg" />
            <Button onClick={startConvByEmail} className="h-9 rounded-lg">+</Button>
          </div>
          <div className="space-y-1">
            {convs.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Söhbət yoxdur</p>}
            {convs.map((c) => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition ${active?.id === c.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(c.other?.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{c.other?.full_name || "İstifadəçi"}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="flex h-[560px] flex-col rounded-2xl border border-border bg-card shadow-card md:col-span-2">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Söhbət seçin</div>
          ) : (
            <>
              <div className="border-b border-border p-4 font-semibold">{active.other?.full_name || "İstifadəçi"}</div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                      {m.body}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex gap-2 border-t border-border p-3">
                <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Mesaj..." className="h-10 rounded-xl" />
                <Button onClick={send} className="h-10 rounded-xl px-4"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </section>
        <p className="md:col-span-3 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">Ana səhifə</Link>
        </p>
      </main>
    </div>
  );
}
