/**
 * Usuarios de la app con rol. El admin (tú) ve todo y la auditoría de tokens; los
 * miembros (Juan, David) entran con su propio login y solo gestionan SU actividad.
 *
 * Contraseñas por variables de entorno en Vercel (recomendado):
 *   APP_USER / APP_PASSWORD      → admin (tú)
 *   JUAN_PASSWORD                → usuario "juan"
 *   DAVID_PASSWORD               → usuario "david"
 * Si no defines JUAN_PASSWORD/DAVID_PASSWORD, se usan valores por defecto (cámbialos).
 */
export type Role = "admin" | "member";
export interface AppUser {
  id: string;
  name: string;
  role: Role;
  password: string;
}

export function getUsers(): AppUser[] {
  const users: AppUser[] = [
    { id: process.env.APP_USER || "admin", name: "Admin", role: "admin", password: process.env.APP_PASSWORD || "" },
    { id: "juan", name: "Juan", role: "member", password: process.env.JUAN_PASSWORD || "juan2026*" },
    { id: "david", name: "David", role: "member", password: process.env.DAVID_PASSWORD || "david2026*" },
    { id: "andres", name: "Andrés", role: "member", password: process.env.ANDRES_PASSWORD || "andres2026*" },
    { id: "angel", name: "Angel", role: "admin", password: process.env.ANGEL_PASSWORD || "angel2026*" },
  ];
  return users.filter((u) => u.password); // el admin solo existe si tiene contraseña
}

export function findUserByCredentials(id: string, password: string): AppUser | undefined {
  const u = getUsers().find((x) => x.id.toLowerCase() === id.toLowerCase().trim());
  return u && u.password === password ? u : undefined;
}

export function roleOf(id: string): Role {
  return getUsers().find((u) => u.id.toLowerCase() === id.toLowerCase())?.role ?? "member";
}

export function nameOf(id: string): string {
  return getUsers().find((u) => u.id.toLowerCase() === id.toLowerCase())?.name ?? id;
}
