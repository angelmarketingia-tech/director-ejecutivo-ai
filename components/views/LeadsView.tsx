"use client";

import { useMemo, useState } from "react";
import { useDeck } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/demo/data";
import { TEMP_COLOR, TEMP_LABEL } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { LeadTemperature, Lead } from "@/lib/types";
import { Search, Download } from "lucide-react";

const FILTERS: Array<{ id: "all" | LeadTemperature; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "hot", label: "Calientes" },
  { id: "warm", label: "Tibios" },
  { id: "cold", label: "Fríos" },
];

// Orden de "más caliente a menos"
const TEMP_RANK: Record<LeadTemperature, number> = { hot: 0, warm: 1, cold: 2 };

/** Escapa un valor para CSV (comillas, comas, saltos de línea). */
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportExcel(rows: Lead[]) {
  const headers = [
    "Empresa", "Nicho", "Ciudad", "Teléfono", "Email", "Sitio web", "Tiene web",
    "Score", "Temperatura", "Etapa", "Prob. cierre %", "Próxima acción", "Contacto", "Fuente",
  ];
  const lines = rows.map((l) => [
    l.company, l.category, l.city, l.phone ?? "", l.email ?? "", l.website ?? "",
    l.hasWebsite ? "Sí" : "No", l.score, TEMP_LABEL[l.temperature], STAGE_LABEL[l.stage],
    l.closeProbability, l.nextAction ?? "", l.contactName ?? "", l.sourceUrl ?? "",
  ].map(csvCell).join(","));
  // BOM para que Excel lea bien los acentos.
  const csv = "﻿" + [headers.join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-daptux-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsView() {
  const leads = useDeck((s) => s.leads);
  const selectLead = useDeck((s) => s.selectLead);
  const [filter, setFilter] = useState<"all" | LeadTemperature>("all");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  // Nichos presentes (para el filtro).
  const categories = useMemo(
    () => Array.from(new Set(leads.map((l) => l.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [leads]
  );

  const rows = leads
    .filter((l) => (filter === "all" ? true : l.temperature === filter))
    .filter((l) => (cat === "all" ? true : l.category === cat))
    .filter((l) => l.company.toLowerCase().includes(q.toLowerCase()))
    // Más caliente a menos, y dentro de cada temperatura por score.
    .sort((a, b) => TEMP_RANK[a.temperature] - TEMP_RANK[b.temperature] || b.score - a.score);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                filter === f.id ? "bg-surface-2 text-text" : "text-text-muted hover:text-text"
              )}
            >
              {f.label}
            </button>
          ))}
          {/* Filtro por nicho */}
          <select
            data-testid="filter-nicho"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-lg border border-border bg-bg-soft px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-prospect/50"
          >
            <option value="all">Todos los nichos</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim">{rows.length} leads</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar empresa…"
              className="w-48 rounded-lg border border-border bg-bg-soft py-2 pl-9 pr-3 text-[12px] text-text outline-none placeholder:text-text-dim focus:border-prospect/50"
            />
          </div>
          <button
            data-testid="btn-export-excel"
            onClick={() => exportExcel(rows)}
            disabled={rows.length === 0}
            title="Descargar los leads filtrados en Excel (CSV con teléfono y correo)"
            className="flex items-center gap-1.5 rounded-lg border border-email/40 bg-email/15 px-3 py-2 text-[12px] font-semibold text-email transition-colors hover:bg-email/25 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Exportar a Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wide text-text-dim">
              <th className="px-4 py-2.5 font-medium">Empresa</th>
              <th className="px-4 py-2.5 font-medium">Ciudad</th>
              <th className="px-4 py-2.5 font-medium">Contacto</th>
              <th className="px-4 py-2.5 font-medium">Web</th>
              <th className="px-4 py-2.5 text-right font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Temp.</th>
              <th className="px-4 py-2.5 font-medium">Etapa</th>
              <th className="px-4 py-2.5 text-right font-medium">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((l) => (
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
                  {l.phone ? <p className="text-text-muted">{l.phone}</p> : null}
                  {l.email ? <p className="text-[10px] text-text-dim">{l.email}</p> : null}
                  {!l.phone && !l.email ? <span className="text-text-dim">—</span> : null}
                </td>
                <td className="px-4 py-2.5">
                  {l.hasWebsite ? <span className="text-text-dim">Sí</span> : <span className="text-hot">No</span>}
                </td>
                <td className="stat-num px-4 py-2.5 text-right font-medium text-text">{l.score}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{ color: TEMP_COLOR[l.temperature], background: `${TEMP_COLOR[l.temperature]}14` }}
                  >
                    {TEMP_LABEL[l.temperature]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-muted">{STAGE_LABEL[l.stage]}</td>
                <td className="stat-num px-4 py-2.5 text-right text-email">{l.closeProbability}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-10 text-center text-[12px] text-text-dim">No hay leads que coincidan con el filtro.</p>
        )}
      </div>
    </div>
  );
}
