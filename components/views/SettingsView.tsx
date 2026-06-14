"use client";

import { useEffect, useState } from "react";
import { useDeck } from "@/lib/store";
import { AGENTS_SEED } from "@/lib/demo/data";
import { AREA_AGENTS_SEED, AREA_BY_ID } from "@/lib/departments";
import type { Area } from "@/lib/types";
import {
  PRESETS,
  PRESET_LABEL,
  type Preset,
  type ChannelsMode,
  costPerLead,
  monthlyApiCost,
  monthlyChannelsCost,
  fmtUsd,
} from "@/lib/agents/pricing";
import { cn } from "@/lib/utils";
import {
  Mic,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  Database,
  KeyRound,
  ShieldAlert,
  Gauge,
  PhoneOff,
  Power,
  GitBranch,
  Cpu,
  Wifi,
  WifiOff,
} from "lucide-react";

// Lista plana de TODOS los agentes (comerciales + de área) con su metadata.
const ALL_AGENTS: { id: string; name: string; role: string; area: Area; color: string }[] = [
  ...AGENTS_SEED.filter((a) => a.id !== "director").map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    area: "comercial" as Area,
    color: a.color,
  })),
  ...(Object.values(AREA_AGENTS_SEED).flat() as Array<{ id: string; name: string; role: string; area: Area; color: string }>),
];

function ClaudeStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [spent, setSpent] = useState<number | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/budget")
      .then((r) => r.json())
      .then((d) => {
        setConnected(!!d.claudeConnected);
        setSpent(d.budget?.spentUsd ?? 0);
        setCap(d.budget?.capUsd ?? null);
      })
      .catch(() => setConnected(false));
  }, []);
  const on = connected === true;
  return (
    <div
      className="flex items-center justify-between rounded-xl border px-4 py-3"
      style={{
        borderColor: on ? "rgba(52,211,153,0.4)" : "rgba(251,191,36,0.4)",
        background: on ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        {on ? <Wifi className="h-4 w-4 text-ok" /> : <WifiOff className="h-4 w-4 text-warn" />}
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-text">
            Claude: {connected === null ? "comprobando…" : on ? "conectado (agentes reales)" : "modo demo (sin API key)"}
          </p>
          <p className="text-[10px] text-text-dim">
            {on
              ? "Las ejecuciones consumen API real y cuentan en el presupuesto."
              : "Añade ANTHROPIC_API_KEY en .env.local para activar agentes reales."}
          </p>
        </div>
      </div>
      {on && spent != null && (
        <span className="stat-num text-[12px] text-email">
          Gasto hoy: ${spent.toFixed(2)}{cap ? ` / $${cap}` : ""}
        </span>
      )}
    </div>
  );
}

const INTEGRATIONS = [
  { name: "ElevenLabs", env: "ELEVENLABS_API_KEY", icon: Mic, desc: "Voz del agente de llamadas", color: "#FB7185" },
  { name: "Twilio", env: "TWILIO_AUTH_TOKEN", icon: Mic, desc: "Telefonía", color: "#FB7185" },
  { name: "WhatsApp Cloud API", env: "WHATSAPP_ACCESS_TOKEN", icon: MessageCircle, desc: "Mensajería con plantillas", color: "#34D399" },
  { name: "Resend", env: "RESEND_API_KEY", icon: Mail, desc: "Envío de email", color: "#34D399" },
  { name: "Google Maps Places", env: "GOOGLE_MAPS_API_KEY", icon: MapPin, desc: "Descubrimiento de negocios", color: "#22D3EE" },
  { name: "Google Calendar", env: "GOOGLE_CALENDAR_ID", icon: Calendar, desc: "Agendamiento", color: "#A78BFA" },
  { name: "Anthropic (Claude)", env: "ANTHROPIC_API_KEY", icon: KeyRound, desc: "Cerebro de los agentes", color: "#E8C766" },
  { name: "PostgreSQL", env: "DATABASE_URL", icon: Database, desc: "Persistencia (Prisma)", color: "#FBBF24" },
];

const PRESETS_ORDER: Preset[] = ["economica", "equilibrada", "premium"];

export function SettingsView() {
  const preset = useDeck((s) => s.preset);
  const setPreset = useDeck((s) => s.setPreset);
  const channels = useDeck((s) => s.channelsMode);
  const setChannelsMode = useDeck((s) => s.setChannelsMode);
  const caps = useDeck((s) => s.dailyCaps);
  const setCap = useDeck((s) => s.setCap);
  const used = useDeck((s) => s.usedToday);

  const api = monthlyApiCost(preset, channels, 200);
  const ch = monthlyChannelsCost(channels, 200);
  const totalLow = Math.round(api + ch.low);
  const totalHigh = Math.round(api + ch.high);

  return (
    <div className="flex flex-col gap-4">
      <ClaudeStatus />
      <TokenSavings />
      <AgentControlPanel />

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Preset de modelos */}
      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-prospect" />
          <p className="text-[14px] font-semibold text-text">Calidad / costo de los agentes</p>
        </div>
        <div className="space-y-2">
          {PRESETS_ORDER.map((p) => {
            const active = preset === p;
            const perLead = costPerLead(p, channels);
            return (
              <button
                key={p}
                data-testid={`preset-${p}`}
                onClick={() => setPreset(p)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                  active ? "border-prospect/50 bg-prospect/10" : "border-border bg-surface/50 hover:border-border-strong"
                )}
              >
                <div className="leading-tight">
                  <p className="text-[13px] font-medium text-text">
                    {PRESET_LABEL[p]} {active && <span className="text-prospect">· activo</span>}
                  </p>
                  <p className="text-[10px] text-text-dim">
                    {p === "economica" && "Todo Haiku · máximo ahorro"}
                    {p === "equilibrada" && "Haiku (volumen) + Sonnet (calidad) — recomendada"}
                    {p === "premium" && "Opus 4.8 en todo · máxima capacidad"}
                  </p>
                </div>
                <span className="stat-num shrink-0 text-[11px] text-email">
                  {fmtUsd(perLead)}/lead
                </span>
              </button>
            );
          })}
        </div>

        {/* Modo de canales */}
        <p className="label-eyebrow mb-2 mt-5">Canales de contacto</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="channels-full"
            onClick={() => setChannelsMode("full" as ChannelsMode)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              channels === "full" ? "border-prospect/50 bg-prospect/10" : "border-border bg-surface/50 hover:border-border-strong"
            )}
          >
            <p className="text-[12px] font-medium text-text">Completo</p>
            <p className="text-[10px] text-text-dim">Email + WhatsApp + voz</p>
          </button>
          <button
            data-testid="channels-no_voice"
            onClick={() => setChannelsMode("no_voice" as ChannelsMode)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              channels === "no_voice" ? "border-email/50 bg-email/10" : "border-border bg-surface/50 hover:border-border-strong"
            )}
          >
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-text">
              <PhoneOff className="h-3 w-3" /> Sin voz
            </p>
            <p className="text-[10px] text-text-dim">Solo prospección + email + WhatsApp</p>
          </button>
        </div>

        {/* Proyección */}
        <div className="mt-5 rounded-xl border border-border bg-bg-soft/60 p-4">
          <p className="label-eyebrow mb-2">Proyección · 200 leads/semana</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-text-dim">API de Claude</p>
              <p className="stat-num text-[18px] font-medium text-director">{fmtUsd(api)}/mes</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-dim">Total estimado (con canales)</p>
              <p data-testid="cost-projection" className="stat-num text-[20px] font-medium text-email">
                {fmtUsd(totalLow)}–{fmtUsd(totalHigh)}/mes
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-text-dim">
            {channels === "no_voice"
              ? "Sin llamadas de voz: email + WhatsApp usan capas gratuitas amplias."
              : "Incluye ~40% de leads calientes llamados (3 min, $0.10–$0.30/min)."}{" "}
            Con prompt caching el costo real suele ser menor.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Topes diarios + gasto del día */}
        <div className="panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warn" />
            <p className="text-[14px] font-semibold text-text">Topes diarios (corte real)</p>
          </div>
          <p className="mb-4 text-[11px] text-text-muted">
            Al alcanzar un tope, el motor deja de generar esa acción; al alcanzar el tope de
            gasto, el pipeline se detiene. Nunca se dispara la factura.
          </p>
          <div className="space-y-3">
            <CapRow label="Gasto API / día (USD)" k="spendUsd" value={caps.spendUsd} used={used.spendUsd} setCap={setCap} tint="#E8C766" money />
            <CapRow label="Emails / día" k="emails" value={caps.emails} used={used.emails} setCap={setCap} tint="#34D399" />
            <CapRow label="WhatsApp / día" k="whatsapp" value={caps.whatsapp} used={used.whatsapp} setCap={setCap} tint="#22D3EE" />
            <CapRow label="Llamadas / día" k="calls" value={caps.calls} used={used.calls} setCap={setCap} tint="#FB7185" disabled={channels === "no_voice"} />
          </div>
        </div>

        {/* Integraciones */}
        <div className="panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-prospect" />
            <p className="text-[14px] font-semibold text-text">Integraciones / API keys</p>
          </div>
          <p className="mb-3 text-[11px] text-text-muted">
            En <code className="rounded bg-bg-soft px-1 text-[10px]">.env.local</code>. Sin clave,
            el proveedor cae a modo simulado.
          </p>
          <div className="space-y-1.5">
            {INTEGRATIONS.map((i) => {
              const Icon = i.icon;
              return (
                <div key={i.env} className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${i.color}1a`, color: i.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-text">{i.name}</p>
                    <p className="text-[10px] text-text-dim">{i.desc}</p>
                  </div>
                  <span className="chip border-warn/30 bg-warn/10 text-warn">demo</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

/** Explicador intuitivo de cómo se ahorran tokens sin perder calidad. */
function TokenSavings() {
  const savings = [
    { t: "Solo gastas cuando TÚ ejecutas", d: "Nada llama a Claude por su cuenta. Los agentes están en reposo hasta que pulses “Ejecutar” o “Buscar”." },
    { t: "Tope de gasto diario", d: "El sistema corta solo al llegar al límite (ajústalo abajo). Nunca un susto en la factura." },
    { t: "Preset Equilibrada", d: "Usa modelos baratos (Haiku) para lo masivo y potentes (Sonnet) solo donde importa." },
    { t: "Subagentes opcionales", d: "Actívalos para máxima calidad (más tokens) o déjalos off para ahorrar. Tú decides." },
    { t: "Apaga agentes que no uses", d: "Un agente apagado no trabaja ni gasta. Enciéndelos cuando los necesites." },
  ];
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-ok" />
        <p className="text-[14px] font-semibold text-text">Ahorro de tokens (sin perder calidad)</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {savings.map((s) => (
          <div key={s.t} className="rounded-lg border border-border bg-surface/50 px-3 py-2.5">
            <p className="text-[12px] font-medium text-text">✓ {s.t}</p>
            <p className="mt-0.5 text-[11px] text-text-dim">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Panel de control: encender/apagar cada agente y los subagentes para cuidar la API. */
function AgentControlPanel() {
  const agentEnabled = useDeck((s) => s.agentEnabled);
  const toggleAgent = useDeck((s) => s.toggleAgent);
  const setAllAgents = useDeck((s) => s.setAllAgents);
  const subagentsEnabled = useDeck((s) => s.subagentsEnabled);
  const toggleSubagents = useDeck((s) => s.toggleSubagents);

  const active = ALL_AGENTS.filter((a) => agentEnabled[a.id] !== false).length;
  const areas = Array.from(new Set(ALL_AGENTS.map((a) => a.area)));

  return (
    <div className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Power className="h-4 w-4 text-prospect" />
          <div className="leading-tight">
            <p className="text-[14px] font-semibold text-text">Control de agentes · uso de API</p>
            <p className="text-[11px] text-text-dim">
              Apaga los agentes que no necesites: dejan de trabajar y de consumir API.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span data-testid="agents-active-count" className="stat-num rounded-full bg-prospect/15 px-2.5 py-1 text-[12px] text-prospect">
            {active}/{ALL_AGENTS.length} activos
          </span>
          <button
            data-testid="btn-agents-all-off"
            onClick={() => setAllAgents(false)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:text-text"
          >
            Apagar todos
          </button>
          <button
            data-testid="btn-agents-all-on"
            onClick={() => setAllAgents(true)}
            className="rounded-lg border border-ok/30 bg-ok/10 px-2.5 py-1.5 text-[11px] font-medium text-ok hover:bg-ok/20"
          >
            Encender todos
          </button>
        </div>
      </div>

      {/* Subagentes global */}
      <button
        data-testid="btn-toggle-subagents"
        onClick={toggleSubagents}
        className={cn(
          "mb-4 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 transition-colors",
          subagentsEnabled ? "border-[#E879F9]/40 bg-[#E879F9]/10" : "border-border bg-surface/50"
        )}
      >
        <span className="flex items-center gap-2 text-[12px] font-medium text-text">
          <GitBranch className="h-4 w-4 text-[#E879F9]" /> Subagentes de calidad
          <span className="text-[10px] text-text-dim">(más calidad, más tokens)</span>
        </span>
        <span className={cn("text-[11px] font-semibold", subagentsEnabled ? "text-[#E879F9]" : "text-text-dim")}>
          {subagentsEnabled ? "Activados" : "Desactivados"}
        </span>
      </button>

      {/* Agentes por área */}
      <div className="space-y-4">
        {areas.map((area) => (
          <div key={area}>
            <p className="label-eyebrow mb-2" style={{ color: AREA_BY_ID[area].color }}>
              {AREA_BY_ID[area].label.replace(/^.*· /, "")}
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ALL_AGENTS.filter((a) => a.area === area).map((a) => {
                const on = agentEnabled[a.id] !== false;
                return (
                  <button
                    key={a.id}
                    data-testid={`agent-toggle-${a.id}`}
                    onClick={() => toggleAgent(a.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      on ? "border-border bg-surface/50" : "border-border bg-bg-soft/40 opacity-60"
                    )}
                  >
                    <Cpu className="h-3.5 w-3.5 shrink-0" style={{ color: on ? a.color : "#5A678C" }} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[12px] font-medium text-text">{a.name}</p>
                      <p className="truncate text-[10px] text-text-dim">{a.role}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold uppercase", on ? "text-ok" : "text-text-dim")}>
                      {on ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CapRow({
  label,
  k,
  value,
  used,
  setCap,
  tint,
  money,
  disabled,
}: {
  label: string;
  k: "emails" | "whatsapp" | "calls" | "spendUsd";
  value: number;
  used: number;
  setCap: (k: any, v: number) => void;
  tint: string;
  money?: boolean;
  disabled?: boolean;
}) {
  const pct = value > 0 ? Math.min(100, (used / value) * 100) : 0;
  const usedStr = money ? `$${used.toFixed(2)}` : Math.round(used);
  return (
    <div className={cn(disabled && "opacity-40")}>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-text-muted">{label}{disabled && " · desactivado (sin voz)"}</span>
        <span className="flex items-center gap-2">
          <span className="stat-num text-text-dim">{usedStr} / </span>
          <input
            type="number"
            value={value}
            disabled={disabled}
            onChange={(e) => setCap(k, Number(e.target.value) || 0)}
            className="w-16 rounded border border-border bg-bg-soft px-1.5 py-0.5 text-right text-[11px] text-text outline-none focus:border-prospect/50"
          />
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-soft">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tint }} />
      </div>
    </div>
  );
}
