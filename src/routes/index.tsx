import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Bike, Store, User, ArrowRight, Coins, Users, Heart, ShieldCheck, Eye, MapPin } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VeloX — The People's Logistics App" },
      {
        name: "description",
        content:
          "Zero-commission logistics for Azerbaijan. Stores and couriers connected with a flat daily fee.",
      },
      { property: "og:title", content: "VeloX — Zero-commission logistics" },
      { property: "og:description", content: "Flat 1 AZN daily pass. Fair earnings for couriers." },
    ],
  }),
  component: Landing,
});

function RoleCard({
  to,
  icon: Icon,
  title,
  desc,
  tone,
}: {
  to: string;
  icon: typeof Bike;
  title: string;
  desc: string;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass = {
    primary: "from-primary/10 to-primary/0 text-primary",
    success: "from-success/15 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
  }[tone];
  return (
    <Link to={to} className="group block">
      <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated">
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${toneClass} opacity-60`} />
        <div className="relative">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-card">
            <Icon className={`h-7 w-7 ${tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : "text-warning"}`} />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
            <span>→</span>
            <span className="opacity-0 transition-opacity group-hover:opacity-100">Open</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Landing() {
  const { t } = useTranslation();

  const features = [
    { icon: Coins, title: t("f1_title"), desc: t("f1_desc") },
    { icon: Users, title: t("f2_title"), desc: t("f2_desc") },
    { icon: Heart, title: t("f3_title"), desc: t("f3_desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("tagline")} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-elevated sm:p-14"
        >
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-success/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-warning/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur">
              Baku · Khachmaz · Azerbaijan
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              {t("hero_title")}
            </h1>
            <p className="mt-4 text-base text-primary-foreground/85 sm:text-lg">
              {t("hero_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/about" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
                {t("about")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Values */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">{t("values_title")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: t("v1_title"), desc: t("v1_desc"), tone: "text-success" },
              { icon: Eye, title: t("v2_title"), desc: t("v2_desc"), tone: "text-primary" },
              { icon: MapPin, title: t("v3_title"), desc: t("v3_desc"), tone: "text-warning" },
            ].map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-accent ${v.tone}`}>
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">{t("get_started")}</h2>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <RoleCard to="/courier" icon={Bike} title={t("i_am_courier")} desc={t("courier_dash")} tone="primary" />
            <RoleCard to="/store" icon={Store} title={t("i_am_store")} desc={t("store_dash")} tone="success" />
            <RoleCard to="/customer" icon={User} title={t("i_am_customer")} desc={t("customer_dash")} tone="warning" />
          </div>
        </section>

        {/* Features */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">{t("features_title")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} VeloX · Made for Azerbaijan
        </footer>
      </main>
    </div>
  );
}
