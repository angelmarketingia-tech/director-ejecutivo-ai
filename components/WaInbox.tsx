"use client";

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { Inbox, Send, Loader2, Bot, User, ArrowLeft } from "lucide-react";

interface WaMsg { id: string; dir: "in" | "out"; by: "client" | "bot" | "human"; text: string; at: number; status?: string }
interface WaChat { id: string; name?: string; botEnabled: boolean; hot?: boolean; messages: WaMsg[]; lastAt: number }

export function WaInbox() {
  const [chats, setChats] = useState<WaChat[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const current = chats.find((c) => c.id === sel) || null;
  const msgCount = current?.messages.length ?? 0;

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // bandeja en vivo
    return () => clearInterval(id);
  }, []);

  // Auto-scroll SOLO dentro del contenedor de mensajes (nunca mueve la página).
  // Se dispara al cambiar de chat o al llegar un mensaje nuevo, no en cada poll.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sel, msgCount]);

  async function load() {
    try {
      const r = await fetch("/api/whatsapp/chats");
      const j = await r.json();
      // Calientes primero, luego por actividad reciente.
      if (j.ok) setChats((j.chats as WaChat[]).sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || b.lastAt - a.lastAt));
    } catch {}
    setLoading(false);
  }

  async function action(body: any) {
    const r = await fetch("/api/whatsapp/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.ok) setChats(j.chats);
  }

  async function send() {
    if (!sel || !text.trim()) return;
    setSending(true);
    await action({ action: "send", to: sel, text: text.trim() });
    setText("");
    setSending(false);
  }

  if (loading) return <div className="panel flex items-center gap-2 p-4 text-[12px] text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando bandeja…</div>;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Inbox className="h-4 w-4 text-email" />
        <p className="text-[13px] font-semibold text-text">Bandeja de WhatsApp</p>
        <span className="ml-auto text-[10px] text-text-dim">{chats.length} conversaciones · en vivo</span>
      </div>

      {chats.length === 0 ? (
        <p className="px-4 py-10 text-center text-[12px] text-text-dim">
          Aún no hay conversaciones. Conecta el conector (carpeta <span className="text-text-muted">whatsapp-connector</span>) y escribe a tu WhatsApp para verlas aquí.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]" style={{ height: 460 }}>
          {/* Lista */}
          <div className={`overflow-y-auto border-r border-border ${current ? "hidden md:block" : ""}`}>
            {chats.map((c) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <button key={c.id} onClick={() => setSel(c.id)} className={`flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2.5 text-left hover:bg-surface/60 ${sel === c.id ? "bg-surface/80" : ""}`}>
                  <div className="flex w-full items-center gap-2">
                    {c.hot && <span title="Lead caliente">🔥</span>}
                    <span className="truncate text-[12px] font-semibold text-text">{c.name || c.id}</span>
                    {!c.botEnabled && <span className="rounded bg-hot/15 px-1 py-0.5 text-[8px] font-semibold text-hot">TÚ</span>}
                    <span className="ml-auto shrink-0 text-[9px] text-text-dim">{timeAgo(c.lastAt)}</span>
                  </div>
                  <span className="line-clamp-1 text-[11px] text-text-dim">{last?.text}</span>
                </button>
              );
            })}
          </div>

          {/* Conversación */}
          <div className={`flex flex-col ${current ? "" : "hidden md:flex"}`}>
            {!current ? (
              <div className="grid flex-1 place-items-center text-[12px] text-text-dim">Elige una conversación</div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <button className="md:hidden" onClick={() => setSel(null)}><ArrowLeft className="h-4 w-4 text-text-muted" /></button>
                  <div className="leading-tight">
                    <p className="text-[12px] font-semibold text-text">{current.name || current.id}</p>
                    <p className="text-[10px] text-text-dim">{current.id}</p>
                  </div>
                  <button
                    onClick={() => action({ action: "bot", to: current.id, on: !current.botEnabled })}
                    className={`ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${current.botEnabled ? "bg-email/15 text-email" : "bg-hot/15 text-hot"}`}
                    title={current.botEnabled ? "El bot responde. Pulsa para tomar tú el chat." : "Lo llevas tú. Pulsa para devolver al bot."}
                  >
                    {current.botEnabled ? <><Bot className="h-3.5 w-3.5" /> Bot activo · Tomar yo</> : <><User className="h-3.5 w-3.5" /> Lo llevas tú · Devolver al bot</>}
                  </button>
                </div>

                <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-bg/40 p-3">
                  {current.messages.map((m) => (
                    <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${m.dir === "in" ? "self-start rounded-bl-sm bg-surface-2 text-text" : m.by === "bot" ? "ml-auto rounded-br-sm bg-email/15 text-text" : "ml-auto rounded-br-sm bg-prospect/20 text-text"}`}>
                      <p className="mb-0.5 text-[9px] uppercase tracking-wide text-text-dim">{m.dir === "in" ? "Cliente" : m.by === "bot" ? "Bot" : "Tú"}{m.status === "queued" ? " · enviando…" : ""}</p>
                      {m.text}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 border-t border-border p-2.5">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    placeholder={current.botEnabled ? "Escribe (consejo: pulsa 'Tomar yo' para que el bot no responda)" : "Escribe tu respuesta…"}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-email/50"
                  />
                  <button disabled={sending || !text.trim()} onClick={send} className="flex items-center gap-1.5 rounded-lg border border-email/30 bg-email/10 px-3 py-2 text-[12px] font-semibold text-email disabled:opacity-40">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
