"use client";

import { motion } from "framer-motion";
import type { StaffMember } from "@/lib/types";
import { PRESENCE_COLOR, PRESENCE_LABEL } from "@/lib/departments";
import { useNow, since } from "@/lib/useNow";

/**
 * Tarjeta de una persona REAL: avatar, nombre, rol, presencia, qué hace y HACE CUÁNTO.
 * El "hace X" se actualiza en vivo (tras montar, sin desajuste de hidratación).
 */
export function StaffCard({
  person,
  onCheckIn,
}: {
  person: StaffMember;
  onCheckIn?: (p: StaffMember) => void;
}) {
  const now = useNow(1000);
  const pColor = PRESENCE_COLOR[person.presence];

  return (
    <motion.div
      layout
      className="panel-tight flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
    >
      <div className="relative shrink-0">
        <div
          className="grid h-11 w-11 place-items-center rounded-full text-[12px] font-semibold"
          style={{ background: `${person.color}1f`, color: person.color }}
        >
          {person.initials}
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface"
          style={{ background: pColor }}
          title={PRESENCE_LABEL[person.presence]}
        />
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-text">{person.name}</p>
          <span className="text-[10px] text-text-dim">· {person.role}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-text-muted">
          {person.activity}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          <span style={{ color: pColor }}>{PRESENCE_LABEL[person.presence]}</span>
          <span className="text-text-dim">·</span>
          <span className="stat-num text-text-dim">{since(person.activitySince, now)}</span>
          <span className="text-text-dim">· {person.checkinsToday} check-ins hoy</span>
        </div>
      </div>

      {onCheckIn && (
        <button
          data-testid="btn-checkin"
          onClick={() => onCheckIn(person)}
          className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text-muted transition-colors hover:text-text"
        >
          Marcar
        </button>
      )}
    </motion.div>
  );
}
