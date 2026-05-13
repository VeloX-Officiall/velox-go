import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Lock, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  onSuccess: (last4: string) => void | Promise<void>;
};

export function CardCheckout({ open, onOpenChange, amount, onSuccess }: Props) {
  const { t } = useTranslation();
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"form" | "processing" | "success">("form");
  const [error, setError] = useState<string | null>(null);

  function reset() { setNumber(""); setExp(""); setCvv(""); setName(""); setStage("form"); setError(null); }

  function fmtNumber(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function fmtExp(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length < 3) return d;
    return d.slice(0, 2) + "/" + d.slice(2);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const digits = number.replace(/\s/g, "");
    if (digits.length < 13) { setError(t("invalid_card")); return; }
    if (!/^\d{2}\/\d{2}$/.test(exp)) { setError(t("invalid_expiry")); return; }
    if (!/^\d{3,4}$/.test(cvv)) { setError(t("invalid_cvv")); return; }
    if (name.trim().length < 2) { setError(t("invalid_holder")); return; }

    setStage("processing");
    // Simulate processing (mock — no real payment)
    await new Promise((r) => setTimeout(r, 1400));
    setStage("success");
    await new Promise((r) => setTimeout(r, 700));
    await onSuccess(digits.slice(-4));
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> {t("secure_checkout")}
          </DialogTitle>
        </DialogHeader>

        {stage === "form" && (
          <form onSubmit={pay} className="space-y-3">
            <div className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground shadow-glow">
              <div className="text-xs uppercase opacity-80">{t("amount")}</div>
              <div className="text-3xl font-bold">{amount.toFixed(2)} AZN</div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] opacity-80">
                <Lock className="h-3 w-3" /> {t("ssl_protected")}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("card_number")}</label>
              <Input inputMode="numeric" value={number} onChange={(e) => setNumber(fmtNumber(e.target.value))}
                placeholder="4242 4242 4242 4242" className="h-11 rounded-xl font-mono tracking-wider" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("expiry")}</label>
                <Input value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} placeholder="MM/YY"
                  className="h-11 rounded-xl font-mono" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">CVV</label>
                <Input inputMode="numeric" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  placeholder="123" className="h-11 rounded-xl font-mono" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("cardholder")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="AD SOYAD" className="h-11 rounded-xl uppercase" />
            </div>
            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-hero text-base font-bold shadow-glow">
              {t("pay_now")} · {amount.toFixed(2)} AZN
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">{t("mock_checkout_note")}</p>
          </form>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-semibold">{t("processing_payment")}</p>
          </div>
        )}

        {stage === "success" && (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-glow">
              <Check className="h-8 w-8" />
            </div>
            <p className="text-lg font-bold">{t("payment_success")}</p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
