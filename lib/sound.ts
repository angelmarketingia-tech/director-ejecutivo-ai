/**
 * Sonido sutil opcional (síntesis WebAudio, sin archivos). Apagado por defecto.
 * El usuario lo activa con el botón de la barra superior.
 */
let ctx: AudioContext | null = null;
const KEY = "nexus_sound";

export function soundOn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "on";
}
export function setSound(on: boolean): void {
  if (typeof window !== "undefined") localStorage.setItem(KEY, on ? "on" : "off");
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.04) {
  if (!soundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
  } catch {
    /* audio no disponible */
  }
}

export function playSound(name: "tick" | "open" | "success"): void {
  if (name === "tick") tone(520, 0.06, "triangle", 0.03);
  else if (name === "open") tone(380, 0.08, "sine", 0.035);
  else if (name === "success") {
    tone(523, 0.09, "sine", 0.04);
    setTimeout(() => tone(784, 0.13, "sine", 0.04), 90);
  }
}
