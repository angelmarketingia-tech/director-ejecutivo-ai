"use client";

import { useDeck } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { PhoneCall, PhoneOff, Voicemail, CalendarCheck, RotateCcw } from "lucide-react";

const OUTCOME = {
  connected: { label: "Conectada", color: "#34D399", icon: PhoneCall },
  meeting_booked: { label: "Reunión", color: "#A78BFA", icon: CalendarCheck },
  callback: { label: "Volver a llamar", color: "#FBBF24", icon: RotateCcw },
  voicemail: { label: "Buzón", color: "#8A97B8", icon: Voicemail },
  no_answer: { label: "Sin respuesta", color: "#5A678C", icon: PhoneOff },
  not_interested: { label: "No interesado", color: "#FB7185", icon: PhoneOff },
} as const;

const INTEREST = { low: "Bajo", medium: "Medio", high: "Alto" } as const;

export function CallsView() {
  const calls = useDeck((s) => s.calls);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <PhoneCall className="h-4 w-4 text-voice" />
        <p className="text-[13px] font-semibold text-text">
          Registro de llamadas
          <span className="ml-2 text-[11px] font-normal text-text-dim">
            voz vía ElevenLabs + Twilio
          </span>
        </p>
      </div>

      {calls.length === 0 ? (
        <Empty />
      ) : (
        <div className="divide-y divide-border/60">
          {calls.map((c) => {
            const o = OUTCOME[c.outcome];
            const Icon = o.icon;
            return (
              <div key={c.id} className="flex items-start gap-4 px-4 py-3.5">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: `${o.color}1a`, color: o.color }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-text">{c.company}</p>
                    <span className="stat-num shrink-0 text-[10px] text-text-dim">
                      {timeAgo(c.at)} atrás
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] italic text-text-muted">
                    {c.transcriptSnippet}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                    <Tag color={o.color}>{o.label}</Tag>
                    <Tag>{Math.floor(c.durationSec / 60)}m {c.durationSec % 60}s</Tag>
                    <Tag>Interés: {INTEREST[c.interest]}</Tag>
                    <Tag>Cierre {c.closeProbability}%</Tag>
                    {c.objections.map((ob) => (
                      <Tag key={ob} color="#FB7185">
                        ⚠ {ob}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="rounded-md border px-1.5 py-0.5 font-medium"
      style={{
        color: color ?? "#8A97B8",
        borderColor: color ? `${color}30` : "rgba(148,163,184,0.18)",
        background: color ? `${color}10` : "transparent",
      }}
    >
      {children}
    </span>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <PhoneCall className="h-8 w-8 text-text-dim" />
      <p className="text-[13px] text-text-muted">Aún no hay llamadas registradas</p>
      <p className="max-w-xs text-[11px] text-text-dim">
        El agente ECHO empieza a llamar leads calientes en cuanto la simulación los
        califica. Pulsa “En vivo” en la barra superior.
      </p>
    </div>
  );
}
