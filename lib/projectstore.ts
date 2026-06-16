/**
 * Historial de proyectos generados (constructor + generador de webs). Persistido en KV:
 * un índice ligero + cada proyecto completo bajo su propia clave. Así no se pierde nada
 * al cerrar la app y se ve en todos los dispositivos.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface ProjectMeta { id: string; name: string; kind: "web" | "proyecto"; at: number; url?: string; }
export interface Project extends ProjectMeta { html: string; projectMd?: string; summary?: string; }

const INDEX = "projects:index";
const MAX = 80;

export async function listProjects(): Promise<ProjectMeta[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<ProjectMeta[]>(INDEX)) ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  if (!kvConfigured()) return null;
  return await kvGetJSON<Project>("project:" + id);
}

export async function saveProject(p: { name: string; kind: "web" | "proyecto"; html: string; projectMd?: string; summary?: string; url?: string }): Promise<ProjectMeta> {
  const id = `pj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const project: Project = { id, name: p.name || "Proyecto", kind: p.kind, html: p.html, projectMd: p.projectMd, summary: p.summary, url: p.url, at: Date.now() };
  if (kvConfigured()) {
    await kvSetJSON("project:" + id, project);
    const idx = await listProjects();
    idx.unshift({ id, name: project.name, kind: project.kind, at: project.at, url: project.url });
    await kvSetJSON(INDEX, idx.slice(0, MAX));
  }
  return { id, name: project.name, kind: project.kind, at: project.at, url: project.url };
}

export async function setProjectUrl(id: string, url: string): Promise<void> {
  if (!kvConfigured()) return;
  const p = await getProject(id);
  if (p) { p.url = url; await kvSetJSON("project:" + id, p); }
  const idx = await listProjects();
  const m = idx.find((x) => x.id === id);
  if (m) { m.url = url; await kvSetJSON(INDEX, idx); }
}

export async function deleteProject(id: string): Promise<void> {
  if (!kvConfigured()) return;
  const idx = (await listProjects()).filter((x) => x.id !== id);
  await kvSetJSON(INDEX, idx);
  await kvSetJSON("project:" + id, null as any);
}
