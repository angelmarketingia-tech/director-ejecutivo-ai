"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { Bot, Loader2, Save, Send, Plus, Trash2, MessageCircle, CheckCircle2, XCircle, Power } from "lucide-react";

interface FAQ { q: string; a: string }
interface KB { businessName: string; about: string; services: string; pricing: string; faqs: FAQ[]; tone: string; optOutWord: string; autoReplyEnabled: boolean; extraNotes?: string; }
interface LogE { at: number; from: string; inbound: string; outbound: string; auto: boolean }

export function WhatsAppBot() {
  const [kb, setKb] = useState<KB | null>(null);
  const [waLive, setWaLive] = useState(false);
  const [role, setRole] = useState<string>("member");
  const [log, setLog] = useState<LogE[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("¿Cuánto cuesta una página web?");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const r = await fetch("/api/knowledge");
      const j = await r.json();
      if (j.ok) { setKb(j.kb); setWaLive(j.waLive); setRole(j.role); setLog(j.log || []); }
    } catch {}
    setLoading(false);
  }
  const admin = role === "admin";

  async function save(patch: Partial<KB>) {
    if (!kb) return;
    setSaving(true); setSavedMsg(null);
    const next = { ...kb, ...patch };
    setKb(next);
    try {
      const r = await fetch("/api/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const j = await r.json();
      if (j.ok) { setKb(j.kb); setSavedMsg("✅ Guardado"); } else setSavedMsg("⚠️ " + (j.error || "no se pudo guardar"));
    } catch { setSavedMsg("⚠️ error de red"); }
    setSaving(false);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function test() {
    setTesting(true); setTestReply(null);
    try {
      const r = await fetch("/api/whatsapp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: testInput }) });
      const j = await r.json();
      setTestReply(j.ok ? j.reply : "⚠️ " + (j.error || "error"));
    } catch (e: any) { setTestReply("⚠️ " + String(e?.message ?? e)); }
    setTesting(false);
  }

  if (loading) return <div className="panel flex items-center gap-2 p-4 text-[12px] text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando asistente…</div>;
  if (!kb) return null;

  const field = (label: string, key: keyof KB, rows = 3) => (
    <div>
      <p className="label-eyebrow mb-1">{label}</p>
      <textarea
        value={(kb[key] as string) ?? ""}
        onChange={(e) => setKb({ ...kb, [key]: e.target.value })}
        disabled={!admin}
        rows={rows}
        className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-email/50 disabled:opacity-70"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Estado + interruptor */}
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Bot className="h-4 w-4 text-email" />
          <p className="text-[13px] font-semibold text-text">Asistente de WhatsApp · auto-respuesta</p>
          <span className={`ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${waLive ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
            {waLive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {waLive ? "Conector conectado" : "Conector apagado"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[12px] text-text">
            <Power className={`h-4 w-4 ${kb.autoReplyEnabled ? "text-ok" : "text-text-dim"}`} />
            Auto-respuesta {kb.autoReplyEnabled ? "ACTIVADA" : "desactivada"}
          </div>
          <button
            disabled={!admin || saving}
            onClick={() => save({ autoReplyEnabled: !kb.autoReplyEnabled })}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${kb.autoReplyEnabled ? "bg-hot/15 text-hot hover:bg-hot/25" : "bg-ok/15 text-ok hover:bg-ok/25"}`}
          >
            {kb.autoReplyEnabled ? "Desactivar" : "Activar"}
          </button>
        </div>
        {!waLive && (
          <div className="mt-2 rounded-lg border border-border bg-surface/40 px-3 py-2 text-[11px] leading-relaxed text-text-dim">
            El <b>conector de WhatsApp Web</b> está apagado. En tu PC, dentro de la carpeta <span className="text-text-muted">whatsapp-connector</span>, ejecuta <span className="text-text-muted">node index.js</span> (con <span className="text-text-muted">API_SHARED_SECRET</span> igual al de Vercel), escanea el QR con WhatsApp Business → Dispositivos vinculados y deja la ventana abierta. Aquí se pondrá en <span className="text-ok">verde</span> solo. Mientras tanto, puedes probar el bot abajo. ✅
          </div>
        )}
      </div>

      {/* Probador (funciona ya, sin WhatsApp conectado) */}
      <div className="panel p-4">
        <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-text"><MessageCircle className="h-4 w-4 text-prospect" /> Probar respuesta del bot</p>
        <div className="flex gap-2">
          <input value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Escribe como cliente…" className="min-w-0 flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50" />
          <button data-testid="btn-wa-test" disabled={testing || !testInput.trim()} onClick={test} className="flex items-center gap-1.5 rounded-lg border border-prospect/30 bg-prospect/10 px-3 py-2 text-[12px] font-semibold text-prospect disabled:opacity-40">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Probar
          </button>
        </div>
        {testReply && (
          <div data-testid="wa-test-reply" className="mt-2 max-w-[85%] rounded-2xl rounded-bl-sm bg-email/15 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text">{testReply}</div>
        )}
      </div>

      {/* Base de conocimiento */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-[13px] font-semibold text-text">Base de conocimiento</p>
          {!admin && <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] text-text-dim">solo lectura (admin edita)</span>}
          {savedMsg && <span className="ml-auto text-[11px] text-text-muted">{savedMsg}</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("Negocio", "businessName", 1)}
          {field("Tono y reglas", "tone", 2)}
          {field("Sobre el negocio", "about", 3)}
          {field("Servicios", "services", 4)}
          {field("Precios", "pricing", 4)}
          {field("Palabra de baja (opt-out)", "optOutWord", 1)}
        </div>

        {/* Recomendaciones / archivos */}
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2">
            <p className="label-eyebrow">Recomendaciones / contexto extra (la IA lo usa)</p>
            {admin && (
              <label className="cursor-pointer rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-muted hover:text-text">
                + Cargar archivo (.txt/.md)
                <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f || !kb) return;
                  const txt = await f.text();
                  setKb({ ...kb, extraNotes: ((kb.extraNotes || "") + "\n\n# " + f.name + "\n" + txt).slice(0, 12000) });
                  e.currentTarget.value = "";
                }} />
              </label>
            )}
          </div>
          <textarea
            value={kb.extraNotes ?? ""}
            onChange={(e) => setKb({ ...kb, extraNotes: e.target.value })}
            disabled={!admin}
            rows={4}
            placeholder="Ej. Ofrecemos 20% de descuento por pago anticipado. Casos de éxito: ... Horarios de atención: ..."
            className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-email/50 disabled:opacity-70"
          />
        </div>

        {/* FAQs */}
        <p className="label-eyebrow mb-1.5 mt-4">Preguntas frecuentes</p>
        <div className="flex flex-col gap-2">
          {kb.faqs.map((f, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-surface/40 p-2">
              <div className="flex-1 space-y-1">
                <input value={f.q} disabled={!admin} onChange={(e) => { const faqs = [...kb.faqs]; faqs[i] = { ...f, q: e.target.value }; setKb({ ...kb, faqs }); }} placeholder="Pregunta" className="w-full rounded-md border border-border bg-bg-soft px-2 py-1 text-[11px] text-text outline-none disabled:opacity-70" />
                <input value={f.a} disabled={!admin} onChange={(e) => { const faqs = [...kb.faqs]; faqs[i] = { ...f, a: e.target.value }; setKb({ ...kb, faqs }); }} placeholder="Respuesta" className="w-full rounded-md border border-border bg-bg-soft px-2 py-1 text-[11px] text-text outline-none disabled:opacity-70" />
              </div>
              {admin && <button onClick={() => setKb({ ...kb, faqs: kb.faqs.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5 text-text-dim hover:text-hot" /></button>}
            </div>
          ))}
          {admin && (
            <button onClick={() => setKb({ ...kb, faqs: [...kb.faqs, { q: "", a: "" }] })} className="flex items-center gap-1.5 self-start rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              <Plus className="h-3.5 w-3.5" /> Añadir FAQ
            </button>
          )}
        </div>

        {admin && (
          <button data-testid="btn-kb-save" disabled={saving} onClick={() => save({})} className="mt-3 flex items-center gap-2 rounded-lg bg-email/15 px-3 py-2 text-[12px] font-semibold text-email hover:bg-email/25 disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar base de conocimiento
          </button>
        )}
      </div>

      {/* Conversaciones del bot (admin) */}
      {admin && log.length > 0 && (
        <div className="panel p-4">
          <p className="mb-2 text-[13px] font-semibold text-text">Conversaciones recientes del bot</p>
          <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
            {log.map((e, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface/40 p-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] text-text-dim">
                  <span>{e.from}</span><span>{e.auto ? "auto" : "manual"} · hace {timeAgo(e.at)}</span>
                </div>
                <p className="text-[11.5px] text-text-muted"><b className="text-text">Cliente:</b> {e.inbound}</p>
                <p className="mt-0.5 text-[11.5px] text-text-muted"><b className="text-email">Bot:</b> {e.outbound}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
