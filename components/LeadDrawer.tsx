"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { useEscape } from "@/lib/useEscape";
import { STAGE_LABEL } from "@/lib/demo/data";
import { TEMP_COLOR, TEMP_LABEL } from "@/lib/ui";
import { cn } from "@/lib/utils";
import {
  X,
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  UserPlus,
  ShieldAlert,
  Microscope,
  Loader2,
  Copy,
  Check,
  MessageCircle,
  Send,
  CheckCircle2,
  XCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ResearchData {
  digitalScore?: number;
  strengths?: string[];
  gaps?: string[];
  needs?: string[];
  hook?: string;
  competitorNote?: string;
}

export function LeadDrawer() {
  const id = useDeck((s) => s.selectedLeadId);
  const lead = useDeck((s) => s.leads.find((l) => l.id === id));
  const close = useDeck((s) => s.selectLead);
  const runLeadPipeline = useDeck((s) => s.runLeadPipeline);
  const escalateLead = useDeck((s) => s.escalateLead);
  const markContacted = useDeck((s) => s.markContacted);
  const advanceLead = useDeck((s) => s.advanceLead);
  const runAIPipelineLead = useDeck((s) => s.runAIPipelineLead);
  const setLeadResearch = useDeck((s) => s.setLeadResearch);
  const ai = useDeck((s) => s.aiPipeline);
  // Lista navegable (mismo orden que la vista de Leads: por score)
  const navList = useDeck((s) => [...s.leads].sort((a, b) => b.score - a.score).map((l) => l.id));
  const done = lead && (lead.stage === "won" || lead.stage === "lost");
  useEscape(!!lead, () => close(null));

  function go(dir: 1 | -1) {
    if (!id) return;
    const i = navList.indexOf(id);
    const next = navList[i + dir];
    if (next) close(next); // selectLead(next)
  }

  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [researchMsg, setResearchMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyDraft() {
    if (!lead?.outreach) return;
    try {
      await navigator.clipboard.writeText(lead.outreach.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  }

  // Al cambiar de lead: muestra su investigación guardada (si existe) y limpia el resto.
  useEffect(() => {
    setResearch((lead?.research as ResearchData) ?? null);
    setResearchMsg(null);
    setResearching(false);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function investigate() {
    if (!lead) return;
    setResearching(true);
    setResearchMsg(null);
    setResearch(null);
    try {
      const r = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: "research",
          payload: {
            company: lead.company,
            category: lead.category,
            city: lead.city,
            website: lead.website,
            hasWebsite: lead.hasWebsite,
            rating: lead.rating,
            reviews: lead.reviews,
          },
        }),
      });
      const j = await r.json();
      if (j.ok) { setResearch(j.data as ResearchData); setLeadResearch(lead.id, { ...(j.data as ResearchData), at: Date.now() }); }
      else if (j.noKey) setResearchMsg("Falta ANTHROPIC_API_KEY para investigar con IA.");
      else if (j.budgetExceeded) setResearchMsg("Tope de gasto diario alcanzado.");
      else setResearchMsg(j.error ?? "No se pudo investigar.");
    } catch (e: any) {
      setResearchMsg(String(e?.message ?? e));
    }
    setResearching(false);
  }

  return (
    <AnimatePresence>
      {lead && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => close(null)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-bg-soft shadow-panel"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="chip"
                    style={{
                      color: TEMP_COLOR[lead.temperature],
                      borderColor: `${TEMP_COLOR[lead.temperature]}40`,
                      background: `${TEMP_COLOR[lead.temperature]}12`,
                    }}
                  >
                    {TEMP_LABEL[lead.temperature]}
                  </span>
                  <span data-testid="lead-stage" className="chip border-border text-text-muted">
                    {STAGE_LABEL[lead.stage]}
                  </span>
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight text-text">
                  {lead.company}
                </h3>
                <p className="text-[12px] text-text-muted">{lead.category}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => go(-1)} title="Lead anterior" className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => go(1)} title="Siguiente lead" className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => close(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Scores */}
              <div className="grid grid-cols-3 gap-2.5">
                <ScoreCard label="Score" value={lead.score} tint="#22D3EE" />
                <ScoreCard label="Cierre %" value={lead.closeProbability} tint="#34D399" />
                <ScoreCard label="Digital" value={lead.digitalScore} tint="#A78BFA" />
              </div>

              {/* Contacto */}
              <Section title="Contacto">
                <Row icon={UserPlus} text={lead.contactName ?? "—"} />
                <Row icon={MapPin} text={`${lead.city}, ${lead.country}`} />
                <Row icon={Phone} text={lead.phone ?? "—"} />
                <Row icon={Mail} text={lead.email ?? "—"} />
                <Row
                  icon={Globe}
                  text={lead.website ?? "Sin sitio web — oportunidad alta"}
                  tint={lead.website ? undefined : "#FB7185"}
                />
              </Section>

              {/* Señales */}
              <Section title="Señales de mercado">
                <div className="flex items-center gap-4 text-[12px] text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-scoring" />
                    {lead.rating ?? "—"} · {lead.reviews ?? 0} reseñas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-email" />
                    {lead.hasWebsite ? "Tiene web" : "Sin web"}
                  </span>
                </div>
              </Section>

              {/* Necesidades */}
              <Section title="Necesidades detectadas">
                <div className="flex flex-wrap gap-1.5">
                  {lead.needs.map((n) => (
                    <span
                      key={n}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-muted"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </Section>

              {/* Investigación con IA (ORACLE / Claude) */}
              {(research || researchMsg) && (
                <Section title="Investigación IA · ORACLE">
                  {researchMsg && (
                    <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5 text-[12px] text-warn">
                      {researchMsg}
                    </div>
                  )}
                  {research && (
                    <div className="space-y-3">
                      {typeof research.digitalScore === "number" && (
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className="text-text-dim">Madurez digital:</span>
                          <span className="font-semibold text-text">{research.digitalScore}/100</span>
                        </div>
                      )}
                      {research.hook && (
                        <div className="rounded-lg border border-prospect/40 bg-prospect/10 px-3 py-2.5">
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-prospect">Ángulo de venta</p>
                          <p className="text-[12.5px] leading-relaxed text-text">{research.hook}</p>
                        </div>
                      )}
                      {research.gaps && research.gaps.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[11px] text-text-dim">Brechas detectadas</p>
                          <ul className="space-y-1">
                            {research.gaps.map((g, i) => (
                              <li key={i} className="flex gap-1.5 text-[12px] text-text-muted">
                                <span className="text-hot">•</span>
                                <span>{g}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {research.needs && research.needs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {research.needs.map((n, i) => (
                            <span
                              key={i}
                              className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-muted"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                      {research.competitorNote && (
                        <p className="text-[11.5px] italic leading-relaxed text-text-dim">
                          {research.competitorNote}
                        </p>
                      )}
                    </div>
                  )}
                </Section>
              )}

              {/* Mensaje preparado (borrador real, listo para enviar) */}
              {lead.outreach && (
                <Section title="Mensaje preparado · listo para enviar">
                  <div className="rounded-lg border border-email/40 bg-email/10 p-3">
                    {lead.outreach.sentAt ? (
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-ok">
                        <Check className="h-3.5 w-3.5" /> Marcado como enviado por ti
                      </p>
                    ) : (
                      <p className="mb-2 text-[10px] uppercase tracking-wide text-email">
                        Borrador — no se ha enviado solo
                      </p>
                    )}
                    <p data-testid="outreach-message" className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-text">
                      {lead.outreach.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        data-testid="btn-copy-draft"
                        onClick={copyDraft}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:text-text"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                      {lead.phone && (
                        <a
                          data-testid="btn-open-whatsapp"
                          href={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(lead.outreach.message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-email/30 bg-email/15 px-2.5 py-1.5 text-[11px] font-semibold text-email transition-colors hover:bg-email/25"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.outreach.subject ?? "")}&body=${encodeURIComponent(lead.outreach.message)}`}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:text-text"
                        >
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              {/* Consentimiento */}
              <Section title="Cumplimiento">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-[12px]">
                  <ShieldAlert className="h-4 w-4 text-warn" />
                  <span className="text-text-muted">
                    Consentimiento:{" "}
                    <span className="font-medium text-text">{lead.consent}</span>
                  </span>
                </div>
              </Section>
            </div>

            {/* Acciones REALES */}
            <div className="border-t border-border p-4">
              <button
                data-testid="btn-investigate-ai"
                disabled={researching}
                onClick={investigate}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-scoring/15 py-2.5 text-[13px] font-semibold text-scoring transition-colors hover:bg-scoring/25 disabled:opacity-50"
              >
                {researching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Investigando con Claude…
                  </>
                ) : (
                  <>
                    <Microscope className="h-4 w-4" />
                    {research ? "Volver a investigar (IA)" : "Investigar con IA"}
                  </>
                )}
              </button>
              <button
                data-testid="btn-ai-pipeline-lead"
                disabled={!!done || ai.running}
                onClick={() => runAIPipelineLead(lead.id)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-director/15 py-2.5 text-[13px] font-semibold text-director transition-colors hover:bg-director/25 disabled:opacity-40"
              >
                {ai.running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Ejecutando pipeline IA…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" /> Pipeline completo con IA
                  </>
                )}
              </button>
              <button
                data-testid="btn-run-pipeline"
                disabled={!!done}
                onClick={() => runLeadPipeline(lead.id)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-prospect/15 py-2.5 text-[13px] font-semibold text-prospect transition-colors hover:bg-prospect/25 disabled:opacity-40"
              >
                {done
                  ? `Cerrado · ${STAGE_LABEL[lead.stage]}`
                  : lead.outreach
                    ? "Volver a preparar (rápido, sin IA)"
                    : "Preparar mensaje (rápido, sin IA)"}
              </button>
              {ai.note && <p className="mb-2 text-[11px] text-text-muted">{ai.note}</p>}

              {/* Desenlace REAL — lo registras tú según lo que de verdad pase */}
              <p className="mb-1.5 mt-1 text-[10px] uppercase tracking-wide text-text-dim">
                Registrar lo que pasó de verdad
              </p>
              <div className="mb-2 grid grid-cols-3 gap-2">
                <button
                  data-testid="btn-mark-contacted"
                  disabled={!!done}
                  onClick={() => markContacted(lead.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-email/30 bg-email/10 py-2 text-[11px] font-semibold text-email transition-colors hover:bg-email/20 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" /> Contactado
                </button>
                <button
                  data-testid="btn-mark-won"
                  disabled={!!done}
                  onClick={() => advanceLead(lead.id, "won")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-ok/30 bg-ok/10 py-2 text-[11px] font-semibold text-ok transition-colors hover:bg-ok/20 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ganado
                </button>
                <button
                  data-testid="btn-mark-lost"
                  disabled={!!done}
                  onClick={() => advanceLead(lead.id, "lost")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-2 text-[11px] font-semibold text-text-muted transition-colors hover:text-text disabled:opacity-40"
                >
                  <XCircle className="h-3.5 w-3.5" /> Perdido
                </button>
              </div>
              <button
                data-testid="btn-escalate"
                onClick={() => escalateLead(lead.id)}
                className="w-full rounded-lg bg-hot/15 py-2.5 text-[12px] font-semibold text-hot transition-colors hover:bg-hot/25"
              >
                Escalar a humano
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ScoreCard({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3 text-center">
      <p className="stat-num text-[22px] font-medium" style={{ color: tint }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="label-eyebrow mb-2.5">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, text, tint }: { icon: any; text: string; tint?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]" style={{ color: tint }}>
      <Icon className={cn("h-3.5 w-3.5", !tint && "text-text-dim")} />
      <span className={cn(!tint && "text-text-muted")}>{text}</span>
    </div>
  );
}
