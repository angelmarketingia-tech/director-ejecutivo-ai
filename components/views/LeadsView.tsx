"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/demo/data";
import { TEMP_COLOR, TEMP_LABEL } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { LeadTemperature } from "@/lib/types";
import { Search } from "lucide-react";

const FILTERS: Array<{ id: "all" | LeadTemperature; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "hot", label: "Calientes" },
  { id: "warm", label: "Tibios" },
  { id: "cold", label: "Fríos" },
];

export function LeadsView() {
  const leads = useDeck((s) => s.leads);
  const selectLead = useDeck((s) => s.selectLead);
  const [filter, setFilter] = useState<"all" | LeadTemperature>("all");
  const [q, setQ] = useState("");

  const rows = leads
    .filter((l) => (filter === "all" ? true : l.temperature === filter))
    .filter((l) => l.company.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                filter === f.id
                  ? "bg-surface-2 text-text"
                  : "text-text-muted hover:text-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa…"
            className="w-56 rounded-lg border border-border bg-bg-soft py-2 pl-9 pr-3 text-[12px] text-text outline-none placeholder:text-text-dim focus:border-prospect/50"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wide text-text-dim">
              <th className="px-4 py-2.5 font-medium">Empresa</th>
              <th className="px-4 py-2.5 font-medium">Ciudad</th>
              <th className="px-4 py-2.5 font-medium">Web</th>
              <th className="px-4 py-2.5 text-right font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Temp.</th>
              <th className="px-4 py-2.5 font-medium">Etapa</th>
              <th className="px-4 py-2.5 text-right font-medium">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map((l) => (
              <tr
                key={l.id}
                data-testid="lead-row"
                onClick={() => selectLead(l.id)}
                className="cursor-pointer border-b border-border/60 transition-colors hover:bg-surface/60"
              >
                <td className="px-4 py-2.5">
                  <p className="font-medium text-text">{l.company}</p>
                  <p className="text-[10px] text-text-dim">{l.category}</p>
                </td>
                <td className="px-4 py-2.5 text-text-muted">{l.city}</td>
                <td className="px-4 py-2.5">
                  {l.hasWebsite ? (
                    <span className="text-text-dim">Sí</span>
                  ) : (
                    <span className="text-hot">No</span>
                  )}
                </td>
                <td className="stat-num px-4 py-2.5 text-right font-medium text-text">
                  {l.score}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      color: TEMP_COLOR[l.temperature],
                      background: `${TEMP_COLOR[l.temperature]}14`,
                    }}
                  >
                    {TEMP_LABEL[l.temperature]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-muted">{STAGE_LABEL[l.stage]}</td>
                <td className="stat-num px-4 py-2.5 text-right text-email">
                  {l.closeProbability}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-10 text-center text-[12px] text-text-dim">
            No hay leads que coincidan con el filtro.
          </p>
        )}
      </div>
    </div>
  );
}
