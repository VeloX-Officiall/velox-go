import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Heart, MessageCircle, Share2, ShoppingBag, X, Loader2, MapPin, Repeat2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Axın · VeloX" }] }),
  component: () => <RequireAuth><FeedPage /></RequireAuth>,
});

type Post = {
  id: string; author_id: string; author_role: string;
  title: string; description: string | null;
  image_url: string | null; video_url: string | null;
  price_azn: number | null; created_at: string;
  author?: { full_name: string | null; username: string | null; avatar_url: string | null };
  _likes?: number; _comments?: number; _liked?: boolean; _reposts?: number; _demo?: boolean;
};

const DEMO_POSTS: Post[] = [
  {
    id: "demo-1", author_id: "demo", author_role: "store",
    title: "Yeni gələn dəri çanta kolleksiyası",
    description: "Əl işi, premium dəri. Pulsuz çatdırılma Bakı daxilində.",
    image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&q=80",
    video_url: null, price_azn: 79.9, created_at: new Date().toISOString(),
    author: { full_name: "Leather Co", username: "leather_co", avatar_url: "https://i.pravatar.cc/100?img=12" },
    _likes: 1284, _comments: 56, _liked: false, _reposts: 23, _demo: true,
  },
  {
    id: "demo-2", author_id: "demo", author_role: "store",
    title: "Ev üçün ətirli şamlar 🕯️",
    description: "Soya mumu, təbii ətirlər. Hədiyyəlik qutu ilə.",
    image_url: "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=900&q=80",
    video_url: null, price_azn: 24.0, created_at: new Date().toISOString(),
    author: { full_name: "Glow Studio", username: "glow_studio", avatar_url: "https://i.pravatar.cc/100?img=32" },
    _likes: 542, _comments: 18, _liked: false, _reposts: 7, _demo: true,
  },
  {
    id: "demo-3", author_id: "demo", author_role: "customer",
    title: "Bakıda ən sürətli kuryer xidməti 🚀",
    description: "30 dəqiqəyə şəhər daxili çatdırılma — VeloX ilə.",
    image_url: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=900&q=80",
    video_url: null, price_azn: null, created_at: new Date().toISOString(),
    author: { full_name: "VeloX Team", username: "velox", avatar_url: "https://i.pravatar.cc/100?img=5" },
    _likes: 3120, _comments: 142, _liked: false, _reposts: 88, _demo: true,
  },
];

