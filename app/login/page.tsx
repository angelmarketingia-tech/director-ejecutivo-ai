"use client";

import { useState } from "react";
import { Radio, Lock, Loader2 } from "lucide-react";

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

      <form
        onSubmit={submit}
        className="panel relative z-10 w-full max-w-[380px] p-7 shadow-panel"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-director/30 to-prospect/20 ring-1 ring-director/40">
            <Radio className="h-5 w-5 text-director" />
          </div>
          <div className="leading-tight">
            <p className="glow-text text-[15px] font-semibold tracking-tight text-text">NEXUS HQ</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-director">
              Centro de Mando
            </p>
          </div>
        </div>

        <h1 className="text-[18px] font-semibold text-text">Iniciar sesión</h1>
        <p className="mb-5 mt-1 text-[12px] text-text-dim">
          Acceso restringido. Ingresa tus credenciales.
        </p>

        <label className="label-eyebrow">Usuario</label>
        <input
          data-testid="login-user"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          className="mb-3 mt-1.5 w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-[13px] text-text outline-none focus:border-prospect/50"
        />

        <label className="label-eyebrow">Contraseña</label>
        <input
          data-testid="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 mt-1.5 w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-[13px] text-text outline-none focus:border-prospect/50"
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-director/20 py-2.5 text-[13px] font-semibold text-director transition-colors hover:bg-director/30 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
