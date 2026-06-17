"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** Interruptor de tema claro/oscuro. Persiste en localStorage y aplica la clase en <html>. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* sin almacenamiento */
    }
  }

  return (
    <button
      onClick={toggle}
      title={light ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      aria-label="Cambiar tema"
      className={`grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface/60 text-text-muted transition-colors hover:text-text ${className}`}
    >
      {light ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
