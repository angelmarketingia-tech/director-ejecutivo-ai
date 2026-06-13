"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve `now` actualizado cada `intervalMs`, pero solo tras montar en cliente
 * (evita desajustes de hidratación al renderizar "hace X"). Antes de montar
 * devuelve `null`, así los componentes pueden mostrar un placeholder.
 */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "hace 3m", "hace 2h"… a partir de un epoch ms y el `now` del hook. */
export function since(ts: number, now: number | null): string {
  if (now == null) return "—";
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}
