"use client";

import { useEffect } from "react";

/** Captura cualquier error de render en la app y muestra una salida amable (sin pantalla rota). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[app error]", error); }, [error]);
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-4 text-center">
      <div className="relative max-w-[420px]">
        <p className="text-[15px] font-semibold text-text">Algo se interrumpió por un momento</p>
        <p className="mt-1 text-[12px] text-text-muted">Ya lo registramos. Puedes reintentar sin perder tu sesión.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={reset} className="rounded-lg bg-prospect/15 px-4 py-2 text-[13px] font-semibold text-prospect hover:bg-prospect/25">Reintentar</button>
          <a href="/" className="rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-text-muted hover:text-text">Ir al inicio</a>
        </div>
      </div>
    </main>
  );
}
