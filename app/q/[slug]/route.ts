import { getQuote } from "@/lib/billing";
import { SELLER } from "@/lib/seller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cop = (n: number) => "$" + n.toLocaleString("es-CO");

// GET /q/<slug> — cotización pública para el cliente (con pago o datos de transferencia).
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const q = await getQuote(params.slug);
  if (!q) {
    return new Response(`<!doctype html><meta charset=utf-8><div style="font-family:system-ui;text-align:center;padding:60px;color:#444">Cotización no encontrada.</div>`, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const rows = q.items.map((it) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee">${it.desc}${it.qty > 1 ? ` ×${it.qty}` : ""}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${cop(it.qty * it.price)}</td></tr>`).join("");
  const waMsg = encodeURIComponent(`Hola ${SELLER.name}, ya realicé el pago de la cotización de ${q.company}. Adjunto el comprobante.`);
  const payBlock = q.status === "paid"
    ? `<div style="background:#e7f8ef;color:#127a4b;padding:14px;border-radius:12px;text-align:center;font-weight:600">✅ Pago recibido. ¡Gracias!</div>`
    : (q.paymentUrl
        ? `<a href="${q.paymentUrl}" style="display:block;background:#111;color:#fff;text-align:center;padding:15px;border-radius:12px;font-weight:700;text-decoration:none">Pagar ahora (tarjeta / PSE / Nequi)</a>`
        : `<div style="background:#f6f7f9;border:1px solid #eee;padding:14px;border-radius:12px"><b>Para pagar por transferencia:</b><br>${SELLER.payment}</div>`)
    + `<a href="https://wa.me/${SELLER.phone.replace(/[^\d]/g, "")}?text=${waMsg}" style="display:block;margin-top:10px;text-align:center;color:#0a7;text-decoration:none;font-weight:600">Ya pagué → enviar comprobante por WhatsApp</a>`;

  const html = `<!doctype html><html lang=es><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Cotización · ${q.company}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0b0f1a;margin:0;padding:24px;color:#111}
.card{max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 20px 60px -20px rgba(0,0,0,.5)}
h1{font-size:20px;margin:0}.muted{color:#888;font-size:13px}table{width:100%;border-collapse:collapse;margin:18px 0}
.total{display:flex;justify-content:space-between;font-size:20px;font-weight:800;margin:14px 0}</style></head>
<body><div class="card">
<div style="display:flex;justify-content:space-between;align-items:center">
  <div><div style="font-weight:800;font-size:18px">${SELLER.business}</div><div class="muted">Cotización</div></div>
  <div class="muted" style="text-align:right">${new Date(q.createdAt).toLocaleDateString("es-CO")}</div>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0">
<h1>Para: ${q.company}</h1>${q.contact ? `<div class="muted">${q.contact}</div>` : ""}
<table>${rows}</table>
<div class="total"><span>Total</span><span>${cop(q.total)} COP</span></div>
${q.note ? `<p class="muted">${q.note}</p>` : ""}
${payBlock}
<p class="muted" style="text-align:center;margin-top:18px">${SELLER.business} · ${SELLER.phone}</p>
</div></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
