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
import { BadgeCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · VeloX" }] }),
  component: () => <RequireAuth><ProfilePage /></RequireAuth>,
});

function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [form, setForm] = useState({
    full_name: "", phone: "", bio: "", social_url: "", avatar_url: "",
    yt_url: "", tt_url: "", ig_url: "", fin_code: "",
  });
  const [verified, setVerified] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name || "",
          phone: data.phone || "",
          bio: data.bio || "",
          social_url: data.social_url || "",
          avatar_url: data.avatar_url || "",
          yt_url: (data as any).yt_url || "",
          tt_url: (data as any).tt_url || "",
          ig_url: (data as any).ig_url || "",
          fin_code: (data as any).fin_code || "",
        });
        setVerified(!!data.verified);
      }
    });
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setRole(data?.role || null);
    });
  }, [user?.id]);

  const isCourier = role === "courier";
  const maskedFin = form.fin_code ? `••••${form.fin_code.slice(-3)}` : "";

  async function save() {
    if (!user) return;
    setBusy(true);
    const payload: any = {
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
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profil yeniləndi");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("profile")} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-accent">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                : <UserIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-lg font-bold">
                {form.full_name || "Profil"}
                {verified && <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {isCourier ? `FIN: ${maskedFin}` : user?.email}
                {role && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{role}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
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
                <div className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">{t("links")}</div>
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
              {t("save")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
