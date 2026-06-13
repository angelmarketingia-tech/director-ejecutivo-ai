"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { useEscape } from "@/lib/useEscape";
import type { Presence, StaffMember } from "@/lib/types";
import { PRESENCE_COLOR, PRESENCE_LABEL, ACTIVITY_SUGGESTIONS } from "@/lib/departments";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

const PRESENCES: Presence[] = ["online", "busy", "meeting", "away", "offline"];

/** Modal donde una persona marca su estado y qué está haciendo ahora. */
export function CheckInPanel({
  person,
  onClose,
}: {
  person: StaffMember | null;
  onClose: () => void;
}) {
  const checkIn = useDeck((s) => s.checkIn);
  const [activity, setActivity] = useState("");
  const [presence, setPresence] = useState<Presence>("online");
  useEscape(!!person, onClose);

  // Sincroniza con la persona seleccionada al abrir
  const personId = person?.id;
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  if (personId !== lastId) {
    setLastId(personId);
    setActivity(person?.activity ?? "");
    setPresence(person?.presence ?? "online");
  }

  const submit = () => {
    if (!person || !activity.trim()) return;
    checkIn(person.id, { presence, activity: activity.trim() });
    onClose();
  };

  return (
    <AnimatePresence>
      {person && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="z-50 my-auto w-full max-w-[440px]"
          >
            <div className="panel p-5 shadow-panel">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-full text-[13px] font-semibold"
                    style={{ background: `${person.color}1f`, color: person.color }}
                  >
                    {person.initials}
                  </div>
                  <div className="leading-tight">
                    <p className="text-[15px] font-semibold text-text">{person.name}</p>
                    <p className="text-[11px] text-text-dim">{person.role}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="label-eyebrow mt-5 mb-2">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESENCES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPresence(p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                      presence === p ? "text-text" : "border-border text-text-dim hover:text-text-muted"
                    )}
                    style={
                      presence === p
                        ? { borderColor: `${PRESENCE_COLOR[p]}55`, background: `${PRESENCE_COLOR[p]}14` }
                        : undefined
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRESENCE_COLOR[p] }} />
                    {PRESENCE_LABEL[p]}
                  </button>
                ))}
              </div>

              <p className="label-eyebrow mt-5 mb-2">¿Qué estás haciendo?</p>
              <textarea
                data-testid="checkin-activity"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                rows={2}
                placeholder="Ej. Revisando la propuesta del cliente X con mi agente"
                className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-dim focus:border-prospect/50"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACTIVITY_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActivity(s)}
                    className="rounded-md border border-border px-2 py-0.5 text-[10px] text-text-dim transition-colors hover:text-text-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                data-testid="btn-confirm-checkin"
                onClick={submit}
                disabled={!activity.trim()}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-ok/15 py-2.5 text-[13px] font-semibold text-ok transition-colors hover:bg-ok/25 disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Marcar actividad
              </button>
            </div>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
