/** Datos del vendedor/negocio para cotizaciones, firmas y pagos. Sobrescribibles por env. */
export const SELLER = {
  name: process.env.SELLER_NAME || "Angel Vaca",
  business: process.env.SELLER_BUSINESS || "Daptux.IA",
  phone: process.env.SELLER_PHONE || "+57 323 229 5422",
  // Datos de pago para transferencia (cuando no hay pasarela configurada).
  payment: process.env.SELLER_PAYMENT || "Nequi / Bancolombia: 323 229 5422 (a nombre de Angel Vaca)",
};
