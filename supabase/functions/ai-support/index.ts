import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Sən VeloX-in 24/7 dəstək botusan. VeloX qaydaları:
- Kuryerlər üçün gündəlik 1 AZN giriş haqqı (Daily Pass) — 24 saat sifariş görmək üçün.
- Mağazalar üçün 0% komissiya. Heç bir gizli ödəniş yoxdur.
- Çatdırılma qiyməti məsafəyə görə avtomatik hesablanır:
  • 1 km-ə qədər: 1.50 AZN
  • 1–10 km arası: 1.50 + (km - 1) × 0.50 AZN
  • 10 km-dən sonra: əlavə hər km +0.40 AZN (uzaq məsafə endirimi)
- Üç rol var: Kuryer, Mağaza, Müştəri. Hər biri öz panelinə malikdir.
- "İstənilən Şey" xidməti: müştəri xəritədə A və B nöqtələrini seçir, kuryer çatdırır.
- DM: hər istifadəçi başqası ilə birbaşa mesajlaşa bilər.
Cavabları qısa, dostcasına və Azərbaycan dilində ver. Yalnız VeloX haqqında suallara cavab ver.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Çox sorğu, bir az sonra yenidən cəhd edin." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI kreditləri bitib." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error", r.status, t);
      return new Response(JSON.stringify({ error: "AI xidməti əlçatmazdır." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content ?? "...";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
