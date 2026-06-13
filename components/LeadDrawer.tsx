"use client";

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
} from "lucide-react";

export function LeadDrawer() {
  const id = useDeck((s) => s.selectedLeadId);
  const lead = useDeck((s) => s.leads.find((l) => l.id === id));
  const close = useDeck((s) => s.selectLead);
  const runLeadPipeline = useDeck((s) => s.runLeadPipeline);
  const escalateLead = useDeck((s) => s.escalateLead);
  const done = lead && (lead.stage === "won" || lead.stage === "lost");
  useEscape(!!lead, () => close(null));

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
              <button
                onClick={() => close(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
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
                data-testid="btn-run-pipeline"
                disabled={!!done}
                onClick={() => runLeadPipeline(lead.id)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-prospect/15 py-2.5 text-[13px] font-semibold text-prospect transition-colors hover:bg-prospect/25 disabled:opacity-40"
              >
                {done ? `Pipeline finalizado · ${STAGE_LABEL[lead.stage]}` : "Ejecutar pipeline completo"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-lg border border-border bg-surface py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:text-text">
                  Programar seguimiento
                </button>
                <button
                  data-testid="btn-escalate"
                  onClick={() => escalateLead(lead.id)}
                  className="rounded-lg bg-hot/15 py-2.5 text-[12px] font-semibold text-hot transition-colors hover:bg-hot/25"
                >
                  Escalar a humano
                </button>
              </div>
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
