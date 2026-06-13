/**
 * Agendamiento. Por simplicidad se modela Google Calendar (o Calendly via link).
 * Docs: https://developers.google.com/calendar/api
 * Producción: usar OAuth2 con cuenta de servicio o del operador.
 */
import { isLive } from "./config";

export interface MeetingRequest {
  leadId: string;
  company: string;
  startsAt: string; // ISO
  durationMin: number;
  attendeeEmail?: string;
}

export async function bookMeeting(
  req: MeetingRequest
): Promise<{ demo: boolean; eventId: string; note?: string }> {
  if (!isLive("calendar")) {
    return {
      demo: true,
      eventId: `evt_DEMO_${Date.now()}`,
      note: "DEMO: reunión simulada. Configura GOOGLE_CALENDAR_ID + OAuth.",
    };
  }
  // TODO producción: llamar a googleapis.calendar.events.insert con auth OAuth2.
  throw new Error("Calendar live mode requiere configurar OAuth (googleapis).");
}
