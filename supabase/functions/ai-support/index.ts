import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTS: Record<string, string> = {
  az: `Sən VeloX-in 24/7 dəstək botusan. Qaydalar:
- Kuryerlər üçün gündəlik 1 AZN giriş haqqı (24 saat).
- Mağazalar üçün 0% komissiya.
- Çatdırılma qiyməti məsafəyə görə avtomatik hesablanır.
- 3 rol var: Kuryer, Mağaza, Müştəri.
- "İstənilən Şey" xidməti: A və B nöqtəsi xəritədə.
Cavabları qısa, dostcasına və YALNIZ Azərbaycan dilində ver.`,
  en: `You are VeloX's 24/7 support bot. Rules:
- Couriers pay a flat 1 AZN daily pass (24h order access).
- Stores pay 0% commission.
- Delivery price is auto-calculated by distance.
- 3 roles: Courier, Store, Customer.
- "Get Anything" service: pick A and B on the map.
Reply concisely, friendly and ONLY in English.`,
  ru: `Ты — бот поддержки VeloX 24/7. Правила:
- Курьеры платят 1 AZN в день за доступ к заказам (24 ч).
- Магазины — 0% комиссии.
- Цена доставки рассчитывается автоматически по расстоянию.
- 3 роли: Курьер, Магазин, Клиент.
- Сервис «Доставка чего угодно»: точки A и B на карте.
Отвечай кратко, дружелюбно и ТОЛЬКО на русском.`,
  tr: `VeloX 7/24 destek botusun. Kurallar:
- Kuryeler için günlük 1 AZN geçiş ücreti (24 saat).
- Mağazalar için %0 komisyon.
- Teslimat ücreti mesafeye göre otomatik hesaplanır.
- 3 rol: Kurye, Mağaza, Müşteri.
- "Her Şey Getir" hizmeti: haritada A ve B noktası.
Cevapları kısa, samimi ve SADECE Türkçe ver.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, language } = await req.json();
    const lng = (typeof language === "string" && PROMPTS[language]) ? language : "az";
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: PROMPTS[lng] }, ...messages],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      const errMap: Record<string, string> = {
        az: "AI xidməti əlçatmazdır.", en: "AI service unavailable.",
        ru: "AI-сервис недоступен.", tr: "AI servisi kullanılamıyor.",
      };
      if (r.status === 429) return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error", r.status, t);
      return new Response(JSON.stringify({ error: errMap[lng] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content ?? "...";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
