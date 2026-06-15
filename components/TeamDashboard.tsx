"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { Users, Play, CheckCircle2, ExternalLink, Loader2, Trash2, Clock, Activity, Coins } from "lucide-react";

interface CompletedTask { id: string; text: string; url?: string; at: number; minutes?: number; }
interface Member { id: string; name: string; role: string; current: { task: string; startedAt: number } | null; completed: CompletedTask[]; }
interface Me { id: string; role: "admin" | "member"; name: string }

export function TeamDashboard() {
  const [team, setTeam] = useState<Member[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [stored, setStored] = useState(true);
  const [, setTick] = useState(0); // refresca los cronómetros

  useEffect(() => {
    load();
    const id = setInterval(() => setTick((t) => t + 1), 30_000); // cronómetros vivos
    return () => clearInterval(id);
  }, []);

  async function load() {
    try {
      const [t, m] = await Promise.all([fetch("/api/team"), fetch("/api/me")]);
      const tj = await t.json();
      if (tj.ok) { setTeam(tj.team); setStored(tj.stored); }
      const mj = await m.json().catch(() => null);
      if (mj && mj.ok) setMe({ id: mj.id, role: mj.role, name: mj.name });
    } catch {}
    setLoading(false);
  }

  async function act(body: any) {
    const r = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.ok) setTeam(j.team);
  }

  if (loading) {
    return <div className="panel flex items-center gap-2 p-4 text-[12px] text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando equipo…</div>;
  }

  const canEdit = (memberId: string) => !me || me.role === "admin" || me.id.toLowerCase() === memberId.toLowerCase();

  return (
    <>
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#34D399]" />
          <p className="text-[13px] font-semibold text-text">Equipo real · Juan y David</p>
          {me && <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] text-text-dim">conectado: {me.name}{me.role === "admin" ? " (admin)" : ""}</span>}
          {!stored && <span className="ml-auto rounded-md bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">sin KV: no se guarda</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {team.map((m) => (
            <MemberCard key={m.id} m={m} onAct={act} canEdit={canEdit(m.id)} />
          ))}
        </div>
      </div>

      {me?.role === "admin" && <SpendPanel />}
    </>
  );
}

function SpendPanel() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/spend").then((r) => r.json()).then((j) => { if (j.ok) setData(j); }).catch(() => {}); }, []);
  if (!data) return null;
  const usd = (n: number) => `$${(n ?? 0).toFixed(3)}`;
  return (
    <div className="panel mt-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-4 w-4 text-scoring" />
        <p className="text-[13px] font-semibold text-text">Auditoría de tokens (IA) · solo admin</p>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Hoy (USD)" value={usd(data.totals.today)} />
        <Stat label="Semana (USD)" value={usd(data.totals.week)} />
        <Stat label="Total (USD)" value={usd(data.totals.all)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="label-eyebrow mb-1.5">Gasto por persona</p>
          <div className="space-y-1">
            {data.byUser.length === 0 && <p className="text-[11px] text-text-dim">Sin registros aún.</p>}
            {data.byUser.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-2.5 py-1.5 text-[11px]">
                <span className="text-text">{u.name} <span className="text-text-dim">· {u.count} usos</span></span>
                <span className="stat-num text-scoring">{usd(u.costUsd)}</span>
              </div>
            ))}
          </div>
          <p className="label-eyebrow mb-1.5 mt-3">Gasto por tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {data.byAction.map((a: any) => (
              <span key={a.action} className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-text-muted">{a.action}: {usd(a.costUsd)}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="label-eyebrow mb-1.5">Últimos movimientos</p>
          <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-1">
            {data.recent.map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/40 px-2.5 py-1.5 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-text-muted"><span className="text-text">{e.name}</span> · {e.action}</span>
                <span className="shrink-0 text-text-dim">hace {timeAgo(e.at)}</span>
                <span className="stat-num shrink-0 text-scoring">{usd(e.costUsd)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function startOfWeek(): number {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setHours(0, 0, 0, 0);
  return d.getTime() - day * 86400_000;
}
function startOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function MemberCard({ m, onAct, canEdit }: { m: Member; onAct: (b: any) => Promise<void>; canEdit: boolean }) {
  const [taskInput, setTaskInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [doneText, setDoneText] = useState("");
  const [doneUrl, setDoneUrl] = useState("");

  const total = m.completed.length;
  const week = m.completed.filter((t) => t.at >= startOfWeek()).length;
  const today = m.completed.filter((t) => t.at >= startOfDay()).length;
  const withUrl = m.completed.filter((t) => t.url).length;

  async function wrap(fn: () => Promise<void>) { setBusy(true); await fn(); setBusy(false); }

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-3.5">
      {/* Encabezado */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#34D399]/15 text-[12px] font-semibold text-[#34D399]">{m.name.slice(0, 2).toUpperCase()}</div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-text">{m.name}</p>
          <p className="text-[11px] text-text-dim">{m.role}</p>
        </div>
      </div>

      {/* Actividad en curso */}
      {m.current ? (
        <div className="mb-3 rounded-lg border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#22D3EE]">
            <Activity className="h-3 w-3" /> Trabajando ahora
            <span className="ml-auto flex items-center gap-1 text-text-dim"><Clock className="h-3 w-3" /> hace {timeAgo(m.current.startedAt)}</span>
          </div>
          <p className="text-[12.5px] text-text">{m.current.task}</p>
          {canEdit && !completing ? (
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setCompleting(true); setDoneText(m.current!.task); }} className="flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2 py-1 text-[11px] font-semibold text-ok hover:bg-ok/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completar
              </button>
              <button disabled={busy} onClick={() => wrap(() => onAct({ action: "setCurrent", memberId: m.id, task: "" }))} className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text">Detener</button>
            </div>
          ) : null}
        </div>
      ) : canEdit ? (
        <div className="mb-3 flex gap-2">
          <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="¿Qué está haciendo ahora?" className="min-w-0 flex-1 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-[#22D3EE]/50" />
          <button disabled={busy || !taskInput.trim()} onClick={() => wrap(async () => { await onAct({ action: "setCurrent", memberId: m.id, task: taskInput.trim() }); setTaskInput(""); })} className="flex items-center gap-1.5 rounded-lg border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#22D3EE] disabled:opacity-40">
            <Play className="h-3.5 w-3.5" /> Empezar
          </button>
        </div>
      ) : (
        <div className="mb-3 rounded-lg border border-border bg-surface/40 px-3 py-2 text-[11px] text-text-dim">Sin actividad en curso.</div>
      )}

      {/* Formulario de completar (texto + URL) */}
      {canEdit && completing && (
        <div className="mb-3 space-y-2 rounded-lg border border-ok/30 bg-ok/5 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-ok">Registrar tarea completada</p>
          <input value={doneText} onChange={(e) => setDoneText(e.target.value)} placeholder="Qué completó (ej. Web de AVEMARÍA)" className="w-full rounded-md border border-border bg-bg-soft px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-ok/50" />
          <input value={doneUrl} onChange={(e) => setDoneUrl(e.target.value)} placeholder="URL de la página (opcional)" className="w-full rounded-md border border-border bg-bg-soft px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-ok/50" />
          <div className="flex gap-2">
            <button disabled={busy || !doneText.trim()} onClick={() => wrap(async () => { await onAct({ action: "complete", memberId: m.id, text: doneText.trim(), url: doneUrl.trim() }); setCompleting(false); setDoneText(""); setDoneUrl(""); })} className="flex items-center gap-1.5 rounded-md bg-ok/15 px-2.5 py-1.5 text-[11px] font-semibold text-ok hover:bg-ok/25">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Guardar
            </button>
            <button onClick={() => setCompleting(false)} className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">Cancelar</button>
          </div>
        </div>
      )}

      {/* Rendimiento */}
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        <Stat label="Total" value={total} />
        <Stat label="Semana" value={week} />
        <Stat label="Hoy" value={today} />
        <Stat label="Con web" value={withUrl} />
      </div>

      {/* Proyectos completados */}
      <p className="label-eyebrow mb-1.5 mt-3">Proyectos / tareas completadas</p>
      {m.completed.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface/40 px-3 py-3 text-center text-[11px] text-text-dim">Aún sin registros.</p>
      ) : (
        <div className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-1">
          {m.completed.map((t) => (
            <div key={t.id} className="group flex items-start gap-2 rounded-lg border border-border bg-surface/40 px-2.5 py-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[12px] text-text">{t.text}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-text-dim">
                  <span>hace {timeAgo(t.at)}</span>
                  {t.minutes != null && <span>· {t.minutes} min</span>}
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#22D3EE] hover:underline">
                      <ExternalLink className="h-3 w-3" /> ver página
                    </a>
                  )}
                </div>
              </div>
              {canEdit && (
                <button onClick={() => onAct({ action: "deleteTask", memberId: m.id, taskId: t.id })} className="opacity-0 transition-opacity group-hover:opacity-100" title="Eliminar">
                  <Trash2 className="h-3.5 w-3.5 text-text-dim hover:text-hot" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-2 text-center">
      <p className="stat-num text-[16px] font-medium text-text">{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-text-dim">{label}</p>
    </div>
  );
}
