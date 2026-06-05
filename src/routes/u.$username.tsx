import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth, useAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BadgeCheck, User as UserIcon, MessageCircle, Youtube, Instagram, Music2, ArrowLeft } from "lucide-react";
import { ProfileTabs } from "@/components/ProfileTabs";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  head: () => ({ meta: [{ title: "Profil · VeloX" }] }),
  component: () => <RequireAuth><UserProfilePage /></RequireAuth>,
});

type Profile = {
  id: string; username: string | null; full_name: string | null; avatar_url: string | null;
  bio: string | null; social_url: string | null; verified: boolean;
  yt_url: string | null; tt_url: string | null; ig_url: string | null;
  status: string | null;
};

function UserProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const handle = username.replace(/^@/, "").toLowerCase();
      const { data } = await supabase.from("profiles").select("*").ilike("username", handle).maybeSingle();
      if (cancel) return;
      if (data) {
        setProfile(data as Profile);
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", (data as Profile).id).maybeSingle();
        if (!cancel) setRole(r?.role || null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [username]);

  const openMessage = async () => {
    if (!user || !profile) return;
    if (user.id === profile.id) { navigate({ to: "/profile" }); return; }
    const [a, b] = [user.id, profile.id].sort();
    const { data: existing } = await supabase.from("conversations").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("conversations").insert({ user_a: a, user_b: b });
      if (error) { toast.error(error.message); return; }
    }
    navigate({ to: "/messages" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Profil" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6 pb-24">
        <button onClick={() => history.back()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Geri
        </button>

        {loading ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Yüklənir...</div>
        ) : !profile ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <p className="text-sm font-semibold">İstifadəçi tapılmadı</p>
            <p className="mt-1 text-xs text-muted-foreground">@{username}</p>
            <Link to="/discover" className="mt-4 inline-block text-xs text-primary underline">Kəşfə qayıt</Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <div className="bg-gradient-hero p-6 text-primary-foreground">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/20 ring-2 ring-white/40">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    : <UserIcon className="h-10 w-10 text-white/90" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xl font-bold">
                    <span className="truncate">{profile.full_name || profile.username || "Profil"}</span>
                    {profile.verified && <BadgeCheck className="h-5 w-5 fill-white text-primary" />}
                  </div>
                  {profile.username && <div className="text-sm opacity-85">@{profile.username}</div>}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {role && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {role}
                      </span>
                    )}
                    {profile.status === "online" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> online
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {profile.bio && <p className="mt-4 text-sm leading-relaxed opacity-95">{profile.bio}</p>}
            </div>

            {(profile.yt_url || profile.tt_url || profile.ig_url || profile.social_url) && (
              <div className="flex flex-wrap gap-2 border-b border-border p-4">
                {profile.yt_url && (
                  <a href={profile.yt_url} target="_blank" rel="noopener" className="flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
                    <Youtube className="h-3.5 w-3.5" /> YouTube
                  </a>
                )}
                {profile.tt_url && (
                  <a href={profile.tt_url} target="_blank" rel="noopener" className="flex items-center gap-1 rounded-xl bg-foreground/10 px-3 py-1.5 text-xs font-bold">
                    <Music2 className="h-3.5 w-3.5" /> TikTok
                  </a>
                )}
                {profile.ig_url && (
                  <a href={profile.ig_url} target="_blank" rel="noopener" className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                )}
                {profile.social_url && (
                  <a href={profile.social_url} target="_blank" rel="noopener" className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold">
                    Sosial keçid
                  </a>
                )}
              </div>
            )}

            <div className="flex gap-2 p-4">
              {user?.id !== profile.id && (
                <Button onClick={openMessage} className="flex-1 gap-2 rounded-xl bg-gradient-hero shadow-glow">
                  <MessageCircle className="h-4 w-4" /> Mesaj göndər
                </Button>
              )}
              {user?.id === profile.id && (
                <Link to="/profile" className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl">Profili redaktə et</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
