import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Bike, Store, User as UserIcon, Mail, Lock, Loader2, AtSign, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdUpload } from "@/components/IdUpload";
import { toast } from "sonner";

type Role = "courier" | "store" | "customer";
const validRoles: Role[] = ["courier", "store", "customer"];

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    role: (validRoles.includes(s.role as Role) ? s.role : "customer") as Role,
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Giriş · VeloX" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const { role, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>(role);
  const [busy, setBusy] = useState(false);
  const [finCode, setFinCode] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || roleHome(selectedRole) });
    });
  }, []);

  function roleHome(r: Role) {
    return r === "courier" ? "/courier" : r === "store" ? "/store" : "/customer";
  }

  async function ensureRole(userId: string, r: Role) {
    await supabase.from("user_roles").insert({ user_id: userId, role: r }).select();
  }

  const isCourier = selectedRole === "courier";
  const finEmail = (code: string) => `fin${code.trim().toLowerCase()}@velox.app`;

  async function checkUsernameAvailable(u: string) {
    const { data } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
    return !data;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const usedEmail = isCourier ? finEmail(finCode) : email;
      if (isCourier && !/^[A-Za-z0-9]{6,8}$/.test(finCode)) {
        throw new Error(t("fin_code_invalid"));
      }
      if (mode === "signup") {
        const u = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(u)) throw new Error(t("username_help"));
        const ok = await checkUsernameAvailable(u);
        if (!ok) throw new Error(t("username_taken"));

        const { data, error } = await supabase.auth.signUp({
          email: usedEmail, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName || u,
              role: selectedRole,
              username: u,
              ...(isCourier ? { fin_code: finCode.toUpperCase() } : {}),
            },
          },
        });
        if (error) throw error;
        // Trigger handle_new_user writes profile + role from metadata; no manual update needed.
        if (data.user) await ensureRole(data.user.id, selectedRole);
        toast.success(t("account_created"));
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: usedEmail, password });
        if (error) throw error;
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user!.id);
        if (!roles || roles.length === 0) await ensureRole(data.user!.id, selectedRole);
        // Determine actual role to redirect properly
        const actualRole = (roles?.[0]?.role as Role) || selectedRole;
        toast.success(t("welcome_back"));
        navigate({ to: redirect || roleHome(actualRole) });
        return;
      }
      navigate({ to: redirect || roleHome(selectedRole) });
    } catch (err) {
      toast.error((err as Error).message || t("err_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + (redirect || roleHome(selectedRole)),
      });
      if (result.error) { toast.error(t("err_generic")); setBusy(false); return; }
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) await ensureRole(data.user.id, selectedRole);
      navigate({ to: redirect || roleHome(selectedRole) });
    } catch (e) {
      toast.error((e as Error).message || t("err_generic"));
      setBusy(false);
    }
  }

  const roles: { id: Role; icon: typeof Bike; label: string }[] = [
    { id: "courier", icon: Bike, label: t("role_courier") },
    { id: "store", icon: Store, label: t("role_store") },
    { id: "customer", icon: UserIcon, label: t("role_customer") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={`${t("login")} / ${t("signup")}`} />
      <main className="mx-auto max-w-md px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex rounded-xl bg-accent p-1">
            <button onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "login" ? "bg-card shadow" : "text-muted-foreground"}`}>
              {t("login")}
            </button>
            <button onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "signup" ? "bg-card shadow" : "text-muted-foreground"}`}>
              {t("signup")}
            </button>
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("role_select")}</div>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button key={r.id} type="button" onClick={() => setSelectedRole(r.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition ${selectedRole === r.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <r.icon className="h-5 w-5" />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Input placeholder={t("full_name")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl" />
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input required minLength={3} maxLength={20} placeholder={t("username")} value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="h-11 rounded-xl pl-9" />
                </div>
              </>
            )}
            {isCourier ? (
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input required minLength={6} maxLength={8} placeholder={`${t("fin_code")} (5XB1234)`}
                  value={finCode} onChange={(e) => setFinCode(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl pl-9 tracking-widest font-mono uppercase" />
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" required placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl pl-9" />
              </div>
            )}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" required minLength={6} placeholder={`${t("password")} (min 6)`} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl pl-9" />
            </div>
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-gradient-hero text-base font-bold shadow-glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? t("enter") : t("signup")}
            </Button>
          </form>

          {mode === "signup" && (selectedRole === "courier" || selectedRole === "store") && (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-accent/20 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Şəxsiyyət vəsiqəsi (KYC)
              </div>
              <p className="text-[11px] text-muted-foreground">
                {selectedRole === "courier" ? "Kuryer" : "Mağaza"} qeydiyyatı üçün ID şəkli tələb olunur.
                Qeydiyyatdan sonra profilinizdə də yükləyə bilərsiniz.
              </p>
              <KycHelper />
            </div>
          )}

          {!isCourier && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("or")}
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-11 w-full rounded-xl">
                {t("google_continue")}
              </Button>
            </>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">{t("go_back_home")}</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
