import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BadgeCheck, User as UserIcon, Pencil, Wallet, Edit3, X, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · VeloX" }] }),
  component: () => <RequireAuth><ProfilePage /></RequireAuth>,
});

type FormState = {
  full_name: string; phone: string; bio: string; social_url: string; avatar_url: string;
  yt_url: string; tt_url: string; ig_url: string; fin_code: string;
};

function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [form, setForm] = useState<FormState>({
    full_name: "", phone: "", bio: "", social_url: "", avatar_url: "",
    yt_url: "", tt_url: "", ig_url: "", fin_code: "",
  });
  const [verified, setVerified] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [idStatus, setIdStatus] = useState<string>("none");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wallet, setWallet] = useState<number>(0);
  const [deliveredCount, setDeliveredCount] = useState(0);

  const refresh = async () => {
    if (!user) return;
    const [{ data: prof }, { data: roleRow }, { data: w }, { data: orders }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("courier_wallet").select("balance_azn").eq("user_id", user.id).maybeSingle(),
      supabase.from("orders").select("id", { count: "exact" }).eq("courier_id", user.id).eq("status", "delivered"),
    ]);
    if (prof) {
      setForm({
        full_name: prof.full_name || "", phone: prof.phone || "", bio: prof.bio || "",
        social_url: prof.social_url || "", avatar_url: prof.avatar_url || "",
        yt_url: (prof as { yt_url?: string }).yt_url || "",
        tt_url: (prof as { tt_url?: string }).tt_url || "",
        ig_url: (prof as { ig_url?: string }).ig_url || "",
        fin_code: (prof as { fin_code?: string }).fin_code || "",
      });
      setVerified(!!prof.verified);
      setUsername(prof.username || null);
      setIdStatus((prof as { id_status?: string }).id_status || "none");
    }
    setRole(roleRow?.role || null);
    setWallet(Number(w?.balance_azn || 0));
    setDeliveredCount(orders?.length || 0);
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const isCourier = role === "courier";
  const maskedFin = form.fin_code ? `••••${form.fin_code.slice(-3)}` : "";

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const payload: Record<string, unknown> = {
      full_name: form.full_name, phone: form.phone, avatar_url: form.avatar_url,
    };
    if (isCourier) {
      payload.yt_url = form.yt_url || null;
      payload.tt_url = form.tt_url || null;
      payload.ig_url = form.ig_url || null;
    } else {
      payload.bio = form.bio;
      payload.social_url = form.social_url || null;
    }
    const { error } = await supabase.from("profiles").update(payload as never).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("ok_profile_saved"));
    setEditing(false);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("profile")} />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6 pb-24">
        {/* State A: read-only header card */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="bg-gradient-hero p-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/20 ring-2 ring-white/40">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <UserIcon className="h-10 w-10 text-white/90" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xl font-bold">
                  <span className="truncate">{form.full_name || username || "Profil"}</span>
                  {verified && <BadgeCheck className="h-5 w-5 fill-white text-primary" />}
                </div>
                {username && <div className="text-sm opacity-85">@{username}</div>}
                {role && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {role}
                  </span>
                )}
              </div>
            </div>
            {form.bio && !editing && <p className="mt-4 text-sm leading-relaxed opacity-95">{form.bio}</p>}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-accent/20 text-center text-xs">
            <div className="p-3">
              <div className="text-lg font-bold text-foreground">{deliveredCount}</div>
              <div className="text-muted-foreground">Çatdırılan</div>
            </div>
            <div className="p-3">
              <div className="text-lg font-bold text-foreground">{verified ? "✓" : "—"}</div>
              <div className="text-muted-foreground">Təsdiq</div>
            </div>
            <div className="p-3">
              <div className="text-lg font-bold text-foreground">{idStatus === "verified" ? "✓" : idStatus === "pending_verification" ? "⏳" : "—"}</div>
              <div className="text-muted-foreground">KYC</div>
            </div>
          </div>

          {/* Wallet block */}
          {isCourier && (
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase text-muted-foreground">VeloX Cüzdan</div>
                  <div className="text-lg font-bold">{wallet.toFixed(2)} AZN</div>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">FIN: {maskedFin || "—"}</div>
            </div>
          )}

          <div className="flex gap-2 p-4">
            {!editing ? (
              <Button onClick={() => setEditing(true)} className="flex-1 gap-2 rounded-xl bg-gradient-hero shadow-glow">
                <Edit3 className="h-4 w-4" /> Profili redaktə et
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { setEditing(false); refresh(); }} className="flex-1 gap-2 rounded-xl">
                <X className="h-4 w-4" /> Ləğv et
              </Button>
            )}
            <Button variant="outline" onClick={signOut} className="gap-2 rounded-xl">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* State B: edit form */}
        {editing && (
          <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Pencil className="h-4 w-4" /> Profil redaktoru
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("full_name")}</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("phone")}</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+994..." className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Avatar URL</label>
              <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="h-11 rounded-xl" />
            </div>
            {isCourier ? (
              <>
                <div className="mt-2 text-xs font-bold uppercase tracking-wider text-primary">Sosial keçidlər</div>
                <Input value={form.yt_url} onChange={(e) => setForm({ ...form, yt_url: e.target.value })} placeholder={t("yt_url")} className="h-11 rounded-xl" />
                <Input value={form.tt_url} onChange={(e) => setForm({ ...form, tt_url: e.target.value })} placeholder={t("tt_url")} className="h-11 rounded-xl" />
                <Input value={form.ig_url} onChange={(e) => setForm({ ...form, ig_url: e.target.value })} placeholder={t("ig_url")} className="h-11 rounded-xl" />
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("bio")}</label>
                  <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="min-h-[90px] rounded-xl" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("social_link")}</label>
                  <Input value={form.social_url} onChange={(e) => setForm({ ...form, social_url: e.target.value })} placeholder="https://instagram.com/..." className="h-11 rounded-xl" />
                </div>
              </>
            )}
            <Button onClick={save} disabled={busy} className="h-11 w-full rounded-xl bg-gradient-hero shadow-glow">
              {busy ? "..." : "Yadda saxla"}
            </Button>
          </div>
        )}

        {idStatus === "pending_verification" && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <ShieldCheck className="h-4 w-4" />
            <span>Şəxsiyyət sənədiniz yoxlanılır. Adətən 24 saat çəkir.</span>
          </div>
        )}
      </main>
      
    </div>
  );
}
