import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, MessageCircle, ChevronDown, Truck } from "lucide-react";
import { useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";


const ADDRESS_KEY = "velox.address";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { user } = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [address, setAddress] = useState("Bakı, Nizami küç.");
  const [editingAddr, setEditingAddr] = useState(false);
  const [addrDraft, setAddrDraft] = useState(address);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(ADDRESS_KEY) : null;
    if (saved) setAddress(saved);
  }, []);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRole((data?.role as string) || null));
    supabase.from("profiles").select("is_online").eq("id", user.id).maybeSingle()
      .then(({ data }) => setOnline(Boolean(data?.is_online)));
  }, [user?.id]);

  const isCourier = role === "courier";
  const path = location.pathname;
  const onFeed = path === "/feed" || path === "/";
  const onStores = path === "/discover" || path === "/stores";

  const toggleOnline = async () => {
    if (!user) return;
    const next = !online;
    setOnline(next);
    await supabase.from("profiles").update({ is_online: next, last_seen_at: new Date().toISOString() }).eq("id", user.id);
  };

  const saveAddress = () => {
    const v = addrDraft.trim() || "Bakı";
    setAddress(v); localStorage.setItem(ADDRESS_KEY, v); setEditingAddr(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-4">
        {/* LEFT */}
        <div className="flex min-w-0 flex-1 items-center">
          {!user ? (
            <Link to="/" className="flex items-center gap-2 truncate">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground">
                <Truck className="h-4 w-4" />
              </div>
              <span className="truncate text-base font-bold tracking-tight">VeloX</span>
            </Link>
          ) : isCourier ? (
            <button onClick={toggleOnline}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                online ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
              }`}>
              <span className={`h-2 w-2 rounded-full ${online ? "bg-white animate-pulse" : "bg-current/60"}`} />
              {online ? "Onlayn" : "Oflayn"}
            </button>
          ) : (
            <button onClick={() => { setAddrDraft(address); setEditingAddr(true); }}
              className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 text-left hover:bg-accent">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase leading-none text-muted-foreground">Çatdırılma</span>
                <span className="block truncate text-sm font-semibold">{address}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* CENTER segmented — only on home/feed */}
        {user && onFeed && (
          <div className="flex rounded-full bg-accent p-0.5 text-xs font-bold">
            <button onClick={() => navigate({ to: "/feed" })}
              className={`rounded-full px-3 py-1.5 transition ${onFeed ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
              Axın
            </button>
            <button onClick={() => navigate({ to: "/discover" })}
              className={`rounded-full px-3 py-1.5 transition ${onStores ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
              Mağazalar
            </button>
          </div>
        )}

        {/* RIGHT */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <LanguageSwitcher />
          {user && onFeed ? (
            <Link to="/messages" title="Mesajlar"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent">
              <MessageCircle className="h-4 w-4" />
            </Link>
          ) : !user ? (
            <Link to="/auth" search={{ role: "customer" } as never}
              className="rounded-xl bg-gradient-hero px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
              Daxil ol
            </Link>
          ) : null}
        </div>
      </div>
      {subtitle && (
        <div className="mx-auto max-w-6xl px-4 pb-2 text-xs text-muted-foreground">{subtitle}</div>
      )}

      {/* Address modal */}
      {editingAddr && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur sm:items-center"
          onClick={() => setEditingAddr(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-elevated sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-bold">Çatdırılma ünvanı</h3>
            <input value={addrDraft} onChange={(e) => setAddrDraft(e.target.value)}
              placeholder="Bakı, Nizami küç. 25"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditingAddr(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">Ləğv et</button>
              <button onClick={saveAddress}
                className="flex-1 rounded-xl bg-gradient-hero py-2.5 text-sm font-bold text-primary-foreground shadow-glow">Yadda saxla</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
