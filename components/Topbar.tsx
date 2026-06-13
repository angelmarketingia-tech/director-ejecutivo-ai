"use client";

import { useDeck } from "@/lib/store";
import { cn, fmtMoney } from "@/lib/utils";
import { AREA_BY_ID } from "@/lib/departments";
import { Play, Pause, RotateCcw, Gauge, Sparkles, Menu } from "lucide-react";

const SPEEDS = [1, 2, 4];

export function Topbar() {
  const running = useDeck((s) => s.running);
  const speed = useDeck((s) => s.speed);
  const toggle = useDeck((s) => s.toggleRunning);
  const setSpeed = useDeck((s) => s.setSpeed);
  const reset = useDeck((s) => s.reset);
  const revenue = useDeck((s) => s.metrics.revenue);
  const area = useDeck((s) => s.area);
  const view = useDeck((s) => s.view);
  const setMobileNav = useDeck((s) => s.setMobileNav);

  const comercialTitle: Record<string, string> = {
    deck: "Sala de Control Comercial",
    pipeline: "Pipeline Comercial",
    leads: "Base de Leads",
    calls: "Centro de Llamadas",
    whatsapp: "WhatsApp Business",
    emails: "Email Marketing",
    settings: "Configuración del Sistema",
  };

  const meta = AREA_BY_ID[area];
  const heading = area === "comercial" ? comercialTitle[view] : meta.label.replace(/^.*· /, "");
  const sub = area === "comercial"
    ? `Pipeline ponderado · ${fmtMoney(revenue)}`
    : meta.tagline;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-bg/80 px-5 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          data-testid="btn-mobile-nav"
          onClick={() => setMobileNav(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text-muted lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold tracking-tight text-text sm:text-[15px]">
            {heading}
          </h1>
          <p className="hidden text-[11px] text-text-dim sm:block">{sub}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="chip hidden border-warn/30 bg-warn/10 text-warn sm:inline-flex">
          <Sparkles className="h-3 w-3" /> Modo Demo
        </span>

        <div className="hidden items-center gap-1 rounded-lg border border-border bg-surface/60 p-1 sm:flex">
          <Gauge className="ml-1 h-3.5 w-3.5 text-text-dim" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors stat-num",
                speed === s
                  ? "bg-prospect/20 text-prospect"
                  : "text-text-dim hover:text-text-muted"
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          data-testid="btn-toggle-run"
          onClick={toggle}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all duration-150",
            running
              ? "border-ok/30 bg-ok/10 text-ok hover:bg-ok/15"
              : "border-border bg-surface text-text-muted hover:text-text"
          )}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "En vivo" : "Pausado"}
        </button>

        <button
          onClick={reset}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:text-text"
          title="Reiniciar simulación"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
