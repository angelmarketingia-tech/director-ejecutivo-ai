"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { Receipt, Plus, Copy, Check, ExternalLink, MessageCircle, Loader2, Repeat, Coins, BadgeDollarSign } from "lucide-react";

const cop = (n: number) => "$" + (n || 0).toLocaleString("es-CO");

interface Quote { slug: string; company: string; phone?: string; total: number; status: "sent" | "paid"; createdAt: number; }
interface Sub { id: string; client: string; plan: string; monthly: number; status: string; }

export function BillingView() {
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // form cotización
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [itemDesc, setItemDesc] = useState("Página web profesional");
  const [itemPrice, setItemPrice] = useState("800000");
  const [creating, setCreating] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  // form suscripción
  const [subClient, setSubClient] = useState("");
  const [subMonthly, setSubMonthly] = useState("120000");

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const meR = await (await fetch("/api/me")).json().catch(() => null);
      if (meR?.ok) setMe({ role: meR.role });
      const q = await (await fetch("/api/quotes")).json().catch(() => null);
      if (q?.ok) setQuotes(q.quotes);
      const s = await (await fetch("/api/subs")).json().catch(() => null);
      if (s?.ok) { setSubs(s.subs); setSummary(s.summary); }
    } catch {}
    setLoading(false);
  }

  async function createQuote() {
    if (!company.trim() || !Number(itemPrice)) return;
    setCreating(true); setLastUrl(null);
    const r = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", company, phone, items: [{ desc: itemDesc, qty: 1, price: Number(itemPrice) }] }) });
    const j = await r.json();
    if (j.ok) { setQuotes(j.quotes); setLastUrl(j.url); setCompany(""); setPhone(""); }
    setCreating(false);
  }
  async function pay(slug: string, paid: boolean) {
    const j = await (await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pay", slug, paid }) })).json();
    if (j.ok) setQuotes(j.quotes);
  }
  async function addSub() {
    if (!subClient.trim() || !Number(subMonthly)) return;
    const j = await (await fetch("/api/subs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", client: subClient, plan: "Mantenimiento", monthly: Number(subMonthly) }) })).json();
    if (j.ok) { setSubs(j.subs); setSummary(j.summary); setSubClient(""); }
  }
  async function subStatus(id: string, status: string) {
    const j = await (await fetch("/api/subs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", id, status }) })).json();
    if (j.ok) { setSubs(j.subs); setSummary(j.summary); }
  }
  function copy(url: string) { navigator.clipboard.writeText(url).then(() => { setCopied(url); setTimeout(() => setCopied(null), 1500); }).catch(() => {}); }
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) return <div className="panel flex items-center gap-2 p-4 text-[12px] text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando facturación…</div>;
  if (me && me.role !== "admin") return <div className="panel p-4 text-[12px] text-text-muted">La facturación es solo para administración.</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen financiero */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-2"><BadgeDollarSign className="h-4 w-4 text-ok" /><p className="text-[13px] font-semibold text-text">Finanzas</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Cobrado" value={cop(summary?.paidTotal)} tint="#34D399" />
          <Stat label="Por cobrar" value={cop(summary?.sentTotal)} tint="#FBBF24" />
          <Stat label="MRR (recurrente)" value={cop(summary?.mrr)} tint="#22D3EE" />
          <Stat label="Costo IA (USD)" value={"$" + (summary?.iaCostUsd ?? 0)} tint="#A78BFA" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cotizaciones */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-prospect" /><p className="text-[13px] font-semibold text-text">Cotizaciones</p></div>
          <div className="grid grid-cols-1 gap-2">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Cliente / negocio" className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50" />
            <div className="grid grid-cols-2 gap-2">
              <input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Concepto" className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50" />
              <input value={itemPrice} onChange={(e) => setItemPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="Precio COP" inputMode="numeric" className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50" />
            </div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp del cliente (opcional)" className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50" />
            <button data-testid="btn-create-quote" onClick={createQuote} disabled={creating || !company.trim()} className="flex items-center justify-center gap-2 rounded-lg bg-prospect/15 py-2 text-[12px] font-semibold text-prospect hover:bg-prospect/25 disabled:opacity-40">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear cotización
            </button>
          </div>
          {lastUrl && (
            <div className="mt-2 rounded-lg border border-prospect/40 bg-prospect/10 p-2.5">
              <a href={lastUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[11px] text-text underline">{lastUrl}</a>
              <div className="mt-1.5 flex gap-2">
                <button onClick={() => copy(lastUrl)} className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[10px] text-text-muted">{copied === lastUrl ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />} link</button>
                {phone && <a href={`https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Te comparto la cotización: " + lastUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded border border-email/30 bg-email/10 px-2 py-1 text-[10px] text-email"><MessageCircle className="h-3 w-3" /> WhatsApp</a>}
              </div>
            </div>
          )}
          <div className="mt-3 flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-1">
            {quotes.length === 0 && <p className="text-[11px] text-text-dim">Sin cotizaciones aún.</p>}
            {quotes.map((q) => (
              <div key={q.slug} className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-text">{q.company} · <span className="stat-num">{cop(q.total)}</span></p>
                  <p className="text-[10px] text-text-dim">hace {timeAgo(q.createdAt)}</p>
                </div>
                <a href={`${origin}/q/${q.slug}`} target="_blank" rel="noopener noreferrer" className="text-text-dim hover:text-text" title="Abrir"><ExternalLink className="h-3.5 w-3.5" /></a>
                <button onClick={() => pay(q.slug, q.status !== "paid")} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${q.status === "paid" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
                  {q.status === "paid" ? "Pagada" : "Marcar pagada"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Suscripciones / MRR */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2"><Repeat className="h-4 w-4 text-email" /><p className="text-[13px] font-semibold text-text">Mantenimiento mensual (MRR)</p></div>
          <div className="grid grid-cols-1 gap-2">
            <input value={subClient} onChange={(e) => setSubClient(e.target.value)} placeholder="Cliente" className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-email/50" />
            <div className="flex gap-2">
              <input value={subMonthly} onChange={(e) => setSubMonthly(e.target.value.replace(/[^\d]/g, ""))} placeholder="Valor mensual COP" inputMode="numeric" className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-email/50" />
              <button data-testid="btn-add-sub" onClick={addSub} disabled={!subClient.trim()} className="flex items-center gap-1.5 rounded-lg bg-email/15 px-3 py-2 text-[12px] font-semibold text-email hover:bg-email/25 disabled:opacity-40"><Plus className="h-4 w-4" /> Añadir</button>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-email/20 bg-email/5 px-3 py-2 text-[12px] text-text">
            <Coins className="mr-1.5 inline h-3.5 w-3.5 text-email" /> MRR actual: <b className="stat-num">{cop(summary?.mrr)}</b> · {summary?.activeSubs ?? 0} activos
          </div>
          <div className="mt-2 flex max-h-[220px] flex-col gap-1.5 overflow-y-auto pr-1">
            {subs.length === 0 && <p className="text-[11px] text-text-dim">Sin suscripciones aún.</p>}
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-text">{s.client} · <span className="stat-num">{cop(s.monthly)}</span>/mes</p>
                  <p className="text-[10px] text-text-dim">{s.plan} · {s.status}</p>
                </div>
                <button onClick={() => subStatus(s.id, s.status === "active" ? "paused" : "active")} className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-text-muted hover:text-text">
                  {s.status === "active" ? "Pausar" : "Activar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <p className="stat-num text-[16px] font-medium" style={{ color: tint }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-text-dim">{label}</p>
    </div>
  );
}
