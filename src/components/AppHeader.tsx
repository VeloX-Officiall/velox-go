import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-card">
            <Truck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight">{t("brand")}</div>
            {subtitle ? (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            ) : null}
          </div>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
