import { useState, useRef } from "react";
import { Upload, Loader2, X, Image as ImageIcon, Film } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  value?: string | null;
  kind?: "image" | "video" | "any";
  onUploaded: (url: string, mime: string) => void;
  onClear?: () => void;
  className?: string;
};

export function MediaUpload({ value, kind = "any", onUploaded, onClear, className }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept =
    kind === "image" ? "image/*" : kind === "video" ? "video/*" : "image/*,video/*";

  async function handle(file: File) {
    if (!user) { toast.error(t("login_required")); return; }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const contentType = file.type || (kind === "video" ? "video/mp4" : "image/jpeg");
      const { error } = await supabase.storage.from("media").upload(path, file, {
        contentType, upsert: false, cacheControl: "3600",
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      onUploaded(pub.publicUrl, contentType);
      toast.success(t("uploaded"));
    } catch (e) {
      toast.error((e as Error).message || "Yükləmə alınmadı");
    } finally {
      setBusy(false);
    }
  }

  const isVideo = value && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value);

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-accent/30">
          {isVideo ? (
            <video src={value} controls className="h-44 w-full object-cover" />
          ) : (
            <img src={value} alt="" className="h-44 w-full object-cover" />
          )}
          {onClear && (
            <button type="button" onClick={onClear}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-accent/20 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <div className="flex gap-2">
                {kind !== "video" && <ImageIcon className="h-5 w-5" />}
                {kind !== "image" && <Film className="h-5 w-5" />}
              </div>
              <span className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> {t("upload_media")}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
