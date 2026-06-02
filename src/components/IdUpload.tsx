import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, CheckCircle2, Loader2, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function IdUpload({ userId, onUploaded }: { userId: string; onUploaded?: (url: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onPick = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(t("file_too_large")); return; }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/id-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("identity-docs").upload(path, file, { upsert: true });
    if (error) { setBusy(false); toast.error(error.message); return; }
    await supabase.from("profiles").update({
      id_document_url: path,
      id_status: "pending_verification",
    } as never).eq("id", userId);
    setBusy(false); setDone(true);
    onUploaded?.(path);
    toast.success(t("id_uploaded") || "ID yükləndi");
  };

  return (
    <label className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition ${done ? "border-success/60 bg-success/5" : "border-border hover:border-primary"}`}>
      {done ? (
        <>
          <CheckCircle2 className="h-7 w-7 text-success" />
          <div className="text-sm font-bold text-success">{t("id_uploaded") || "Yükləndi · Yoxlanılır"}</div>
        </>
      ) : busy ? (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <div className="text-sm font-semibold">{t("uploading") || "Yüklənir..."}</div>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IdCard className="h-6 w-6" />
          </span>
          <div className="text-sm font-bold">{t("id_upload_title") || "Şəxsiyyət vəsiqəsi şəkli"}</div>
          <div className="text-xs text-muted-foreground">{t("id_upload_hint") || "JPG/PNG · ≤10 MB · Yalnız sənə görünür"}</div>
          <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Upload className="h-3.5 w-3.5" /> {t("choose_file") || "Fayl seç"}
          </span>
        </>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
    </label>
  );
}
