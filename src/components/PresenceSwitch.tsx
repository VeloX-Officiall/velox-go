import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";
import { toast } from "sonner";

/** Store-only manual open/closed toggle. */
export function PresenceSwitch() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("status, is_online").eq("id", user.id).maybeSingle()
      .then(({ data }) => setOpen((data?.status === "online") || !!data?.is_online));
  }, [user?.id]);

  const toggle = async () => {
    if (!user || busy) return;
    const next = !open;
    setBusy(true); setOpen(next);
    const { error } = await supabase.from("profiles").update({
      status: next ? "online" : "offline",
      is_online: next,
      last_seen_at: new Date().toISOString(),
    } as never).eq("id", user.id);
    setBusy(false);
    if (error) { setOpen(!next); toast.error(error.message); }
    else toast.success(next ? (t("store_open") || "Mağaza açıqdır") : (t("store_closed") || "Mağaza bağlıdır"));
  };

  return (
    <button onClick={toggle} disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow transition ${
        open ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
      }`}>
      <Store className="h-4 w-4" />
      <span>{open ? (t("open_now") || "Açıq") : (t("closed_now") || "Bağlı")}</span>
      <span className={`relative inline-block h-5 w-9 rounded-full transition ${open ? "bg-white/30" : "bg-foreground/20"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${open ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}
