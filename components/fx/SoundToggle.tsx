"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundOn, setSound, playSound } from "@/lib/sound";

/** Activa/desactiva el sonido sutil de la interfaz (apagado por defecto). */
export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundOn()), []);
  return (
    <button
      onClick={() => { const v = !on; setOn(v); setSound(v); if (v) playSound("open"); }}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:text-text"
      title={on ? "Sonido activado" : "Sonido desactivado"}
      aria-label="Sonido"
    >
      {on ? <Volume2 className="h-4 w-4 text-prospect" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
