import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Search, Plus, Package, User as UserIcon } from "lucide-react";
import { useAuthSession } from "@/lib/auth";
import { ShareSheet } from "./ShareSheet";

export function BottomNav() {
  const { user } = useAuthSession();
  const location = useLocation();
  const [shareOpen, setShareOpen] = useState(false);

  if (!user) return null;
  const path = location.pathname;
  const is = (p: string) => path === p || (p === "/feed" && path === "/");

  const Item = ({ to, icon: Icon, label, active }: { to: string; icon: typeof Home; label: string; active: boolean }) => (
    <Link to={to as never} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
      <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} />
      {label}
    </Link>
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-stretch">
          <Item to="/feed" icon={Home} label="Axın" active={is("/feed")} />
          <Item to="/discover" icon={Search} label="Kəşfet" active={is("/discover")} />
          <button onClick={() => setShareOpen(true)} className="flex flex-1 flex-col items-center justify-center py-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
              <Plus className="h-5 w-5" />
            </span>
          </button>
          <Item to="/activity" icon={Package} label="Aktivlik" active={is("/activity")} />
          <Item to="/profile" icon={UserIcon} label="Profil" active={is("/profile")} />
        </div>
      </nav>
      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} />
      <div aria-hidden className="h-16" />
    </>
  );
}
