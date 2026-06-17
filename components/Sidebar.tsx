"use client";

import { useDeck } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AREAS } from "@/lib/departments";
import { playSound } from "@/lib/sound";
import type { Area } from "@/lib/types";
import {
  Hexagon,
  Target,
  Megaphone,
  Crown,
  Code2,
  Users,
  GitBranch,
  PhoneCall,
  MessageCircle,
  Mail,
  LayoutDashboard,
  Settings,
  LogOut,
} from "lucide-react";

const AREA_ICON: Record<string, any> = {
  hexagon: Hexagon,
  target: Target,
  megaphone: Megaphone,
  crown: Crown,
  code: Code2,
  users: Users,
};

const COMERCIAL_SUBNAV = [
  { id: "deck", label: "Sala de Control", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "leads", label: "Leads", icon: Users },
  { id: "calls", label: "Llamadas", icon: PhoneCall },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "settings", label: "Configuración / Costos", icon: Settings },
] as const;

/** Contenido del sidebar, reutilizado en escritorio y en el drawer móvil. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const area = useDeck((s) => s.area);
  const setArea = useDeck((s) => s.setArea);
  const view = useDeck((s) => s.view);
  const setView = useDeck((s) => s.setView);

  return (
    <>
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-surface ring-1 ring-brand/40">
          <img src="/daptux-logo.png" alt="Daptux.IA" className="h-9 w-9 object-contain" />
          <span className="absolute inset-0 animate-pulse-ring rounded-xl ring-1 ring-brand/40" />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight text-text">Daptux<span className="text-brand">.IA</span></p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-brand">
            Centro de Mando
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <p className="label-eyebrow mb-2 px-2">Áreas</p>
        {AREAS.map((a) => {
          const Icon = AREA_ICON[a.iconKey] ?? Hexagon;
          const active = area === a.id;
          return (
            <div key={a.id}>
              <button
                data-testid={`area-${a.id}`}
                onClick={() => {
                  playSound("tick");
                  setArea(a.id as Area);
                  onNavigate?.();
                }}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150",
                  active ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface/60 hover:text-text"
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                    style={{ background: a.color }}
                  />
                )}
                <Icon
                  className="h-[18px] w-[18px] transition-colors"
                  style={{ color: active ? a.color : undefined }}
                />
                <span className="truncate">{a.label.replace(/^.*· /, "")}</span>
              </button>

              {active && a.id === "comercial" && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                  {COMERCIAL_SUBNAV.map((n) => {
                    const SubIcon = n.icon;
                    const on = view === n.id;
                    return (
                      <button
                        key={n.id}
                        data-testid={`subnav-${n.id}`}
                        onClick={() => {
                          setView(n.id as any);
                          onNavigate?.();
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                          on ? "text-prospect" : "text-text-dim hover:text-text-muted"
                        )}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                        {n.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-3 py-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-prospect/15 text-[11px] font-semibold text-prospect">
          AV
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[12px] font-medium text-text">Angel Vaca</p>
          <p className="text-[10px] text-text-dim">Operador · Ganaplay</p>
        </div>
        <a
          href="/api/auth/logout"
          title="Cerrar sesión"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-text-dim transition-colors hover:text-text"
        >
          <LogOut className="h-3.5 w-3.5" />
        </a>
      </div>
    </>
  );
}

/** Sidebar fijo de escritorio (oculto en móvil; en móvil se usa MobileNav). */
export function Sidebar() {
  return (
    <aside className="hidden w-[256px] shrink-0 flex-col border-r border-border bg-bg-soft/60 px-3 py-5 lg:flex">
      <SidebarContent />
    </aside>
  );
}
