"use client";

import { useDeck } from "@/lib/store";
import { fmtMoney, fmtNum } from "@/lib/utils";
import {
  Search,
  Filter,
  Mail,
  PhoneCall,
  CalendarCheck,
  Flame,
  Trophy,
  TrendingUp,
} from "lucide-react";

function Metric({
  icon: Icon,
  label,
  value,
  tint,
  testid,
}: {
  icon: any;
  label: string;
  value: string;
  tint: string;
  testid?: string;
}) {
  return (
    <div className="flex min-w-[112px] flex-1 items-center gap-3 px-3.5 py-2.5">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${tint}1A`, color: tint }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-tight">
        <p data-testid={testid} className="stat-num text-[18px] font-medium tabular-nums text-text">
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
      </div>
    </div>
  );
}

export function MetricsBar() {
  const m = useDeck((s) => s.metrics);
  return (
    <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
      <Metric icon={Search} label="Leads" value={fmtNum(m.leadsFound)} tint="#22D3EE" testid="metric-leads" />
      <Metric icon={Filter} label="Calificados" value={fmtNum(m.leadsQualified)} tint="#FBBF24" />
      <Metric icon={Mail} label="Emails" value={fmtNum(m.emailsSent)} tint="#34D399" />
      <Metric icon={PhoneCall} label="Llamadas" value={fmtNum(m.callsMade)} tint="#FB7185" testid="metric-llamadas" />
      <Metric icon={CalendarCheck} label="Reuniones" value={fmtNum(m.meetingsBooked)} tint="#A78BFA" />
      <Metric icon={Flame} label="Calientes" value={fmtNum(m.hotLeads)} tint="#FB7185" />
      <Metric icon={Trophy} label="Cierres" value={fmtNum(m.dealsWon)} tint="#E8C766" testid="metric-cierres" />
      <Metric icon={TrendingUp} label="Pipeline" value={fmtMoney(m.revenue)} tint="#34D399" />
    </div>
  );
}
