/**
 * ElevenLabs — síntesis de voz para el agente ECHO.
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 *
 * En modo demo devuelve un placeholder. En vivo llama al endpoint TTS y retorna audio.
 */
import { env, isLive } from "./config";

export interface TtsRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export async function synthesizeSpeech(
  req: TtsRequest
): Promise<{ demo: boolean; audio?: ArrayBuffer; note?: string }> {
  if (!isLive("elevenlabs")) {
    return {
      demo: true,
      note: "DEMO: audio simulado. Configura ELEVENLABS_API_KEY para TTS real.",
    };
  }

  const voiceId = req.voiceId ?? env.elevenLabsVoiceId ?? "Rachel";
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsKey as string,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: req.text,
        model_id: req.modelId ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  return { demo: false, audio: await res.arrayBuffer() };
}

/**
 * Flujo de llamada completo (pseudo-orquestación):
 * 1) ECHO genera el guion (Claude) → 2) synthesizeSpeech() → 3) Twilio reproduce el audio
 *    y captura DTMF/voz del prospecto → 4) STT → 5) ECHO responde turn-by-turn.
 * Para llamadas conversacionales en tiempo real, usar ElevenLabs Conversational AI
 * o el media-stream de Twilio con websockets.
 */
