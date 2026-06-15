/**
 * Link de pago. Si hay MERCADOPAGO_ACCESS_TOKEN, crea un checkout real (tarjeta, PSE,
 * Nequi en Colombia). Si no, devuelve null y la cotización muestra datos de transferencia.
 * Mercado Pago: https://www.mercadopago.com.co/developers
 */
export async function createPaymentLink(amountCOP: number, title: string, backUrl: string): Promise<string | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || !(amountCOP > 0)) return null;
  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ title: title.slice(0, 120), quantity: 1, unit_price: Math.round(amountCOP), currency_id: "COP" }],
        back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
        auto_return: "approved",
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.init_point || j.sandbox_init_point || null;
  } catch {
    return null;
  }
}
