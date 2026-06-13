"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { TEMP_COLOR } from "@/lib/ui";
import { Flame, ArrowUpRight } from "lucide-react";

export function HotLeads() {
  const leads = useDeck((s) => s.leads);
  const selectLead = useDeck((s) => s.selectLead);

  const hot = leads
    .filter((l) => l.temperature === "hot" && l.stage !== "won" && l.stage !== "lost")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-hot" />
          <p className="text-[13px] font-semibold text-text">Oportunidades calientes</p>
        </div>
        <span className="stat-num rounded-full bg-hot/15 px-2 py-0.5 text-[11px] font-medium text-hot">
          {hot.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-2">
        {hot.length === 0 && (
          <p className="px-3 py-6 text-center text-[12px] text-text-dim">
            Sin leads calientes todavía. El sistema los marcará al calificar.
          </p>
        )}
        <AnimatePresence initial={false}>
          {hot.map((l) => (
            <motion.button
              key={l.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => selectLead(l.id)}
              className="group flex items-center gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2 text-left transition-colors hover:border-hot/30 hover:bg-hot/5"
            >
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-semibold"
                style={{ background: `${TEMP_COLOR.hot}1a`, color: TEMP_COLOR.hot }}
              >
                {l.score}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[12px] font-medium text-text">{l.company}</p>
                <p className="truncate text-[10px] text-text-dim">
                  {l.category} · {l.city}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-text-dim transition-colors group-hover:text-hot" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
