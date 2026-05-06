import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Wallet, Plus, MapPin, Lock, Send, Users, Clock, Package } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/courier")({
  head: () => ({ meta: [{ title: "Courier · VeloX" }] }),
  component: CourierDashboard,
});

const sampleOrders = [
  { id: 1, store: "Bravo Market", from: "Nizami küç. 23", to: "Yasamal, Həsən bəy 14", price: "8 AZN", dist: "2.4 km" },
  { id: 2, store: "Aptek Plus", from: "28 May metro", to: "Nərimanov, Atatürk 88", price: "5 AZN", dist: "3.1 km" },
  { id: 3, store: "Pizza Inn", from: "Fountain Square", to: "Sahil bağı", price: "12 AZN", dist: "1.2 km" },
  { id: 4, store: "Çiçək Evi", from: "İçərişəhər", to: "Xətai r., Babək pr.", price: "10 AZN", dist: "4.6 km" },
];

function CourierDashboard() {
  const { t } = useTranslation();
  const [balance, setBalance] = useState(4.5);
  const [dayActive, setDayActive] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const startDay = () => {
    if (balance < 1) return;
    setBalance((b) => +(b - 1).toFixed(2));
    setDayActive(true);
    setEndsAt(Date.now() + 24 * 3600 * 1000);
  };

  const hoursLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 3600_000)) : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("courier_dash")} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Daily Pass */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
          >
            <div className={`relative p-6 ${dayActive ? "bg-gradient-success text-success-foreground" : "bg-gradient-hero text-primary-foreground"}`}>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider opacity-80">{t("daily_pass")}</div>
                  <div className="mt-1 text-2xl font-bold">
                    {dayActive ? `${t("day_active")} · ${hoursLeft}h ${t("hours_left")}` : t("daily_pass_desc")}
                  </div>
                </div>
                {dayActive ? (
                  <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
                    <Clock className="h-4 w-4" /> {hoursLeft}h
                  </div>
                ) : (
                  <Button
                    onClick={startDay}
                    disabled={balance < 1}
                    className="h-12 gap-2 rounded-xl bg-white px-6 text-base font-bold text-primary hover:bg-white/90"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    {t("start_day")}
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
              <Button
                variant="outline"
                onClick={() => setBalance((b) => +(b + 5).toFixed(2))}
                className="h-11 gap-2 rounded-xl"
              >
                <Plus className="h-4 w-4" /> {t("top_up")} 5
              </Button>
            </div>
          </motion.div>

          {/* Orders */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Package className="h-5 w-5 text-primary" />
                {t("orders_nearby")}
              </h2>
              {!dayActive && (
                <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
                  <Lock className="h-3.5 w-3.5" /> {t("orders_locked")}
                </span>
              )}
            </div>
            <div className={`relative grid gap-3 ${!dayActive ? "pointer-events-none" : ""}`}>
              {sampleOrders.map((o) => (
                <div
                  key={o.id}
                  className={`flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 transition ${!dayActive ? "blur-sm" : "hover:border-primary/40"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{o.store}</span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">{o.dist}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-success" /> {o.from}</div>
                      <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-warning" /> {o.to}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-success">{o.price}</div>
                    <Button size="sm" className="mt-2 rounded-lg">Götür</Button>
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

        {/* Brotherhood Chat */}
        <BrotherhoodChat />
      </main>
    </div>
  );
}

function BrotherhoodChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    { id: 1, user: "Elvin", text: "Salam qardaşlar, Yasamalda trafik çoxdur 🚦", mine: false },
    { id: 2, user: "Rauf", text: "28 May tərəfdən gəl, daha rahatdır 👍", mine: false },
    { id: 3, user: "Sən", text: "Sağ ol, qardaş!", mine: true },
  ]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), user: "Sən", text: text.trim(), mine: true }]);
    setText("");
  };

  return (
    <aside className="flex h-[640px] flex-col rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Users className="h-5 w-5 text-success" /> {t("brotherhood")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-success" />
            142 {t("online_couriers")}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.mine ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                {!m.mine && <div className="mb-0.5 text-xs font-semibold opacity-70">{m.user}</div>}
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("send_message")}
          className="h-11 rounded-xl"
        />
        <Button onClick={send} className="h-11 rounded-xl px-4">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
