"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      const j = await r.json();
      if (j.ok) {
        window.location.href = "/";
      } else {
        setError(j.error ?? "No se pudo iniciar sesión.");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="aurora pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 bg-grid-faint bg-[size:48px_48px] opacity-[0.18]" />
      <div className="pointer-events-none fixed inset-0 bg-radial-deck" />

      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <form
        onSubmit={submit}
        className="panel relative z-10 w-full max-w-[400px] p-8 shadow-panel"
      >
        {/* Marca Daptux */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="relative mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-surface ring-1 ring-brand/40 shadow-glow-soft">
            <img src="/daptux-logo.png" alt="Daptux.IA" className="h-[72px] w-[72px] object-contain" />
          </div>
          <p className="text-[20px] font-bold tracking-tight text-text">
            Daptux<span className="text-brand-ink">.IA</span>
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-ink">
            Centro de Mando Comercial
          </p>
        </div>

        <h1 className="text-[17px] font-semibold text-text">Iniciar sesión</h1>
        <p className="mb-5 mt-1 text-[12px] text-text-dim">
          Acceso restringido al equipo. Ingresa tus credenciales.
        </p>

        <label htmlFor="login-user" className="label-eyebrow">Usuario</label>
        <input
          id="login-user"
          data-testid="login-user"
          aria-label="Usuario"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          className="mb-3 mt-1.5 w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-brand/60"
        />

        <label htmlFor="login-password" className="label-eyebrow">Contraseña</label>
        <input
          id="login-password"
          data-testid="login-password"
          type="password"
          aria-label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 mt-1.5 w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-brand/60"
        />

        {error && (
          <p data-testid="login-error" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </p>
        )}

        <button
          data-testid="login-submit"
          type="submit"
          disabled={loading || !user || !password}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-[13px] font-bold text-[#0c1108] transition-all hover:brightness-110 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-5 text-center text-[10px] text-text-dim">
          Daptux.IA · Business Software &amp; AI
        </p>
      </form>
    </main>
  );
}
