import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaUpload } from "./MediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";
import { toast } from "sonner";

type Kind = "video" | "image";

export function ShareSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuthSession();
  const [kind, setKind] = useState<Kind | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setKind(null); setImageUrl(""); setVideoUrl("");
    setTitle(""); setPrice(""); setDescription("");
  };
  const close = () => { reset(); onOpenChange(false); };

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("Məhsul adı boş ola bilməz"); return; }
    if (kind === "image" && !imageUrl) { toast.error("Şəkil yükləyin"); return; }
    if (kind === "video" && !videoUrl) { toast.error("Video yükləyin"); return; }
    setBusy(true);
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const author_role = (roleRow?.role as string) || "customer";
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      author_role,
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
      price_azn: price ? Number(price) : null,
    } as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paylaşıldı");
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur"
          onClick={close}>
          <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elevated"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{kind ? (kind === "video" ? "Video Paylaş" : "Şəkil/Post Paylaş") : "Paylaş"}</h3>
              <button onClick={close} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>

            {!kind && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setKind("video")}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-6 hover:border-primary hover:shadow-glow">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Video className="h-6 w-6" />
                  </span>
                  <div className="text-sm font-bold">🎥 Video Paylaş</div>
                  <div className="text-center text-[11px] text-muted-foreground">Məhsul və ya həyat tərzi videosu</div>
                </button>
                <button onClick={() => setKind("image")}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-6 hover:border-primary hover:shadow-glow">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                    <ImageIcon className="h-6 w-6" />
                  </span>
                  <div className="text-sm font-bold">📸 Şəkil/Post Paylaş</div>
                  <div className="text-center text-[11px] text-muted-foreground">Məhsul şəkili və təsvir</div>
                </button>
              </div>
            )}

            {kind && (
              <div className="space-y-3">
                <MediaUpload
                  kind={kind}
                  value={kind === "image" ? imageUrl : videoUrl}
                  onUploaded={(url) => (kind === "image" ? setImageUrl(url) : setVideoUrl(url))}
                  onClear={() => (kind === "image" ? setImageUrl("") : setVideoUrl(""))}
                />
                <Input placeholder="Məhsul Adı" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" />
                <Input placeholder="Qiymət (AZN)" type="number" min="0" step="0.01" value={price}
                  onChange={(e) => setPrice(e.target.value)} className="h-11 rounded-xl" />
                <Textarea placeholder="Təsvir" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[90px] rounded-xl" />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setKind(null)}>Geri</Button>
                  <Button disabled={busy} onClick={submit} className="flex-1 rounded-xl bg-gradient-hero shadow-glow">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Paylaş"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
