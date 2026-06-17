import type { Metadata } from "next";
import { Space_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daptux.IA — Centro de Mando Comercial",
  description:
    "Centro de mando comercial de Daptux.IA: agentes autónomos prospectan, investigan, contactan y cierran ventas B2B, y construyen sitios web de alta calidad.",
  icons: { icon: "/daptux-logo.png" },
};

// Aplica el tema guardado ANTES de pintar (evita parpadeo claro/oscuro).
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
