"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

/**
 * Reloj de la simulación. Monta un único intervalo que llama a tick().
 * La cadencia depende de `speed`. No renderiza nada.
 */
export function DemoClock() {
  const running = useDeck((s) => s.running);
  const speed = useDeck((s) => s.speed);
  const tick = useDeck((s) => s.tick);

  // Rehidrata la configuración persistida DESPUÉS de montar (evita desajustes de hidratación).
  useEffect(() => {
    useDeck.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!running) return;
    const base = 1400; // ms por paso a velocidad 1x
    const id = setInterval(() => tick(), Math.max(220, base / speed));
    return () => clearInterval(id);
  }, [running, speed, tick]);

  return null;
}
