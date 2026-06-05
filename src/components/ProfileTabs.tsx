import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Grid3x3, Repeat2, Loader2 } from "lucide-react";

type Tab = "posts" | "reposts";

type PostRow = {
  id: string; title: string; image_url: string | null; video_url: string | null;
  price_azn: number | null; created_at: string;
};
type RepostRow = {
  id: string; post_id: string; created_at: string;
  snapshot: {
    title?: string; image_url?: string | null; video_url?: string | null;
    author?: { username?: string | null; full_name?: string | null; avatar_url?: string | null };
  } | null;
};

export function ProfileTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [reposts, setReposts] = useState<RepostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("posts").select("id,title,image_url,video_url,price_azn,created_at")
          .eq("author_id", userId).order("created_at", { ascending: false }),
        supabase.from("post_reposts").select("id,post_id,created_at,snapshot")
          .eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (cancel) return;
      setPosts((p as PostRow[]) || []);
      setReposts((r as RepostRow[]) || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [userId]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="grid grid-cols-2 border-b border-border">
        <button onClick={() => setTab("posts")}
          className={`flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider ${tab === "posts" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
          <Grid3x3 className="h-4 w-4" /> Gönderiler ({posts.length})
        </button>
        <button onClick={() => setTab("reposts")}
          className={`flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider ${tab === "reposts" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
          <Repeat2 className="h-4 w-4" /> Tekrar Paylaşılan ({reposts.length})
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : tab === "posts" ? (
        posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Henüz gönderi yok</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((p) => <Thumb key={p.id} src={p.image_url || p.video_url} title={p.title} />)}
          </div>
        )
      ) : (
        reposts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Henüz repost yok</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {reposts.map((r) => (
              <Thumb key={r.id}
                src={r.snapshot?.image_url || r.snapshot?.video_url || null}
                title={r.snapshot?.title || ""}
                badge={r.snapshot?.author?.username ? `@${r.snapshot.author.username}` : undefined} />
            ))}
          </div>
        )
      )}
    </div>
  );

  function Thumb({ src, title, badge }: { src: string | null; title: string; badge?: string }) {
    return (
      <div className="relative aspect-square overflow-hidden bg-accent/30">
        {src ? (
          /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)
            ? <video src={src} muted className="h-full w-full object-cover" />
            : <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-hero p-2 text-center text-[10px] font-bold text-primary-foreground">{title}</div>
        )}
        {badge && (
          <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[9px] font-bold text-white">{badge}</div>
        )}
      </div>
    );
  }
}

// avoid unused import warning when Link not used
export const _ = Link;
