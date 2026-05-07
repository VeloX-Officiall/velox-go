import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Heart, Phone, MapPin, MessageCircle, Hash, Image as ImageIcon, Navigation } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calcDeliveryFee, formatAzn } from "@/lib/pricing";

export const Route = createFileRoute("/customer")({
  head: () => ({ meta: [{ title: "Customer · VeloX" }] }),
  component: CustomerDashboard,
});

const feed = [
  {
    id: 1,
    store: "Bravo Market",
    title: "Təzə meyvə-tərəvəz endirimi 🥦",
    desc: "Bu həftə bütün təzə tərəvəzlərdə 20% endirim. Çatdırılma 1 saat.",
    tags: ["endirim", "təzə", "market"],
    location: "Nizami küç. 23",
    likes: 124,
  },
  {
    id: 2,
    store: "Pizza Inn",
    title: "İkili Margherita kombosu 🍕🍕",
    desc: "İki nəfərlik ailə pizza kombosu cəmi 18 AZN. Sürətli çatdırılma.",
    tags: ["pizza", "kombo"],
    location: "Fountain Square",
    likes: 89,
  },
  {
    id: 3,
    store: "Çiçək Evi",
    title: "Romantik buket 🌹",
    desc: "Sevdiyiniz insana sürpriz — 30 dəqiqəyə qapınızda.",
    tags: ["çiçək", "hədiyyə"],
    location: "İçərişəhər",
    likes: 56,
  },
];

function CustomerDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"explore" | "anything">("explore");
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [note, setNote] = useState("");
  const [distance, setDistance] = useState(3);
  const [submitted, setSubmitted] = useState(false);
  const fee = calcDeliveryFee(distance);

  const submit = () => {
    if (!pickup || !dropoff) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setPickup(""); setDropoff(""); setNote("");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("customer_dash")} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 inline-flex rounded-2xl border border-border bg-card p-1 shadow-card">
          <button
            onClick={() => setTab("explore")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === "explore" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
          >
            {t("explore")}
          </button>
          <button
            onClick={() => setTab("anything")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === "anything" ? "bg-success text-success-foreground shadow" : "text-muted-foreground"}`}
          >
            {t("get_anything")}
          </button>
        </div>

        {tab === "explore" && (
          <div className="space-y-5">
            {feed.map((p) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground">
                    {p.store.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{p.store}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </div>
                  </div>
                </div>
                <div className="flex h-52 items-center justify-center bg-gradient-to-br from-accent via-background to-success/20">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Hash className="h-3 w-3" />{tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => setLiked((l) => ({ ...l, [p.id]: !l[p.id] }))}
                      className={`flex items-center gap-1.5 text-sm font-semibold transition ${liked[p.id] ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      <Heart className={`h-5 w-5 ${liked[p.id] ? "fill-current" : ""}`} /> {p.likes + (liked[p.id] ? 1 : 0)}
                    </button>
                    <button className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <MessageCircle className="h-5 w-5" /> {t("comment")}
                    </button>
                    <Button className="ml-auto h-11 gap-2 rounded-xl bg-success text-success-foreground hover:bg-success/90">
                      <Phone className="h-4 w-4" /> {t("call_store")}
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {tab === "anything" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-success text-success-foreground">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t("get_anything")}</h2>
                <p className="text-sm text-muted-foreground">{t("get_anything_desc")}</p>
              </div>
            </div>

            {/* Mock map */}
            <div className="relative my-5 h-56 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent via-background to-success/10">
              <div className="absolute left-[20%] top-[35%] flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground shadow-elevated">A</div>
                <div className="mt-1 text-xs font-semibold">Pickup</div>
              </div>
              <div className="absolute right-[20%] bottom-[20%] flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-elevated">B</div>
                <div className="mt-1 text-xs font-semibold">Drop-off</div>
              </div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 220" preserveAspectRatio="none">
                <path d="M 90 90 Q 200 40 320 170" stroke="hsl(217 91% 35%)" strokeWidth="3" strokeDasharray="6 6" fill="none" opacity="0.5" />
              </svg>
            </div>

            <div className="space-y-3">
              <Input placeholder={t("pickup")} value={pickup} onChange={(e) => setPickup(e.target.value)} className="h-12 rounded-xl" />
              <Input placeholder={t("dropoff")} value={dropoff} onChange={(e) => setDropoff(e.target.value)} className="h-12 rounded-xl" />
              <Textarea placeholder="Qeyd (məs. paketin təsviri)" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[80px] rounded-xl" />
              <Button onClick={submit} className="h-12 w-full rounded-xl bg-gradient-hero text-base font-bold">
                {t("request_delivery")}
              </Button>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl bg-success/15 p-3 text-center text-sm font-semibold text-success"
                >
                  ✓ Sorğunuz kuryerlərə göndərildi
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
