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

type Account = {
  id: string; full_name: string | null; username: string | null;
  avatar_url: string | null; verified: boolean; role?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  store: "Mağaza", courier: "Kuryer", customer: "Müştəri",
};

function DiscoverPage() {
  const [stores, setStores] = useState<Account[]>([]);
  const [results, setResults] = useState<Account[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Stores (default list shown when not searching)
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "store");
      const ids = (roles || []).map((r) => r.user_id);
      if (!ids.length) { setStores([]); return; }
      const { data } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url, verified").in("id", ids);
      setStores(((data || []) as Account[]).map((p) => ({ ...p, role: "store" })));
    })();
  }, []);

  // Global account search by @username / full_name
  useEffect(() => {
    const term = q.trim().replace(/^@/, "");
    if (!term) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url, verified")
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(30);
      const accs = (data || []) as Account[];
      // hydrate roles
      const ids = accs.map((a) => a.id);
      if (ids.length) {
        const { data: rs } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
        const roleMap = new Map((rs || []).map((r) => [r.user_id, r.role as string]));
        for (const a of accs) a.role = roleMap.get(a.id) || null;
      }
      setResults(accs);
      setSearching(false);
    }, 220);
    return () => { clearTimeout(t); setSearching(false); };
  }, [q]);

  const filteredStores = useMemo(() => stores, [stores]);
  const isSearching = q.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Hesab və mağaza axtar" />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="@username və ya ad ilə axtar..."
            className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {isSearching ? (
          <>
            <h2 className="mb-3 mt-6 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <AtSign className="h-3.5 w-3.5" /> Hesablar
            </h2>
            {searching ? (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Axtarılır...</p>
            ) : results.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Hesab tapılmadı</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((a) => (
                  <AccountCard key={a.id} a={a} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
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
            {filteredStores.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Mağaza tapılmadı
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStores.map((s) => <AccountCard key={s.id} a={s} />)}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function AccountCard({ a }: { a: Account }) {
  const handle = a.username || a.id.slice(0, 8);
  return (
    <Link
      to="/u/$username"
      params={{ username: handle }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-glow"
    >
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-accent">
        {a.avatar_url
          ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" />
          : <UserIcon className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate font-bold">
          {a.full_name || a.username || "İstifadəçi"}
          {a.verified && <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          @{a.username || "—"} {a.role && <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase">{ROLE_LABEL[a.role] || a.role}</span>}
        </div>
      </div>
    </Link>
  );
}
