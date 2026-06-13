"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { LEVEL_COLOR } from "@/lib/ui";
import { timeAgo } from "@/lib/utils";
import { Terminal } from "lucide-react";

const AGENT_TAG: Record<string, string> = {
  director: "ATLAS",
  prospect: "SCOUT",
  research: "ORACLE",
  scoring: "FORGE",
  email: "QUILL",
  voice: "ECHO",
};

export function ActivityConsole() {
  const events = useDeck((s) => s.events);

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-prospect" />
          <p className="text-[13px] font-semibold text-text">Consola de actividad</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-dim">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface/60"
            >
              <span className="stat-num mt-0.5 shrink-0 text-[10px] text-text-dim">
                {timeAgo(e.at)}
              </span>
              <span
                className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase"
                style={{ background: `${LEVEL_COLOR[e.level]}1a`, color: LEVEL_COLOR[e.level] }}
              >
                {AGENT_TAG[e.agent]}
              </span>
              <p className="font-mono text-[11px] leading-relaxed text-text-muted">
                {e.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
