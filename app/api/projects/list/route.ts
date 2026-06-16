import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized, currentUser, vstr } from "@/lib/security";
import { listProjects, getProject, saveProject, deleteProject, setProjectUrl } from "@/lib/projectstore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/projects/list           → índice de proyectos
// GET /api/projects/list?id=xxx    → proyecto completo (html)
export async function GET(req: Request) {
  const rl = rateLimit(req, "proj-get", 90, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) return NextResponse.json({ ok: true, project: await getProject(id) });
  return NextResponse.json({ ok: true, projects: await listProjects() });
}

// POST /api/projects/list — save | delete
export async function POST(req: Request) {
  const rl = rateLimit(req, "proj-post", 40, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const { data, tooLarge, bad } = await readJsonLimited(req, 120_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const action = vstr((data as any)?.action, 20) ?? "save";
  if (action === "delete") {
    const u = await currentUser(req);
    if (u && u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo admin elimina" }, { status: 403 });
    const id = vstr((data as any)?.id, 60);
    if (id) await deleteProject(id);
    return NextResponse.json({ ok: true, projects: await listProjects() });
  }

  if (action === "seturl") {
    const id = vstr((data as any)?.id, 60);
    const url = vstr((data as any)?.url, 400);
    if (id && url) await setProjectUrl(id, url);
    return NextResponse.json({ ok: true, projects: await listProjects() });
  }

  const name = vstr((data as any)?.name, 120) ?? "Proyecto";
  const html = vstr((data as any)?.html, 100_000);
  if (!html) return NextResponse.json({ ok: false, error: "Falta 'html'" }, { status: 400 });
  const kind = ((data as any)?.kind === "web" ? "web" : "proyecto") as "web" | "proyecto";
  const meta = await saveProject({ name, kind, html, projectMd: vstr((data as any)?.projectMd, 20_000) ?? undefined, summary: vstr((data as any)?.summary, 1000) ?? undefined });
  return NextResponse.json({ ok: true, saved: meta, projects: await listProjects() });
}
