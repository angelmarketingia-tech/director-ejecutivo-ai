"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Mail, MousePointerClick, Eye, CornerUpLeft, Send, Loader2 } from "lucide-react";

function EmailTester() {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setStatus("sending");
    setMsg(null);
    try {
      const r = await fetch("/api/channels/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "prueba@example.com" }),
      });
      const j = await r.json();
      setMsg(
        j.demo
          ? `Simulado (sin RESEND_API_KEY) · id ${j.id}`
          : `Enviado REAL vía Resend · id ${j.id}`
      );
    } catch (e: any) {
      setMsg(`Error: ${String(e?.message ?? e)}`);
    }
    setStatus("done");
  }

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
      <button
        data-testid="btn-send-test-email"
        onClick={send}
        disabled={status === "sending"}
        className="flex items-center gap-1.5 rounded-lg border border-email/30 bg-email/10 px-3 py-1.5 text-[12px] font-semibold text-email transition-colors hover:bg-email/20 disabled:opacity-40"
      >
        {status === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Enviar email de prueba
      </button>
      {msg && (
        <span data-testid="email-test-result" className="text-[11px] text-text-muted">
          {msg}
        </span>
      )}
    </div>
  );
}

const STATUS = {
  queued: { label: "En cola", color: "#8A97B8", icon: Mail },
  sent: { label: "Enviado", color: "#60A5FA", icon: Mail },
  opened: { label: "Abierto", color: "#22D3EE", icon: Eye },
  clicked: { label: "Click", color: "#FBBF24", icon: MousePointerClick },
  replied: { label: "Respondió", color: "#34D399", icon: CornerUpLeft },
  bounced: { label: "Rebote", color: "#FB7185", icon: Mail },
} as const;

export function EmailsView() {
  const emails = useDeck((s) => s.emails);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Mail className="h-4 w-4 text-email" />
        <p className="text-[13px] font-semibold text-text">
          Email marketing
          <span className="ml-2 text-[11px] font-normal text-text-dim">
            plantillas con propuesta de valor + CTA + seguimiento
          </span>
        </p>
      </div>

      <EmailTester />

      {emails.length === 0 ? (
        <p className="py-16 text-center text-[12px] text-text-dim">
          QUILL aún no ha enviado emails. Se generan al pasar leads a “Contactado”.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {emails.map((e) => {
            const s = STATUS[e.status];
            const Icon = s.icon;
            return (
              <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${s.color}1a`, color: s.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-text">{e.subject}</p>
                  <p className="text-[10px] text-text-dim">
                    {e.company} · plantilla “{e.template}”
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: s.color, background: `${s.color}14` }}
                >
                  {s.label}
                </span>
                <span className="stat-num shrink-0 text-[10px] text-text-dim">
                  {timeAgo(e.at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
