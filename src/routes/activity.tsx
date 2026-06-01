import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { MapPin, Clock, CheckCircle2, Package, Bike, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Aktivlik · VeloX" }] }),
  component: () => <RequireAuth><ActivityPage /></RequireAuth>,
});

type Order = {
  id: string; status: string; pickup_label: string | null; drop_label: string | null;
  fee_azn: number | null; distance_km: number | null; created_at: string;
  customer_id: string; courier_id: string | null; store_id: string | null;
};

function ActivityPage() {
  const { user } = useAuthSession();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setRole((data?.role as string) || "customer"); setLoading(false); });
  }, [user?.id]);

  if (loading) return (
    <div className="min-h-screen bg-background"><AppHeader /><div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div><BottomNav /></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={role === "courier" ? "Çatdırılma paneli" : "Sifarişlərim"} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {role === "courier" ? <CourierActivity /> : <CustomerActivity />}
      </main>
      <BottomNav />
    </div>
  );
}

const STEPS = [
  { id: "pending", label: "Hazırlanır", icon: Package },
  { id: "ready", label: "Hazırdır", icon: CheckCircle2 },
  { id: "accepted", label: "Yoldadır", icon: Bike },
  { id: "delivered", label: "Çatdırıldı", icon: CheckCircle2 },
];

function CustomerActivity() {
  const { user } = useAuthSession();
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("orders").select("*")
      .eq("customer_id", user.id).order("created_at", { ascending: false }).limit(20);
    setOrders(data as Order[] || []);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("activity-customer")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, user?.id]);

  if (orders.length === 0) return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <Package className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 font-semibold">Hələ sifariş yoxdur</p>
      <p className="mt-1 text-sm text-muted-foreground">Axın bölməsindən bir məhsul seç və sifariş et.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const stepIdx = STEPS.findIndex((s) => s.id === o.status);
        return (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="font-bold">#{o.id.slice(0, 6)}</div>
              <div className="text-sm font-bold text-primary">{o.fee_azn ? `${Number(o.fee_azn).toFixed(2)} AZN` : "—"}</div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2"><MapPin className="h-4 w-4 text-success" />{o.pickup_label || "—"}</div>
              <div className="flex gap-2"><MapPin className="h-4 w-4 text-warning" />{o.drop_label || "—"}</div>
            </div>
            {/* Stepper */}
            <div className="mt-4 flex items-center justify-between">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx && stepIdx >= 0;
                return (
                  <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"}`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] font-bold ${done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            {/* Live map placeholder */}
            {(o.status === "accepted" || o.status === "ready") && (
              <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-accent/20 text-xs text-muted-foreground">
                <Bike className="mr-2 h-4 w-4 text-primary" /> Kuryer yoldadır...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CourierActivity() {
  const { user } = useAuthSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [incoming, setIncoming] = useState<Order | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: open }, { data: mine }] = await Promise.all([
      supabase.from("orders").select("*").in("status", ["pending", "ready"]).is("courier_id", null).order("created_at", { ascending: false }).limit(10),
      supabase.from("orders").select("*").eq("courier_id", user.id).in("status", ["accepted", "ready"]).order("created_at", { ascending: false }),
    ]);
    setOrders((open as Order[]) || []);
    setActive((mine as Order[]) || []);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel("activity-courier")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // Auto-show incoming modal when a new pending order comes in
  useEffect(() => {
    if (!incoming && orders.length > 0) setIncoming(orders[0]);
  }, [orders, incoming]);

  const accept = async (o: Order) => {
    if (!user) return;
    const { error } = await supabase.from("orders").update({ courier_id: user.id, status: "accepted" }).eq("id", o.id).is("courier_id", null);
    if (error) { toast.error(error.message); return; }
    toast.success("Sifariş qəbul edildi");
    setIncoming(null); load();
  };
  const decline = () => setIncoming(null);
  const markDelivered = async (o: Order) => {
    const { error } = await supabase.from("orders").update({ status: "delivered" }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Çatdırıldı"); load();
  };

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Aktiv işlərim</h2>
          <div className="space-y-3">
            {active.map((o) => (
              <div key={o.id} className="rounded-2xl border border-primary/40 bg-card p-4 shadow-glow">
                <div className="flex justify-between"><div className="font-bold">#{o.id.slice(0,6)}</div><div className="text-sm font-bold text-success">{o.fee_azn ? `${Number(o.fee_azn).toFixed(2)} AZN` : ""}</div></div>
                <div className="mt-2 text-sm"><MapPin className="mr-1 inline h-3.5 w-3.5 text-success" />{o.pickup_label}</div>
                <div className="text-sm"><MapPin className="mr-1 inline h-3.5 w-3.5 text-warning" />{o.drop_label}</div>
                <Button onClick={() => markDelivered(o)} className="mt-3 w-full rounded-xl bg-success text-success-foreground">Çatdırıldı</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Açıq sifarişlər</h2>
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-accent/10 text-xs text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4 text-primary" /> GPS xəritə yüklənir...
        </div>
        <div className="mt-3 space-y-3">
          {orders.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Açıq sifariş yoxdur</p>}
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex justify-between">
                <div className="font-bold">#{o.id.slice(0,6)}</div>
                <Button size="sm" onClick={() => setIncoming(o)} className="rounded-lg">Bax</Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{new Date(o.created_at).toLocaleTimeString("az-AZ")}</div>
            </div>
          ))}
        </div>
      </section>

      {incoming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-elevated sm:rounded-3xl">
            <h3 className="text-lg font-bold">Yeni sifariş</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div><MapPin className="mr-1 inline h-4 w-4 text-success" />{incoming.pickup_label}</div>
              <div><MapPin className="mr-1 inline h-4 w-4 text-warning" />{incoming.drop_label}</div>
              {incoming.fee_azn != null && <div className="text-xl font-bold text-success">{Number(incoming.fee_azn).toFixed(2)} AZN</div>}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={decline}>İmtina</Button>
              <Button className="flex-1 rounded-xl bg-gradient-hero shadow-glow" onClick={() => accept(incoming)}>Qəbul et</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
