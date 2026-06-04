import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Search, UtensilsCrossed, ShoppingCart, Shirt, Cookie, BadgeCheck, AtSign, User as UserIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [{ title: "Kəşfet · VeloX" }] }),
  component: () => <RequireAuth><DiscoverPage /></RequireAuth>,
});

const CATEGORIES = [
  { id: "restoranlar", label: "Restoranlar", icon: UtensilsCrossed, tone: "bg-warning/15 text-warning" },
  { id: "marketler", label: "Marketlər", icon: ShoppingCart, tone: "bg-primary/15 text-primary" },
  { id: "geyim", label: "Geyim", icon: Shirt, tone: "bg-success/15 text-success" },
  { id: "sirniyyat", label: "Şirniyyat", icon: Cookie, tone: "bg-destructive/15 text-destructive" },
];

type Account = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean; role?: string | null };

function DiscoverPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "store");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (!ids.length) { setStores([]); return; }
      const { data } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url, verified").in("id", ids);
      setStores(data as Store[] || []);
    })();
  }, []);

  const filtered = useMemo(() => stores.filter((s) =>
    (!q || (s.full_name || s.username || "").toLowerCase().includes(q.toLowerCase()))
  ), [stores, q]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Mağazaları kəşf et" />
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mağaza axtar..."
            className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary" />
        </div>

        <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">Kateqoriyalar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition ${cat === c.id ? "border-primary shadow-glow" : "border-border bg-card hover:border-primary/40"}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.tone}`}>
                <c.icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-bold">{c.label}</span>
            </button>
          ))}
        </div>

        <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {cat ? CATEGORIES.find((c) => c.id === cat)?.label : "Bütün mağazalar"}
        </h2>
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Mağaza tapılmadı
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Link key={s.id} to="/profile" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-glow">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-accent">
                  {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full object-cover" /> : <ShoppingCart className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate font-bold">
                    {s.full_name || s.username || "Mağaza"}
                    {s.verified && <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">@{s.username || "mağaza"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
