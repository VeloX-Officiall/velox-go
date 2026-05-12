import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Heart, MessageCircle, MapPin, Hash, Image as ImageIcon, BadgeCheck } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [{ title: "Store · VeloX" }] }),
  component: () => <RequireAuth><StoreDashboard /></RequireAuth>,
});

type Post = {
  id: string; title: string; description: string | null;
  tags: string[] | null; location: string | null; image_url: string | null;
  created_at: string;
};

function StoreDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [verified, setVerified] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", description: "", tags: "", location: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: rows }, { data: prof }] = await Promise.all([
      supabase.from("posts").select("*").eq("author_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("verified").eq("id", user.id).maybeSingle(),
    ]);
    setPosts((rows as Post[]) || []);
    setVerified(!!prof?.verified);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const createPost = async () => {
    if (!user || !postForm.title.trim()) return;
    const tags = postForm.tags.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: postForm.title,
      description: postForm.description || null,
      tags,
      location: postForm.location || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Paylaşım əlavə olundu");
    setPostForm({ title: "", description: "", tags: "", location: "" });
    load();
  };

  const deletePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("store_dash")} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Aktiv elanlar" value={posts.length.toString()} tone="primary" />
          <div className={`rounded-2xl p-5 shadow-card ${verified ? "bg-gradient-success text-success-foreground" : "bg-card border border-border"}`}>
            <div className="text-xs font-medium uppercase tracking-wider opacity-80">Status</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-bold">
              {verified ? <><BadgeCheck className="h-6 w-6" /> {t("verified_badge")}</> : "Yeni mağaza"}
            </div>
            <div className="mt-1 text-xs opacity-70">{verified ? "100+ sifariş / ay" : "100 sifariş tamamlandıqda göy tik aktivləşir"}</div>
          </div>
          <StatCard label="Bu ay sifariş" value="—" tone="success" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <Plus className="h-5 w-5 text-primary" /> {t("new_post")}
              </h2>
              <div className="space-y-3">
                <Input placeholder="Başlıq" value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} className="h-11 rounded-xl" />
                <Textarea placeholder="Təsvir..." value={postForm.description} onChange={(e) => setPostForm({ ...postForm, description: e.target.value })} className="min-h-[80px] rounded-xl" />
                <Input placeholder="Ünvan / lokasiya" value={postForm.location} onChange={(e) => setPostForm({ ...postForm, location: e.target.value })} className="h-11 rounded-xl" />
                <Input placeholder="hashtag, endirim, təzə" value={postForm.tags} onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })} className="h-11 rounded-xl" />
                <Button onClick={createPost} className="h-11 w-full rounded-xl">{t("create")}</Button>
              </div>
            </div>

            {posts.map((p) => (
              <motion.article key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex h-44 items-center justify-center bg-gradient-to-br from-accent via-background to-success/20">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  {p.description && <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>}
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                          <Hash className="h-3 w-3" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                    {p.location ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {p.location}
                      </div>
                    ) : <span />}
                    <button onClick={() => deletePost(p.id)} className="text-xs font-semibold text-destructive hover:underline">Sil</button>
                  </div>
                </div>
              </motion.article>
            ))}
          </section>

          <aside className="space-y-5">
            <StoreOrders userId={user?.id} />
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-bold">Necə işləyir?</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Paylaşımlar müştərilərə dərhal görünür.</li>
                <li>• "Hazırdır" yalnız mal həqiqətən hazırdırsa basın.</li>
                <li>• 30 gündə 100 sifariş = göy tik (✓).</li>
                <li>• 0% komissiya — qazanc tam sənindir.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StoreOrders({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [confirmOrder, setConfirmOrder] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("orders").select("*")
      .eq("store_id", userId).in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false }).limit(20);
    setOrders(data || []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel("store-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markReady = async (id: string) => {
    const { error } = await supabase.from("orders")
      .update({ status: "ready", ready_at: new Date().toISOString() }).eq("id", id);
    setConfirmOrder(null);
    if (error) toast.error(error.message);
    else toast.success("Kuryerə bildirildi ✓");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-3 font-bold">{t("pending_orders")}</h3>
      {orders.length === 0 && <p className="text-xs text-muted-foreground">{t("no_pending")}</p>}
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 6)}</span>
              <span className="text-xs font-semibold text-warning">{o.status}</span>
            </div>
            <div className="mt-2 text-sm">{o.fee_azn ? `${o.fee_azn} AZN` : ""}</div>
            <Button size="sm" onClick={() => setConfirmOrder(o)}
              className="mt-2 w-full rounded-lg bg-gradient-success">
              {t("mark_ready")}
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={!!confirmOrder} onOpenChange={(v) => !v && setConfirmOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("mark_ready")}?</DialogTitle></DialogHeader>
          <p className="text-sm text-warning">⚠️ {t("ready_warning")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOrder(null)}>{t("cancel")}</Button>
            <Button onClick={() => markReady(confirmOrder.id)} className="bg-gradient-success">{t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
