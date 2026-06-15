/**
 * Equipo REAL de desarrollo (Juan y David), persistido en Vercel KV para que se vea en
 * todos los dispositivos. Cada uno marca qué está haciendo (con hora de inicio) y registra
 * las tareas/proyectos que completa (con URL de la web). Sin KV, es efímero en memoria.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface CompletedTask {
  id: string;
  text: string;
  url?: string;
  at: number; // epoch ms (sellado en el servidor)
  minutes?: number; // duración estimada si venía de una tarea en curso
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  current: { task: string; startedAt: number } | null;
  completed: CompletedTask[];
}

const KEY = "team:v1";

const ROLES: Record<string, string> = {
  angel: "CEO · Dirección",
  david: "CEO · Dirección",
  andres: "Programador creativo",
  juan: "Programador creativo",
};

function seed(): TeamMember[] {
  return [
    { id: "angel", name: "Angel", role: ROLES.angel, current: null, completed: [] },
    { id: "david", name: "David", role: ROLES.david, current: null, completed: [] },
    { id: "andres", name: "Andrés", role: ROLES.andres, current: null, completed: [] },
    { id: "juan", name: "Juan", role: ROLES.juan, current: null, completed: [] },
  ];
}

export function teamEnabled(): boolean {
  return kvConfigured();
}

export async function getTeam(): Promise<TeamMember[]> {
  if (!kvConfigured()) return seed();
  let t = await kvGetJSON<TeamMember[]>(KEY);
  if (!t || !Array.isArray(t) || t.length === 0) return seed();
  // Garantiza que el equipo Daptux exista y mantiene roles correctos.
  const base = seed();
  for (const s of base) if (!t.find((m) => m.id === s.id)) t.push(s);
  for (const m of t) if (ROLES[m.id]) m.role = ROLES[m.id];
  // Orden: CEOs primero, luego programadores.
  const order = ["angel", "david", "andres", "juan"];
  t = t.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return t;
}

async function save(team: TeamMember[]): Promise<void> {
  if (kvConfigured()) await kvSetJSON(KEY, team);
}

function find(team: TeamMember[], id: string): TeamMember | undefined {
  return team.find((m) => m.id === id);
}

/** Define la actividad en curso (sella la hora de inicio en el servidor). */
export async function setCurrent(memberId: string, task: string): Promise<TeamMember[]> {
  const team = await getTeam();
  const m = find(team, memberId);
  if (m) m.current = task ? { task, startedAt: Date.now() } : null;
  await save(team);
  return team;
}

/** Registra una tarea/proyecto completado (con URL opcional) y limpia la actividad en curso. */
export async function completeTask(memberId: string, text: string, url?: string): Promise<TeamMember[]> {
  const team = await getTeam();
  const m = find(team, memberId);
  if (m) {
    const minutes = m.current ? Math.max(1, Math.round((Date.now() - m.current.startedAt) / 60000)) : undefined;
    m.completed.unshift({
      id: `t_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      text,
      url: url || undefined,
      at: Date.now(),
      minutes,
    });
    m.completed = m.completed.slice(0, 200);
    m.current = null;
  }
  await save(team);
  return team;
}

/** Elimina una tarea registrada (corrección). */
export async function deleteTask(memberId: string, taskId: string): Promise<TeamMember[]> {
  const team = await getTeam();
  const m = find(team, memberId);
  if (m) m.completed = m.completed.filter((t) => t.id !== taskId);
  await save(team);
  return team;
}
