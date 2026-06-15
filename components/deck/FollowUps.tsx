"use client";

import { useDeck } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/demo/data";
import { Clock3, ChevronRight, MessageCircle } from "lucide-react";

/**
 * Seguimientos pendientes: leads ya contactados que llevan días sin avanzar.
 * El 80% de las ventas se ganan en el seguimiento — aquí no se pierde ninguno.
 */
export function FollowUps() {
  const leads = useDeck((s) => s.leads);
  const selectLead = useDeck((s) => s.selectLead);

  const now = Date.now();
  const pend = leads
    .filter((l) => ["contacted", "engaged", "meeting"].includes(l.stage))
    .map((l) => ({ l, since: l.outreach?.sentAt ?? l.createdAt }))
    .sort((a, b) => a.since - b.since); // más viejo (más urgente) primero

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Clock3 className="h-4 w-4 text-warn" />
        <p className="text-[13px] font-semibold text-text">Seguimientos pendientes</p>
        <span className="ml-auto text-[10px] text-text-dim">{pend.length}</span>
      </div>
      {pend.length === 0 ? (
        <p className="px-4 py-6 text-center text-[11px] text-text-dim">
          Nada pendiente. Cuando marques leads como “Contactado”, aparecen aquí para darles seguimiento.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {pend.slice(0, 12).map(({ l, since }) => {
            const days = Math.floor((now - since) / 86400_000);
            const overdue = days >= 2;
            return (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-text">{l.company}</p>
                  <p className="text-[10px] text-text-dim">
                    {STAGE_LABEL[l.stage]} ·{" "}
                    <span className={overdue ? "text-warn" : ""}>
                      {days <= 0 ? "hoy" : `hace ${days} día${days === 1 ? "" : "s"}`}
                    </span>
                  </p>
                </div>
                {l.phone && (
                  <a
                    href={`https://wa.me/${l.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(l.outreach?.message ?? `Hola, te escribo de Daptux.IA sobre la web de ${l.company} 👋`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-7 w-7 place-items-center rounded-lg border border-email/30 bg-email/10 text-email"
                    title="Seguir por WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )}
                <button onClick={() => selectLead(l.id)} className="grid h-7 w-7 place-items-center rounded-lg border border-border text-text-muted hover:text-text" title="Abrir lead">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
