"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import type { AreaAgent, StaffMember } from "@/lib/types";
import { DeptStation } from "@/components/deck/DeptStation";
import { StaffCard } from "@/components/StaffCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { AgentTaskPanel } from "@/components/AgentTaskPanel";
import { TeamDashboard } from "@/components/TeamDashboard";
import { IS_DEMO } from "@/lib/demoFlag";
import { Code2, GitBranch, Sparkles, Users, GitPullRequest, Rocket, Globe, Loader2, Download, ExternalLink, Copy, Check, FileText, Wrench, ListChecks, CheckCircle2 } from "lucide-react";

type Phase = "idle" | "architect" | "build" | "review" | "done" | "error";

/** Constructor de proyectos multi-agente: Arquitecto (PROJECT.md) → Implementador → QA. */
function ProjectBuilder() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [projectMd, setProjectMd] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const running = phase === "architect" || phase === "build" || phase === "review";

  async function step(body: any): Promise<any> {
    const r = await fetch("/api/projects/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    try {
      return await r.json();
    } catch {
      return { ok: false, error: r.status === 504 ? "Una fase tardó demasiado (límite 60s). Reintenta." : "Respuesta inválida del servidor." };
    }
  }

  function fail(j: any) {
    setMsg(j?.noKey ? "⚠️ Falta ANTHROPIC_API_KEY en Vercel." : j?.budgetExceeded ? "⛔ Tope de gasto diario alcanzado." : `Error: ${j?.error ?? "desconocido"}`);
    setPhase("error");
  }

  async function build() {
    if (!prompt.trim()) return;
    setMsg(null);
    setProjectMd(null);
    setHtml(null);
    setNotes([]);

    // 1) ARQUITECTO → PROJECT.md
    setPhase("architect");
    const a = await step({ phase: "architect", prompt });
    if (!a.ok) return fail(a);
    setProjectMd(a.projectMd);

    // 2) IMPLEMENTADOR → código funcional (con imágenes reales que pidió el Arquitecto)
    setPhase("build");
    const b = await step({ phase: "build", prompt, projectMd: a.projectMd, imageQueries: a.imageQueries });
    if (!b.ok) return fail(b);
    setHtml(b.html);

    // 3) QA → audita y reporta (NO reescribe el HTML; conserva el del build)
    setPhase("review");
    const r = await step({ phase: "review", projectMd: a.projectMd, code: b.html });
    if (r.ok && Array.isArray(r.notes)) setNotes(r.notes);
    setPhase("done");
    setMsg("✅ Proyecto construido y revisado. Vista previa abajo (tu localhost) · descarga los archivos.");
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openTab() {
    if (!html) return;
    const w = window.open();
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }

  const steps: { key: Phase; label: string; icon: any }[] = [
    { key: "architect", label: "Arquitecto · PROJECT.md", icon: FileText },
    { key: "build", label: "Implementador · código", icon: Wrench },
    { key: "review", label: "QA · revisión", icon: ListChecks },
  ];
  const order: Phase[] = ["architect", "build", "review", "done"];
  const curIdx = order.indexOf(phase);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Code2 className="h-4 w-4 text-[#818CF8]" />
        <p className="text-[13px] font-semibold text-text">Constructor de proyectos (multi-agente)</p>
        <span className="ml-auto rounded-md bg-[#818CF815] px-2 py-0.5 text-[10px] font-semibold text-[#818CF8]">Arquitecto → Implementador → QA</span>
      </div>

      <textarea
        data-testid="pb-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Describe el proyecto que quieres. Ej: 'Landing para un restaurante de comida llanera en Villavicencio, con menú, galería, reservas por WhatsApp y testimonios.'"
        className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-[#818CF8]/50"
      />
      <button
        data-testid="btn-build-project"
        onClick={build}
        disabled={running || !prompt.trim()}
        className="mt-2 flex items-center gap-2 rounded-lg border border-[#818CF8]/40 bg-[#818CF8]/15 px-3 py-2 text-[12px] font-semibold text-[#818CF8] transition-colors hover:bg-[#818CF8]/25 disabled:opacity-40"
      >
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
        {running ? "Construyendo…" : "Construir proyecto"}
      </button>

      {/* Progreso de fases */}
      {phase !== "idle" && (
        <div className="mt-3 flex flex-col gap-1.5">
          {steps.map((s, i) => {
            const done = curIdx > i;
            const active = phase === s.key;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-2 text-[11px]">
                {done ? <CheckCircle2 className="h-3.5 w-3.5 text-ok" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#818CF8]" /> : <Icon className="h-3.5 w-3.5 text-text-dim" />}
                <span className={done ? "text-ok" : active ? "text-text" : "text-text-dim"}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {msg && <p data-testid="pb-msg" className="mt-2 text-[11px] text-text-muted">{msg}</p>}

      {/* Resultados */}
      {projectMd && (
        <details className="mt-3 rounded-lg border border-border bg-surface/50" open={!html}>
          <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-text">📄 PROJECT.md (arquitectura)</summary>
          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap px-3 pb-3 text-[11px] leading-relaxed text-text-muted">{projectMd}</pre>
          <div className="px-3 pb-3">
            <button onClick={() => downloadFile(projectMd, "PROJECT.md", "text/markdown")} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              <Download className="h-3.5 w-3.5" /> Descargar PROJECT.md
            </button>
          </div>
        </details>
      )}

      {notes.length > 0 && (
        <div className="mt-3 rounded-lg border border-ok/30 bg-ok/5 p-3">
          <p className="mb-1.5 text-[11px] font-semibold text-ok">QA verificó:</p>
          <ul className="space-y-1">
            {notes.slice(0, 8).map((n, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-muted"><Check className="mt-0.5 h-3 w-3 shrink-0 text-ok" />{n}</li>
            ))}
          </ul>
        </div>
      )}

      {html && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button onClick={() => downloadFile(html, "index.html", "text/html")} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              <Download className="h-3.5 w-3.5" /> Descargar index.html
            </button>
            <button onClick={openTab} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir (localhost)
            </button>
          </div>
          <iframe data-testid="pb-preview" title="Vista previa del proyecto" srcDoc={html} className="h-[480px] w-full rounded-lg border border-border bg-white" />
        </div>
      )}
    </div>
  );
}

/** Generador de sitios web reales (proyecto entregable): crea un HTML autónomo del negocio. */
function WebsiteForge() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Restaurante");
  const [city, setCity] = useState("Villavicencio");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pubUrl, setPubUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  async function publish() {
    if (!html) return;
    setPublishing(true);
    try {
      const r = await fetch("/api/projects/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, html }) });
      const j = await r.json();
      if (j.ok) setPubUrl(j.url); else setMsg(`⚠️ ${j.error ?? "no se pudo publicar"}`);
    } catch (e: any) { setMsg(`⚠️ ${String(e?.message ?? e)}`); }
    setPublishing(false);
  }

  async function generate() {
    setPubUrl(null);
    if (!name.trim()) return;
    setLoading(true);
    setMsg(null);
    setHtml(null);
    try {
      const r = await fetch("/api/projects/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, city, phone }),
      });
      let j: any;
      try {
        j = await r.json();
      } catch {
        setMsg(r.status === 504 ? "Tardó demasiado (límite 60s). Reintenta." : "Respuesta inválida del servidor.");
        setLoading(false);
        return;
      }
      if (j.ok) {
        setHtml(j.html);
        setMsg("✅ Sitio web generado. Vista previa abajo · descárgalo o ábrelo en pestaña nueva.");
      } else if (j.noKey) setMsg("⚠️ Falta ANTHROPIC_API_KEY en Vercel.");
      else if (j.budgetExceeded) setMsg("⛔ Tope de gasto diario alcanzado.");
      else setMsg(`Error: ${j.error ?? "desconocido"}`);
    } catch (e: any) {
      setMsg(`Error: ${String(e?.message ?? e)}`);
    }
    setLoading(false);
  }

  function download() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sitio"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openTab() {
    if (!html) return;
    const w = window.open();
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  }

  async function copy() {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sin portapapeles */
    }
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-[#34D399]" />
        <p className="text-[13px] font-semibold text-text">Crear sitio web (demo para un cliente)</p>
        <span className="ml-auto rounded-md bg-[#34D39915] px-2 py-0.5 text-[10px] font-semibold text-[#34D399]">proyecto real</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          data-testid="web-forge-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del negocio (ej. Donde Riaño)"
          className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-[#34D399]/50"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Rubro (ej. Restaurante)"
          className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-[#34D399]/50"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ciudad"
          className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-[#34D399]/50"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp del negocio (opcional)"
          className="rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-[#34D399]/50"
        />
      </div>
      <button
        data-testid="btn-web-forge"
        onClick={generate}
        disabled={loading || !name.trim()}
        className="mt-2 flex items-center gap-2 rounded-lg border border-[#34D399]/40 bg-[#34D399]/15 px-3 py-2 text-[12px] font-semibold text-[#34D399] transition-colors hover:bg-[#34D399]/25 disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
        {loading ? "Generando sitio web…" : "Generar sitio web"}
      </button>
      {msg && <p data-testid="web-forge-msg" className="mt-2 text-[11px] text-text-muted">{msg}</p>}

      {html && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button onClick={download} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              <Download className="h-3.5 w-3.5" /> Descargar .html
            </button>
            <button onClick={openTab} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir en pestaña
            </button>
            <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
              {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copiado" : "Copiar HTML"}
            </button>
            <button data-testid="btn-publish" onClick={publish} disabled={publishing} className="flex items-center gap-1.5 rounded-lg border border-[#34D399]/40 bg-[#34D399]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#34D399] hover:bg-[#34D399]/25 disabled:opacity-40">
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />} Publicar (link público)
            </button>
          </div>

          {pubUrl && (
            <div className="mb-2 rounded-lg border border-[#34D399]/40 bg-[#34D399]/10 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-[#34D399]">Link público para enviar al cliente</p>
              <a href={pubUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[12px] text-text underline">{pubUrl}</a>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => { navigator.clipboard.writeText(pubUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1800); }).catch(() => {}); }} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text">
                  {linkCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />} {linkCopied ? "Copiado" : "Copiar link"}
                </button>
                {phone && (
                  <a href={`https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola 👋 te dejé una muestra de cómo quedaría la web de ${name}: ${pubUrl}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-email/30 bg-email/15 px-2.5 py-1.5 text-[11px] font-semibold text-email hover:bg-email/25">
                    <ExternalLink className="h-3.5 w-3.5" /> Enviar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          <iframe
            data-testid="web-forge-preview"
            title="Vista previa del sitio"
            srcDoc={html}
            className="h-[460px] w-full rounded-lg border border-border bg-white"
          />
        </div>
      )}
    </div>
  );
}

const SPRINT = [
  { col: "Backlog", tint: "#8A97B8", items: ["Rate limiting API", "Migrar a Prisma 6", "Webhooks de Stripe"] },
  { col: "En curso", tint: "#22D3EE", items: ["Endpoint de pagos (BYTE)", "Refactor auth (NOVA)"] },
  { col: "Revisión", tint: "#FBBF24", items: ["PR #482 checkout (LINT)"] },
  { col: "Hecho", tint: "#34D399", items: ["Login OAuth", "Dashboard v1", "Seed de datos"] },
];

const PRS = [
  { id: "#482", title: "feat: endpoint de pagos", author: "Diego Salas", state: "En revisión", tint: "#FBBF24" },
  { id: "#479", title: "fix: validación de carrito", author: "Sofía Mena", state: "Aprobado", tint: "#34D399" },
  { id: "#475", title: "refactor: capa de auth", author: "Lucía Pérez", state: "Cambios pedidos", tint: "#FB7185" },
];

const RELEASES = [
  { v: "v1.4", when: "Jue", status: "En preparación (SHIP)", tint: "#FBBF24" },
  { v: "v1.3", when: "Hace 6d", status: "Desplegada", tint: "#34D399" },
];

export function EngineeringView() {
  const agents = useDeck((s) => s.areaAgents.ingenieria);
  const staff = useDeck((s) => s.staff.filter((p) => p.department === "ingenieria"));
  const agentEnabled = useDeck((s) => s.agentEnabled);
  const toggleAgent = useDeck((s) => s.toggleAgent);
  const [runAgent, setRunAgent] = useState<AreaAgent | null>(null);
  const [checkin, setCheckin] = useState<StaffMember | null>(null);

  const subCount = agents.reduce((n, a) => n + a.subagents.length, 0);
  const avgQ = Math.round(agents.reduce((n, a) => n + a.qualityScore, 0) / agents.length);

  return (
    <div className="flex flex-col gap-4">
      {/* Dashboard del equipo REAL (Juan y David) */}
      <TeamDashboard />

      <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
        <Metric icon={Code2} label="Agentes" value={String(agents.length)} tint="#818CF8" />
        <Metric icon={GitBranch} label="Subagentes" value={String(subCount)} tint="#E879F9" />
        <Metric icon={Sparkles} label="Calidad media" value={String(avgQ)} tint="#FBBF24" />
        <Metric icon={Users} label="Equipo" value={String(staff.length)} tint="#34D399" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <ProjectBuilder />
          <WebsiteForge />
          <div>
            <p className="label-eyebrow mb-2 px-1">Agentes autónomos · pulsa “Ejecutar” para correr una tarea con subagentes</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {agents.map((a) => (
                <DeptStation
                  key={a.id}
                  agent={a}
                  onRun={setRunAgent}
                  enabled={agentEnabled[a.id] !== false}
                  onToggle={(ag) => toggleAgent(ag.id)}
                />
              ))}
            </div>
          </div>

          {/* Sprint board */}
          <div className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold text-text">Sprint actual</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
              {(IS_DEMO ? SPRINT : SPRINT.map((c) => ({ ...c, items: [] as string[] }))).map((c) => (
                <div key={c.col} className="rounded-xl border border-border bg-bg-soft/50">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.tint }} />
                    <span className="text-[11px] font-semibold text-text">{c.col}</span>
                    <span className="stat-num ml-auto text-[10px] text-text-dim">{c.items.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-2 pb-2">
                    {c.items.map((it) => (
                      <div key={it} className="rounded-lg border border-border bg-surface/70 px-2.5 py-2 text-[11px] text-text-muted">
                        {it}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PRs */}
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <GitPullRequest className="h-4 w-4 text-[#818CF8]" />
              <p className="text-[13px] font-semibold text-text">Pull requests</p>
            </div>
            <div className="divide-y divide-border/60">
              {!IS_DEMO && <p className="px-4 py-5 text-center text-[12px] text-text-dim">Sin PRs aún</p>}
              {(IS_DEMO ? PRS : []).map((pr) => (
                <div key={pr.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="stat-num text-[11px] text-text-dim">{pr.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-text">{pr.title}</p>
                    <p className="text-[10px] text-text-dim">{pr.author}</p>
                  </div>
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ color: pr.tint, background: `${pr.tint}14` }}>
                    {pr.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="label-eyebrow mb-2 px-1">Equipo de Desarrollo</p>
            <div className="flex flex-col gap-2">
              {staff.map((p) => (
                <StaffCard key={p.id} person={p} onCheckIn={setCheckin} />
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-[#34D399]" />
              <p className="text-[13px] font-semibold text-text">Releases</p>
            </div>
            <div className="space-y-2">
              {!IS_DEMO && <p className="py-3 text-center text-[12px] text-text-dim">Sin releases aún</p>}
              {(IS_DEMO ? RELEASES : []).map((r) => (
                <div key={r.v} className="flex items-center justify-between rounded-lg border border-border bg-bg-soft/50 px-3 py-2">
                  <span className="stat-num text-[12px] font-medium text-text">{r.v}</span>
                  <span className="text-[10px]" style={{ color: r.tint }}>{r.status}</span>
                  <span className="text-[10px] text-text-dim">{r.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AgentTaskPanel agent={runAgent} area="Desarrollo" onClose={() => setRunAgent(null)} />
      <CheckInPanel person={checkin} onClose={() => setCheckin(null)} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="flex min-w-[130px] flex-1 items-center gap-3 px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${tint}1a`, color: tint }}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-tight">
        <p className="stat-num text-[18px] font-medium text-text">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
      </div>
    </div>
  );
}
