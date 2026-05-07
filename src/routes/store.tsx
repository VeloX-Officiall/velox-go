import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Heart, MessageCircle, MapPin, Hash, CheckCircle2, AlertTriangle, Image as ImageIcon } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { RequireAuth } from "@/lib/auth";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [{ title: "Store · VeloX" }] }),
  component: () => <RequireAuth><StoreDashboard /></RequireAuth>,
});

const initialPosts = [
  {
    id: 1,
    title: "Təzə Margherita pizza 🍕",
    desc: "Əl ilə hazırlanmış xəmir, italyan mozzarella. Yalnız bu gün — 9.90 AZN!",
    tags: ["pizza", "endirim", "təzə"],
    location: "Nizami küç. 23",
    likes: 42,
    comments: 7,
  },
  {
    id: 2,
    title: "Yeni qış kolleksiyası ❄️",
    desc: "Qadın paltoları artıq mağazamızda. Çatdırılma 24 saat ərzində.",
    tags: ["geyim", "qış", "yeni"],
    location: "28 Mall, 2-ci mərtəbə",
    likes: 18,
    comments: 3,
  },
];

const initialDebts = [
  { id: 1, courier: "Rauf M.", amount: 24.5, orders: 3 },
  { id: 2, courier: "Elvin S.", amount: 12.0, orders: 1 },
  { id: 3, courier: "Tural H.", amount: 36.8, orders: 4 },
];

function StoreDashboard() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState(initialPosts);
  const [debts, setDebts] = useState(initialDebts);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", price: "" });
  const [postForm, setPostForm] = useState({ title: "", desc: "", tags: "" });

  const createPost = () => {
    if (!postForm.title.trim()) return;
    setPosts((p) => [
      {
        id: Date.now(),
        title: postForm.title,
        desc: postForm.desc,
        tags: postForm.tags.split(",").map((s) => s.trim()).filter(Boolean),
        location: "Mağazam",
        likes: 0,
        comments: 0,
      },
      ...p,
    ]);
    setPostForm({ title: "", desc: "", tags: "" });
  };

  const createOrder = () => {
    if (!orderForm.name || !orderForm.price) return;
    const amount = parseFloat(orderForm.price);
    if (isNaN(amount)) return;
    setDebts((d) => [
      ...d,
      { id: Date.now(), courier: "Yeni kuryer (gözləyir)", amount, orders: 1 },
    ]);
    setOrderForm({ name: "", phone: "", address: "", price: "" });
  };

  const settle = (id: number) => setDebts((d) => d.filter((x) => x.id !== id));

  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("store_dash")} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Top stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Aktiv elanlar" value={posts.length.toString()} tone="primary" />
          <StatCard label="Açıq borc" value={`${totalDebt.toFixed(2)} AZN`} tone="warning" />
          <StatCard label="Bu gün sifariş" value="14" tone="success" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Posts */}
          <section className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <Plus className="h-5 w-5 text-primary" /> {t("new_post")}
              </h2>
              <div className="space-y-3">
                <Input
                  placeholder="Başlıq"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  className="h-11 rounded-xl"
                />
                <Textarea
                  placeholder="Təsvir..."
                  value={postForm.desc}
                  onChange={(e) => setPostForm({ ...postForm, desc: e.target.value })}
                  className="min-h-[80px] rounded-xl"
                />
                <Input
                  placeholder="#hashtag, #endirim"
                  value={postForm.tags}
                  onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                  className="h-11 rounded-xl"
                />
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-11 gap-2 rounded-xl">
                    <ImageIcon className="h-4 w-4" /> Şəkil/Video
                  </Button>
                  <Button onClick={createPost} className="h-11 flex-1 rounded-xl">
                    {t("create")}
                  </Button>
                </div>
              </div>
            </div>

            {posts.map((p) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="flex h-44 items-center justify-center bg-gradient-to-br from-accent via-background to-success/20">
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
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {p.location}
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1.5 text-muted-foreground transition hover:text-destructive">
                        <Heart className="h-4 w-4" /> {p.likes}
                      </button>
                      <button className="flex items-center gap-1.5 text-muted-foreground transition hover:text-primary">
                        <MessageCircle className="h-4 w-4" /> {p.comments}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </section>

          {/* Orders + Debts */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 font-bold">{t("new_order")}</h2>
              <div className="space-y-3">
                <Input placeholder={t("customer_name")} value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} className="h-11 rounded-xl" />
                <Input placeholder={t("phone")} value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })} className="h-11 rounded-xl" />
                <Input placeholder={t("address")} value={orderForm.address} onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })} className="h-11 rounded-xl" />
                <Input placeholder={`${t("price")} (AZN)`} type="number" value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })} className="h-11 rounded-xl" />
                <Button onClick={createOrder} className="h-11 w-full rounded-xl bg-success text-success-foreground hover:bg-success/90">
                  {t("create")}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <AlertTriangle className="h-5 w-5 text-warning" /> {t("debt_tracker")}
              </h2>
              {debts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("no_debt")}</p>
              ) : (
                <div className="space-y-2">
                  {debts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{d.courier}</div>
                        <div className="text-xs text-muted-foreground">{d.orders} sifariş</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-warning">{d.amount.toFixed(2)} AZN</div>
                        <button
                          onClick={() => settle(d.id)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> {t("confirm_paid")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" }) {
  const cls = {
    primary: "bg-gradient-hero text-primary-foreground",
    success: "bg-gradient-success text-success-foreground",
    warning: "bg-card text-warning border border-warning/30",
  }[tone];
  return (
    <div className={`rounded-2xl p-5 shadow-card ${cls}`}>
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
