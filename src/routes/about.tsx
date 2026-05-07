import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Rocket, Bike, Store, User, CheckCircle2 } from "lucide-react";
import "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { calcDeliveryFee, formatAzn } from "@/lib/pricing";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Haqqımızda — VeloX" },
      {
        name: "description",
        content:
          "VeloX — mağaza, kuryer və müştərini birbaşa birləşdirən yerli logistika platforması. 0% komissiya, sabit gündəlik sistem.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const examples = [0.8, 1, 2, 5, 10, 15, 25];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={t("about")} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-3">
            <Rocket className="h-7 w-7" />
            <h1 className="text-3xl font-bold">VeloX Nədir?</h1>
          </div>
          <p className="mt-4 text-primary-foreground/90">
            VeloX mağaza, kuryer və müştərini birbaşa birləşdirən yerli logistika
            platformasıdır.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0" /> 0% mağaza komissiyası</li>
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0" /> Kuryerlər üçün sabit gündəlik sistem</li>
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0" /> Sürətli və rahat sifariş</li>
          </ul>
        </section>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <RoleBlock icon={Bike} title="Kuryerlər üçün" desc="Günlük sabit giriş haqqı ilə limitsiz sifariş. Bütün qazanc sizindir." />
          <RoleBlock icon={Store} title="Mağazalar üçün" desc="Tam komissiyasız satış. Müştəri ilə birbaşa əlaqə və azad elan paylaşımı." />
          <RoleBlock icon={User} title="Müştərilər üçün" desc='"İstənilən Şey" xidməti: Ünvanı deyin, kuryer istənilən dükandan məhsulu alıb sizə gətirsin. Qiymət şəffafdır.' />
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-xl font-bold">Çatdırılma qiyməti necə hesablanır?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tier 1: 1 km-ə qədər → 1.50 AZN. Tier 2: 1–10 km arası hər başlanan km +0.50 AZN.
            Tier 3: 10 km-dən sonra hər başlanan km +0.40 AZN (uzaq məsafə endirimi).
          </p>
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Məsafə</th>
                  <th className="px-4 py-2 font-semibold">Qiymət</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((d) => (
                  <tr key={d} className="border-t border-border">
                    <td className="px-4 py-2">{d} km</td>
                    <td className="px-4 py-2 font-bold text-primary">{formatAzn(calcDeliveryFee(d))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function RoleBlock({ icon: Icon, title, desc }: { icon: typeof Bike; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
