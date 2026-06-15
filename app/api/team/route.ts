import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized, vstr, currentUser } from "@/lib/security";
import { getTeam, setCurrent, completeTask, deleteTask, teamEnabled } from "@/lib/teamstore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/team — estado del equipo real (Juan y David), compartido entre dispositivos.
export async function GET(req: Request) {
  const rl = rateLimit(req, "team-get", 90, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const team = await getTeam();
  return NextResponse.json({ ok: true, team, stored: teamEnabled() });
}

// POST /api/team — acciones: setCurrent | complete | deleteTask
export async function POST(req: Request) {
  const rl = rateLimit(req, "team-post", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 4_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const action = vstr((data as any)?.action, 20);
  const memberId = vstr((data as any)?.memberId, 20);
  if (!action || !memberId) return NextResponse.json({ ok: false, error: "Faltan 'action' y 'memberId'" }, { status: 400 });

  // Cada miembro solo edita SU actividad; el admin puede editar a cualquiera.
  const u = await currentUser(req);
  if (u && u.role !== "admin" && u.id.toLowerCase() !== memberId.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Solo puedes actualizar tu propia actividad." }, { status: 403 });
  }

  let team;
  if (action === "setCurrent") {
    team = await setCurrent(memberId, vstr((data as any)?.task, 200) ?? "");
  } else if (action === "complete") {
    const text = vstr((data as any)?.text, 300);
    if (!text) return NextResponse.json({ ok: false, error: "Falta 'text' de la tarea" }, { status: 400 });
    team = await completeTask(memberId, text, vstr((data as any)?.url, 500) ?? undefined);
  } else if (action === "deleteTask") {
    const taskId = vstr((data as any)?.taskId, 60);
    if (!taskId) return NextResponse.json({ ok: false, error: "Falta 'taskId'" }, { status: 400 });
    team = await deleteTask(memberId, taskId);
  } else {
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, team, stored: teamEnabled() });
}
