"use client";

import { useDeck } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { MessageCircle, ShieldCheck } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  queued: "#8A97B8",
  sent: "#60A5FA",
  delivered: "#34D399",
  read: "#22D3EE",
  replied: "#A78BFA",
};

export function WhatsAppView() {
  const msgs = useDeck((s) => s.whatsapp);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <MessageCircle className="h-4 w-4 text-email" />
          <p className="text-[13px] font-semibold text-text">WhatsApp Business</p>
        </div>
        {msgs.length === 0 ? (
          <p className="py-16 text-center text-[12px] text-text-dim">
            Sin mensajes todavía. Se envían con plantillas aprobadas y opt-in.
          </p>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                  m.direction === "out"
                    ? "self-end rounded-br-sm bg-email/15"
                    : "self-start rounded-bl-sm bg-surface-2"
                }`}
              >
                <p className="text-[10px] font-medium text-text-dim">{m.company}</p>
                <p className="mt-0.5 text-[12px] text-text">{m.body}</p>
                <div className="mt-1 flex items-center justify-end gap-2 text-[9px]">
                  {m.templateName && (
                    <span className="rounded bg-bg-soft px-1.5 py-0.5 text-text-dim">
                      {m.templateName}
                    </span>
                  )}
                  <span style={{ color: STATUS_COLOR[m.status] }}>{m.status}</span>
                  <span className="stat-num text-text-dim">{timeAgo(m.at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel h-fit p-4">
        <p className="label-eyebrow mb-3">Cumplimiento de mensajería</p>
        <ul className="space-y-2.5 text-[12px] text-text-muted">
          {[
            "Plantillas pre-aprobadas (HSM)",
            "Opt-in registrado por lead",
            "Ventana de 24h respetada",
            "Opt-out automático con STOP",
            "Derivación a humano si interés alto",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
