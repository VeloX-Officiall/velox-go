import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Wallet, Plus, MapPin, Lock, Send, Users, Clock, Package, Radio } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CardCheckout } from "@/components/CardCheckout";
import { usePresenceHeartbeat, useOnlineCount } from "@/lib/usePresence";
import { useCourierTracking } from "@/lib/useCourierTracking";

export const Route = createFileRoute("/courier")({
  head: () => ({ meta: [{ title: "Courier · VeloX" }] }),
  component: () => <RequireAuth><CourierDashboard /></RequireAuth>,
});

type Order = {
  id: string; pickup_label: string | null; drop_label: string | null;
  distance_km: number | null; fee_azn: number | null; status: string;
  store_id: string | null; customer_id: string;
};

function CourierDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  usePresenceHeartbeat();
  const [balance, setBalance] = useState(0);
  const [dayActive, setDayActive] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [orders, setOrders] = useState<Order[]>([]);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("5");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Live GPS streaming while day is active
  useCourierTracking(dayActive);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    let { data } = await supabase.from("courier_wallet").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) {
      await supabase.from("courier_wallet").insert({ user_id: user.id, balance_azn: 0 });
      data = { user_id: user.id, balance_azn: 0, day_pass_until: null, updated_at: new Date().toISOString() };
    }
    setBalance(Number(data.balance_azn) || 0);
    if (data.day_pass_until) {
      const ts = new Date(data.day_pass_until).getTime();
      if (ts > Date.now()) { setDayActive(true); setEndsAt(ts); }
      else {
        setDayActive(false); setEndsAt(null);
        // auto-reset profile status when 24h elapsed
        await supabase.from("profiles").update({ status: "offline", is_online: false } as never).eq("id", user.id);
      }
    } else { setDayActive(false); setEndsAt(null); }
  }, [user?.id]);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders").select("*")
      .in("status", ["ready", "pending"])
      .is("courier_id", null)
      .order("created_at", { ascending: false }).limit(30);
    setOrders((data as Order[]) || []);
  }, []);

  useEffect(() => { loadWallet(); loadOrders(); }, [loadWallet, loadOrders]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const ch = supabase.channel("courier-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadOrders]);

  // Auto re-evaluate day expiry every minute
  useEffect(() => {
    if (!dayActive || !endsAt) return;
    if (Date.now() >= endsAt) { loadWallet(); }
  }, [now, dayActive, endsAt, loadWallet]);

  const startDay = async () => {
    if (!user) return;
    if (balance < 1) { toast.error(t("err_balance_low")); return; }
    const { data, error } = await supabase.rpc("start_courier_day" as never);
    if (error) {
      const msg = (error.message || "").includes("insufficient_balance")
        ? t("err_balance_low") : error.message;
      toast.error(msg); return;
    }
    const expires = (data as { expires_at?: string })?.expires_at;
    if (expires) setEndsAt(new Date(expires).getTime());
    setDayActive(true);
    setBalance((b) => +(b - 1).toFixed(2));
    toast.success(t("ok_started_day"));
  };

  const finalizeTopUp = async (last4: string) => {
    if (!user) return;
    const amt = parseFloat(topUpAmount);
    const newBal = +(balance + amt).toFixed(2);
    const { error } = await supabase.from("courier_wallet").update({ balance_azn: newBal }).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("transactions").insert({
      user_id: user.id, amount_azn: amt, status: "success",
      card_last4: last4, kind: "topup",
    });
    setBalance(newBal);
    toast.success(`+${amt} AZN`);
  };

  const openCheckout = () => {
    const amt = parseFloat(topUpAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error(t("invalid_card")); return; }
    setTopUpOpen(false);
    setCheckoutOpen(true);
  };

  const acceptOrder = async (o: Order) => {
    if (!user) return;
    if (!dayActive) { toast.error(t("start_day_first")); return; }
    const { error } = await supabase.from("orders")
      .update({ courier_id: user.id, status: "accepted" }).eq("id", o.id).is("courier_id", null);
    if (error) { toast.error(error.message); return; }
    toast.success(t("ok_order_taken"));
    loadOrders();
  };

  const hoursLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 3600_000)) : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("courier_dash")} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 pb-24 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className={`relative p-6 ${dayActive ? "bg-gradient-success text-success-foreground" : "bg-gradient-hero text-primary-foreground"}`}>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider opacity-80">{t("daily_pass")}</div>
                  <div className="mt-1 text-2xl font-bold">
                    {dayActive ? `${t("day_active")} · ${hoursLeft}h ${t("hours_left")}` : t("daily_pass_desc")}
                  </div>
                  {dayActive && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                      <Radio className="h-3 w-3 animate-pulse" /> GPS yayım aktiv
                    </div>
                  )}
                </div>
                {dayActive ? (
                  <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
                    <Clock className="h-4 w-4" /> {hoursLeft}h
                  </div>
                ) : (
                  <Button onClick={startDay} disabled={balance < 1}
                    className="h-12 gap-2 rounded-xl bg-white px-6 text-base font-bold text-primary hover:bg-white/90">
                    <Play className="h-5 w-5 fill-current" />
                    {t("start_day")} (1 AZN)
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("balance")}</div>
                  <div className="text-xl font-bold">{balance.toFixed(2)} AZN</div>
                </div>
              </div>
              <Button onClick={() => setTopUpOpen(true)} className="h-11 gap-2 rounded-xl bg-gradient-hero shadow-glow">
                <Plus className="h-4 w-4" /> {t("top_up_balance")}
              </Button>
            </div>
          </motion.div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Package className="h-5 w-5 text-primary" />
                {t("orders_nearby")}
              </h2>
              {!dayActive && (
                <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                  <Lock className="h-3.5 w-3.5" /> {t("orders_locked")}
                </span>
              )}
            </div>
            <div className={`relative grid gap-3 ${!dayActive ? "pointer-events-none" : ""}`}>
              {orders.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("no_pending")}</p>
              )}
              {orders.map((o) => (
                <div key={o.id}
                  className={`flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 transition ${!dayActive ? "blur-sm" : "hover:border-primary/40 hover:shadow-glow"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{o.id.slice(0, 6)}</span>
                      {o.distance_km && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">{o.distance_km} km</span>}
                      {o.status === "ready" && <span className="rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-bold text-success">{t("ready")}</span>}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-success" /> {o.pickup_label || "A"}</div>
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-warning" /> {o.drop_label || "B"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-success">{o.fee_azn ? `${o.fee_azn} AZN` : "—"}</div>
                    <Button size="sm" onClick={() => acceptOrder(o)} className="mt-2 rounded-lg">{t("take")}</Button>
                  </div>
                </div>
              ))}
              {!dayActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-2xl bg-card/95 px-6 py-4 text-center shadow-elevated">
                    <Lock className="mx-auto h-6 w-6 text-warning" />
                    <p className="mt-2 text-sm font-semibold">{t("orders_locked")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <BrotherhoodChat />
      </main>
      <BottomNav />

      {/* Top up amount picker */}
      {topUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h3 className="mb-4 text-lg font-bold">{t("top_up_balance")}</h3>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("amount")} (AZN)</label>
            <Input type="number" min="1" step="0.5" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="h-11 rounded-xl" />
            <div className="mt-2 flex gap-2">
              {[1, 5, 10, 20].map((v) => (
                <button key={v} onClick={() => setTopUpAmount(String(v))}
                  className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold hover:border-primary">
                  {v} AZN
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setTopUpOpen(false)}>{t("cancel")}</Button>
              <Button className="flex-1 bg-gradient-hero shadow-glow" onClick={openCheckout}>{t("pay_now")}</Button>
            </div>
          </div>
        </div>
      )}

      <CardCheckout open={checkoutOpen} onOpenChange={setCheckoutOpen}
        amount={parseFloat(topUpAmount) || 0} onSuccess={finalizeTopUp} />
    </div>
  );
}

type ChatMsg = { id: string; user_id: string; body: string; created_at: string };

function BrotherhoodChat() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const onlineCount = useOnlineCount();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const resolveNames = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => id && !(id in names));
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, full_name, username").in("id", missing);
    if (data) {
      setNames((prev) => {
        const next = { ...prev };
        for (const p of data as { id: string; full_name: string | null; username: string | null }[]) {
          next[p.id] = p.full_name || p.username || "—";
        }
        return next;
      });
    }
  }, [names]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("community_chat" as never).select("*").order("created_at", { ascending: true }).limit(100);
      if (cancelled || !data) return;
      setMessages(data as ChatMsg[]);
      resolveNames(Array.from(new Set((data as ChatMsg[]).map((m) => m.user_id))));
    })();
    const ch = supabase.channel("community-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_chat" }, (payload) => {
        const m = payload.new as ChatMsg;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        resolveNames([m.user_id]);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [resolveNames]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setText("");
    const { error } = await supabase.from("community_chat" as never).insert({ user_id: user.id, body } as never);
    setSending(false);
    if (error) { toast.error(error.message); setText(body); }
  };

  return (
    <aside className="flex h-[640px] flex-col rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Users className="h-5 w-5 text-success" /> {t("brotherhood")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${onlineCount > 0 ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
            {onlineCount} {t("online_now")}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                  {!mine && <div className="mb-0.5 text-xs font-semibold opacity-70">{names[m.user_id] || "—"}</div>}
                  {m.body}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)}
          disabled={sending} placeholder={t("send_message")} className="h-11 rounded-xl" />
        <Button type="submit" disabled={sending || !text.trim()} className="h-11 rounded-xl px-4">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  );
}
