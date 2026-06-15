"use client";

import { WhatsAppBot } from "@/components/WhatsAppBot";
import { WaInbox } from "@/components/WaInbox";

export function WhatsAppView() {
  return (
    <div className="flex flex-col gap-4">
      {/* Bandeja real (conector WhatsApp Web): ver chats e intervenir para cerrar */}
      <WaInbox />
      {/* Configuración del asistente: base de conocimiento, auto-respuesta y probador */}
      <WhatsAppBot />
    </div>
  );
}
