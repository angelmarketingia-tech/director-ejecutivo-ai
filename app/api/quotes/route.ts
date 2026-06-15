import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, currentUser, vstr } from "@/lib/security";
import { listQuotes, createQuote, setQuotePaid, type QuoteItem } from "@/lib/billing";
import { createPaymentLink } from "@/lib/integrations/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rl = rateLimit(req, "quotes-get", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ ok: true, quotes: await listQuotes() });
}

export async function POST(req: Request) {
  const rl = rateLimit(req, "quotes-post", 40, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo el admin factura" }, { status: 403 });

  const { data, bad } = await readJsonLimited(req, 12_000);
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  const action = vstr((data as any)?.action, 20) ?? "create";

  if (action === "pay") {
    const slug = vstr((data as any)?.slug, 60);
    if (!slug) return NextResponse.json({ ok: false, error: "Falta slug" }, { status: 400 });
    await setQuotePaid(slug, (data as any)?.paid !== false);
    return NextResponse.json({ ok: true, quotes: await listQuotes() });
  }

  // crear
  const company = vstr((data as any)?.company, 120);
  if (!company) return NextResponse.json({ ok: false, error: "Falta 'company'" }, { status: 400 });
  const items: QuoteItem[] = Array.isArray((data as any)?.items)
    ? (data as any).items.map((it: any) => ({ desc: vstr(it?.desc, 200) ?? "Servicio", qty: Math.max(1, Number(it?.qty) || 1), price: Math.max(0, Number(it?.price) || 0) })).filter((it: QuoteItem) => it.price > 0)
    : [];
  if (!items.length) return NextResponse.json({ ok: false, error: "Agrega al menos un ítem con precio" }, { status: 400 });

  const total = items.reduce((n, it) => n + it.qty * it.price, 0);
  const origin = new URL(req.url).origin;
  const paymentUrl = (await createPaymentLink(total, `Servicio web - ${company}`, origin)) ?? undefined;
  const q = await createQuote({
    company,
    contact: vstr((data as any)?.contact, 120) ?? undefined,
    phone: vstr((data as any)?.phone, 40) ?? undefined,
    items,
    note: vstr((data as any)?.note, 1000) ?? undefined,
    paymentUrl,
  });
  return NextResponse.json({ ok: true, quote: q, url: `${origin}/q/${q.slug}`, quotes: await listQuotes() });
}