function FeedPage() {
  const { user } = useAuthSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderFor, setOrderFor] = useState<Post | null>(null);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("posts")
        .select("*").order("created_at", { ascending: false }).limit(30);
      if (!data) { setLoading(false); return; }
      const authorIds = Array.from(new Set(data.map((p: any) => p.author_id)));
      const { data: profs } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url").in("id", authorIds);
      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      const ids = data.map((p: any) => p.id);
      const [{ data: likes }, { data: myLikes }, { data: comments }] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", ids),
        user ? supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
      ]);
      const likeCount: Record<string, number> = {};
      (likes || []).forEach((l: any) => { likeCount[l.post_id] = (likeCount[l.post_id] || 0) + 1; });
      const commentCount: Record<string, number> = {};
      (comments || []).forEach((c: any) => { commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1; });
      const liked = new Set((myLikes || []).map((l: any) => l.post_id));
      const real = data.map((p: any) => ({
        ...p,
        author: profMap.get(p.author_id),
        _likes: likeCount[p.id] || 0,
        _comments: commentCount[p.id] || 0,
        _liked: liked.has(p.id),
        _reposts: 0,
      }));
      setPosts([...real, ...DEMO_POSTS]);
      setLoading(false);
    })();
  }, [user?.id]);

  const toggleLike = async (p: Post) => {
    if (p._demo) {
      setPosts((prev) => prev.map((x) => x.id === p.id ? {
        ...x, _liked: !x._liked, _likes: (x._likes || 0) + (x._liked ? -1 : 1),
      } : x));
      return;
    }
    if (!user) return;
    if (p._liked) {
      await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", user.id);
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, _liked: false, _likes: (x._likes || 1) - 1 } : x));
    } else {
      await supabase.from("post_likes").insert({ post_id: p.id, user_id: user.id });
      setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, _liked: true, _likes: (x._likes || 0) + 1 } : x));
    }
  };

  const repost = (p: Post) => {
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, _reposts: (x._reposts || 0) + 1 } : x));
    toast.success("Yenidən paylaşıldı");
  };

  const share = async (p: Post) => {
    const url = `${window.location.origin}/feed#${p.id}`;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link kopyalandı"); }
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-md">
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="snap-y snap-mandatory overflow-y-auto" style={{ height: "calc(100vh - 4rem - 4rem)" }}>
            {posts.map((p) => (
              <FeedCard key={p.id} post={p} onLike={() => toggleLike(p)} onShare={() => share(p)}
                onRepost={() => repost(p)}
                onOrder={() => setOrderFor(p)} onComment={() => setCommentsFor(p)} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
      {orderFor && !orderFor._demo && <OrderModal post={orderFor} onClose={() => setOrderFor(null)} />}
      {commentsFor && <CommentsSheet post={commentsFor} onClose={() => setCommentsFor(null)} />}
    </div>
  );
}

function FeedCard({ post, onLike, onShare, onOrder, onComment, onRepost }: {
  post: Post; onLike: () => void; onShare: () => void; onOrder: () => void; onComment: () => void; onRepost: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); });
    }, { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative h-[calc(100vh-4rem-4rem)] w-full snap-start overflow-hidden bg-black">
      {post.video_url ? (
        <video ref={videoRef} src={post.video_url} loop muted playsInline
          className="absolute inset-0 h-full w-full object-cover" />
      ) : post.image_url ? (
        <img src={post.image_url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-hero" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Right rail */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-4 text-white">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${post._liked ? "bg-destructive" : "bg-black/40 backdrop-blur"}`}>
            <Heart className={`h-6 w-6 ${post._liked ? "fill-current" : ""}`} />
          </span>
          <span className="text-xs font-bold">{post._likes ?? 0}</span>
        </button>
        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur"><MessageCircle className="h-6 w-6" /></span>
          <span className="text-xs font-bold">{post._comments ?? 0}</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center gap-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur"><Share2 className="h-6 w-6" /></span>
          <span className="text-xs font-bold">Paylaş</span>
        </button>
      </div>

      {/* Bottom info + order */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <Link to="/profile" className="flex items-center gap-2">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-white/20">
            {post.author?.avatar_url && <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="text-sm font-bold">@{post.author?.username || "istifadəçi"}</div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">{post.author_role}</span>
        </Link>
        <h2 className="mt-2 line-clamp-2 text-lg font-bold">{post.title}</h2>
        {post.description && <p className="mt-1 line-clamp-2 text-sm opacity-90">{post.description}</p>}
        <div className="mt-3 flex items-center gap-2">
          {post.price_azn != null && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur">{Number(post.price_azn).toFixed(2)} AZN</span>
          )}
          <Button onClick={onOrder} className="ml-auto h-11 gap-2 rounded-full bg-success px-5 font-bold text-success-foreground shadow-glow hover:bg-success/90">
            <ShoppingBag className="h-4 w-4" /> Sifariş et
          </Button>
        </div>
      </div>
    </section>
  );
}

function OrderModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const { user } = useAuthSession();
  const [address, setAddress] = useState(() => typeof window !== "undefined" ? localStorage.getItem("velox.address") || "Bakı" : "Bakı");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!user) return;
    if (!address.trim()) { toast.error("Ünvan daxil edin"); return; }
    setBusy(true);
    const { error } = await supabase.from("orders").insert({
      customer_id: user.id, store_id: post.author_id, post_id: post.id,
      drop_label: address, pickup_label: "Mağaza", note,
      status: "pending", fee_azn: post.price_azn || 0,
    } as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sifariş göndərildi");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elevated sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Sifarişi təsdiqlə</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-3 rounded-2xl border border-border p-3">
          <div className="text-sm font-bold">{post.title}</div>
          {post.price_azn != null && <div className="mt-1 text-base font-bold text-primary">{Number(post.price_azn).toFixed(2)} AZN</div>}
        </div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Çatdırılma ünvanı</label>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <MapPin className="h-4 w-4 text-primary" />
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="h-11 flex-1 bg-transparent outline-none" />
        </div>
        <Textarea placeholder="Qeyd (opsional)" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl" />
        <Button disabled={busy} onClick={confirm} className="mt-4 h-12 w-full rounded-xl bg-gradient-hero font-bold shadow-glow">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sifariş et"}
        </Button>
      </div>
    </div>
  );
}

function CommentsSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { user } = useAuthSession();
  const [items, setItems] = useState<{ id: string; user_id: string; body: string; created_at: string }[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("post_comments").select("*")
        .eq("post_id", post.id).order("created_at", { ascending: true });
      setItems(data as any || []);
      const ids = Array.from(new Set((data || []).map((c: any) => c.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => map[p.id] = p.username || p.full_name || "—");
        setNames(map);
      }
    })();
    const ch = supabase.channel(`comments-${post.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` },
        (payload) => setItems((prev) => [...prev, payload.new as any]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [post.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user || sending) return;
    setSending(true);
    setBody("");
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: user.id, body: text });
    setSending(false);
    if (error) { toast.error(error.message); setBody(text); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full flex-col rounded-t-3xl bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-bold">Şərhlər</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Şərh yoxdur</p>}
          {items.map((c) => (
            <div key={c.id} className="rounded-xl bg-accent/40 p-3">
              <div className="text-xs font-bold text-primary">@{names[c.user_id] || "istifadəçi"}</div>
              <div className="text-sm">{c.body}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Şərh yaz..."
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
          <Button type="submit" disabled={sending} className="h-11 rounded-xl">Göndər</Button>
        </form>
      </div>
    </div>
  );
}
