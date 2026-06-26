import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-4 text-center">
      <div className="aurora pointer-events-none fixed inset-0" />
      <div className="relative flex flex-col items-center">
        <img src="/daptux-logo.png" alt="Daptux.IA" className="mb-4 h-20 w-20 object-contain" />
        <p className="text-[44px] font-bold tracking-tight text-text">Daptux<span className="text-brand-ink">.IA</span></p>
        <p className="mt-2 text-[14px] text-text-muted">Esta página no existe o se movió.</p>
        <Link href="/" className="mt-5 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-bold text-[#0c1108] hover:brightness-110">
          Volver al Centro de Mando
        </Link>
      </div>
    </main>
  );
}
