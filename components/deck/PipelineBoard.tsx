"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/demo/data";
import { STAGE_TINT, TEMP_COLOR } from "@/lib/ui";
import { fmtMoney } from "@/lib/utils";

export function PipelineBoard({ compact = false }: { compact?: boolean }) {
  const leads = useDeck((s) => s.leads);
  const selectLead = useDeck((s) => s.selectLead);

  const stages = STAGE_ORDER;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-[13px] font-semibold text-text">Pipeline comercial</p>
        <p className="text-[11px] text-text-dim">
          {leads.filter((l) => l.stage !== "lost").length} oportunidades en curso
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto p-3">
        {stages.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          const value = items.reduce(
            (acc, l) => acc + (l.closeProbability / 100) * 3200,
            0
          );
          return (
            <div
              key={stage}
              className="flex w-[176px] shrink-0 flex-col rounded-xl border border-border bg-bg-soft/50"
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STAGE_TINT[stage] }}
                  />
                  <span className="text-[11px] font-semibold text-text">
                    {STAGE_LABEL[stage]}
                  </span>
                </div>
                <span className="stat-num text-[11px] text-text-dim">{items.length}</span>
              </div>
              <div className="px-3 pb-2">
                <span className="stat-num text-[10px] text-email">{fmtMoney(value)}</span>
              </div>

              <div
                className={`flex flex-col gap-1.5 overflow-y-auto px-2 pb-2 ${
                  compact ? "max-h-[180px]" : "max-h-[440px]"
                }`}
              >
                <AnimatePresence initial={false}>
                  {items.slice(0, compact ? 4 : 30).map((l) => (
                    <motion.button
                      key={l.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      onClick={() => selectLead(l.id)}
                      className="rounded-lg border border-border bg-surface/70 px-2.5 py-2 text-left transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-medium text-text">
                          {l.company}
                        </span>
                        <span
                          className="stat-num shrink-0 text-[10px] font-medium"
                          style={{ color: TEMP_COLOR[l.temperature] }}
                        >
                          {l.score}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-text-dim">
                        {l.city} · {l.category}
                      </p>
                    </motion.button>
                  ))}
                </AnimatePresence>
                {items.length === 0 && (
                  <p className="px-1 py-3 text-center text-[10px] text-text-dim">vacío</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
