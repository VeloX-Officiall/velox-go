import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Heart, Phone, MapPin, MessageCircle, Hash, Image as ImageIcon, Navigation, BadgeCheck } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calcDeliveryFee, formatAzn, haversineKm } from "@/lib/pricing";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MapPicker, type LatLng } from "@/components/MapPicker";
import { toast } from "sonner";

export const Route = createFileRoute("/customer")({
  head: () => ({ meta: [{ title: "Customer · VeloX" }] }),
  component: () => <RequireAuth><CustomerDashboard /></RequireAuth>,
});

type Post = {
  id: string;
  author_id: string;
  author_role: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  location: string | null;
  image_url: string | null;
  created_at: string;
  store?: { full_name: string | null; verified: boolean; phone: string | null };
  likes_count: number;
  liked_by_me: boolean;
};

type FeedFilter = "store" | "customer" | "courier";

function CustomerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [tab, setTab] = useState<"explore" | "anything">("explore");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("store");
  const [posts, setPosts] = useState<Post[]>([]);
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [routeKm, setRouteKm] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", description: "", location: "" });

  const distance = routeKm ?? (pickup && dropoff ? haversineKm(pickup, dropoff) : 0);
  const fee = distance > 0 ? calcDeliveryFee(distance) : 0;

  const loadPosts = useCallback(async () => {
    const { data: rows } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!rows) return;
    const ids = rows.map((r) => r.id);
    const storeIds = [...new Set(rows.map((r) => r.author_id))];
    const [{ data: likes }, { data: profs }, { data: myLikes }] = await Promise.all([
      supabase.from("post_likes").select("post_id").in("post_id", ids),
      supabase.from("profiles").select("id, full_name, verified, phone").in("id", storeIds),
      user ? supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", user.id) : Promise.resolve({ data: [] as any }),
    ]);
    const likesMap = new Map<string, number>();
    likes?.forEach((l: any) => likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1));
    const mySet = new Set((myLikes || []).map((l: any) => l.post_id));
    const profMap = new Map<string, any>();
    profs?.forEach((p: any) => profMap.set(p.id, p));
    setPosts(rows.map((r: any) => ({
      ...r,
      store: profMap.get(r.author_id),
      likes_count: likesMap.get(r.id) || 0,
      liked_by_me: mySet.has(r.id),
    })));
  }, [user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Realtime: refresh likes & posts on changes
  useEffect(() => {
    const ch = supabase
      .channel("public-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => loadPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadPosts]);

  async function toggleLike(p: Post) {
    if (!user) return;
    if (p.liked_by_me) {
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, liked_by_me: false, likes_count: Math.max(0, x.likes_count - 1) } : x));
      await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", user.id);
    } else {
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, liked_by_me: true, likes_count: x.likes_count + 1 } : x));
      const { error } = await supabase.from("post_likes").insert({ post_id: p.id, user_id: user.id });
      if (error) loadPosts();
    }
  }

  async function submitOrder() {
    if (!user || !pickup || !dropoff) return;
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      customer_id: user.id,
      pickup_lat: pickup.lat, pickup_lng: pickup.lng,
      drop_lat: dropoff.lat, drop_lng: dropoff.lng,
      distance_km: +distance.toFixed(2),
      fee_azn: fee,
      note: note || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("✓ Sorğunuz kuryerlərə göndərildi");
    setPickup(null); setDropoff(null); setNote("");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("customer_dash")} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 inline-flex rounded-2xl border border-border bg-card p-1 shadow-card">
          <button onClick={() => setTab("explore")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === "explore" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
            {t("explore")}
          </button>
          <button onClick={() => setTab("anything")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${tab === "anything" ? "bg-success text-success-foreground shadow" : "text-muted-foreground"}`}>
            {t("get_anything")}
          </button>
        </div>

        {tab === "explore" && (
          <div className="space-y-5">
            <div className="inline-flex w-full rounded-xl border border-border bg-card p-1 shadow-card">
              {(["store", "customer", "courier"] as FeedFilter[]).map((f) => (
                <button key={f} onClick={() => setFeedFilter(f)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${feedFilter === f ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
                  {t(f === "store" ? "role_store" : f === "customer" ? "role_customer" : "role_courier")}
                </button>
              ))}
            </div>
            {user && feedFilter !== "courier" && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">{t("share_post")}</div>
                <div className="space-y-2">
                  <Input placeholder={t("title")} value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} className="h-10 rounded-xl" />
                  <Textarea placeholder={t("description")} value={postForm.description} onChange={(e) => setPostForm({ ...postForm, description: e.target.value })} className="min-h-[60px] rounded-xl" />
                  <Input placeholder={t("address")} value={postForm.location} onChange={(e) => setPostForm({ ...postForm, location: e.target.value })} className="h-10 rounded-xl" />
                  <Button onClick={async () => {
                    if (!user || !postForm.title.trim()) return;
                    const { error } = await supabase.from("posts").insert({
                      author_id: user.id, author_role: "customer",
                      title: postForm.title, description: postForm.description || null,
                      location: postForm.location || null,
                    });
                    if (error) toast.error(error.message);
                    else { toast.success("Paylaşıldı"); setPostForm({ title: "", description: "", location: "" }); loadPosts(); }
                  }} className="h-10 w-full rounded-xl bg-gradient-hero shadow-glow">{t("create")}</Button>
                </div>
              </div>
            )}
            {(() => {
              const filtered = posts.filter((p) => (p.author_role || "store") === feedFilter);
              if (filtered.length === 0) return (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  {t("no_posts_yet")}
                </div>
              );
              return filtered.map((p) => (
              <motion.article key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground">
                    {(p.store?.full_name || "?").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{p.store?.full_name || "Mağaza"}</span>
                      {p.store?.verified && <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />}
                    </div>
                    {p.location && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </div>}
                  </div>
                </div>
                <div className="flex h-52 items-center justify-center bg-gradient-to-br from-accent via-background to-success/20">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                    : <ImageIcon className="h-12 w-12 text-muted-foreground/40" />}
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
                  <div className="mt-5 flex items-center gap-3">
                    <button onClick={() => toggleLike(p)}
                      className={`flex items-center gap-1.5 text-sm font-semibold transition ${p.liked_by_me ? "text-destructive" : "text-muted-foreground"}`}>
                      <Heart className={`h-5 w-5 ${p.liked_by_me ? "fill-current" : ""}`} /> {p.likes_count}
                    </button>
                    <button className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <MessageCircle className="h-5 w-5" /> {t("comment")}
                    </button>
                    {p.store?.phone && (
                      <a href={`tel:${p.store.phone}`} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-success px-4 text-sm font-semibold text-success-foreground hover:bg-success/90">
                        <Phone className="h-4 w-4" /> {t("call_store")}
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
              ));
            })()}
          </div>
        )}

        {tab === "anything" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-success text-success-foreground">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t("get_anything")}</h2>
                <p className="text-sm text-muted-foreground">{t("get_anything_desc")}</p>
              </div>
            </div>

            <div className="my-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                {!pickup ? t("click_map_pickup") : !dropoff ? t("click_map_dropoff") : `${distance.toFixed(2)} km`}
              </div>
              <MapPicker pickup={pickup} dropoff={dropoff}
                onChange={({ pickup, dropoff }) => { setPickup(pickup); setDropoff(dropoff); setRouteKm(null); }}
                onRouteDistance={(km) => setRouteKm(km)} />
              {(pickup || dropoff) && (
                <button onClick={() => { setPickup(null); setDropoff(null); }} className="text-xs font-semibold text-primary underline">
                  {t("reset_pins")}
                </button>
              )}
            </div>

            <div className="space-y-3">
              <Textarea placeholder="Qeyd (məs. paketin təsviri)" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[80px] rounded-xl" />

              <div className="rounded-xl border border-border bg-accent/30 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">{t("estimated_fee")} · {distance.toFixed(2)} km</span>
                  <span className="text-2xl font-bold text-success">{distance > 0 ? formatAzn(fee) : "—"}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("fee_breakdown_note")}</p>
              </div>

              <Button onClick={submitOrder} disabled={!pickup || !dropoff || submitting}
                className="h-12 w-full rounded-xl bg-gradient-hero text-base font-bold disabled:opacity-50">
                {t("request_delivery")} {distance > 0 && `· ${formatAzn(fee)}`}
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
