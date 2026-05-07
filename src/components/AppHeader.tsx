import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Truck, MessageCircle, LogOut } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuthSession, signOut } from "@/lib/auth";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-card">
            <Truck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight">{t("brand")}</div>
            {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Link to="/messages" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent" title="Mesajlar">
                <MessageCircle className="h-4 w-4" />
              </Link>
              <button onClick={signOut} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent" title="Çıxış">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
