/**
 * Facturación: cotizaciones (con link público y pago) y suscripciones (mantenimiento
 * mensual = MRR). Persistido en KV. Es el módulo para FACTURAR de verdad.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface QuoteItem { desc: string; qty: number; price: number }
export interface Quote {
  slug: string;
  company: string;
  contact?: string;
  phone?: string;
  items: QuoteItem[];
  total: number;
  note?: string;
  status: "sent" | "paid";
  paymentUrl?: string;
  createdAt: number;
  paidAt?: number;
}
export interface Subscription {
  id: string;
  client: string;
  plan: string;
  monthly: number;
  status: "active" | "paused" | "cancelled";
  since: number;
}

const QKEY = "quotes:v1";
const SKEY = "subs:v1";

function slugify(s: string): string {
  return (s || "cot").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "cot";
}

// ── Cotizaciones ──
export async function listQuotes(): Promise<Quote[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<Quote[]>(QKEY)) ?? [];
}
export async function getQuote(slug: string): Promise<Quote | null> {
  return (await listQuotes()).find((q) => q.slug === slug) ?? null;
}
export async function createQuote(data: { company: string; contact?: string; phone?: string; items: QuoteItem[]; note?: string; paymentUrl?: string }): Promise<Quote> {
  const total = data.items.reduce((n, it) => n + (it.qty || 1) * (it.price || 0), 0);
  const rand = Math.random().toString(36).slice(2, 6);
  const q: Quote = {
    slug: `${slugify(data.company)}-${rand}`,
    company: data.company,
    contact: data.contact,
    phone: data.phone,
    items: data.items,
    total,
    note: data.note,
    status: "sent",
    paymentUrl: data.paymentUrl,
    createdAt: Date.now(),
  };
  const all = await listQuotes();
  all.unshift(q);
  if (kvConfigured()) await kvSetJSON(QKEY, all.slice(0, 1000));
  return q;
}
export async function setQuotePaid(slug: string, paid: boolean): Promise<void> {
  const all = await listQuotes();
  const q = all.find((x) => x.slug === slug);
  if (q) { q.status = paid ? "paid" : "sent"; q.paidAt = paid ? Date.now() : undefined; if (kvConfigured()) await kvSetJSON(QKEY, all); }
}

// ── Suscripciones (MRR) ──
export async function listSubs(): Promise<Subscription[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<Subscription[]>(SKEY)) ?? [];
}
export async function addSub(data: { client: string; plan: string; monthly: number }): Promise<Subscription> {
  const s: Subscription = { id: `sub_${Date.now()}`, client: data.client, plan: data.plan, monthly: data.monthly, status: "active", since: Date.now() };
  const all = await listSubs();
  all.unshift(s);
  if (kvConfigured()) await kvSetJSON(SKEY, all.slice(0, 1000));
  return s;
}
export async function setSubStatus(id: string, status: Subscription["status"]): Promise<void> {
  const all = await listSubs();
  const s = all.find((x) => x.id === id);
  if (s) { s.status = status; if (kvConfigured()) await kvSetJSON(SKEY, all); }
}

// ── Resumen financiero ──
export async function financeSummary() {
  const quotes = await listQuotes();
  const subs = await listSubs();
  const paid = quotes.filter((q) => q.status === "paid");
  const sent = quotes.filter((q) => q.status === "sent");
  const mrr = subs.filter((s) => s.status === "active").reduce((n, s) => n + s.monthly, 0);
  return {
    quotesCount: quotes.length,
    sentTotal: sent.reduce((n, q) => n + q.total, 0),
    paidTotal: paid.reduce((n, q) => n + q.total, 0),
    paidCount: paid.length,
    mrr,
    activeSubs: subs.filter((s) => s.status === "active").length,
  };
}
