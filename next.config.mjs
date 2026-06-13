/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a todas las rutas.
const securityHeaders = [
  // Clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Fugas de referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles del navegador
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HSTS (efectivo bajo HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Content Security Policy. Pragmática para Next/Framer; el cliente solo llama a su
  // propio origen (las APIs externas se llaman desde el servidor).
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no revelar "X-Powered-By: Next.js"
  env: {
    NEXT_PUBLIC_APP_NAME: "Director Comercial AI",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
