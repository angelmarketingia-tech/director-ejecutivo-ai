# Conector WhatsApp Web — Director Comercial AI

Conecta tu **WhatsApp Business** a la app (sin API de Meta) escaneando un QR.
El bot responde solo con tu base de conocimiento, y tú puedes intervenir desde la app
para cerrar el lead. Las conversaciones se ven en **Comercial → WhatsApp**.

> ⚠️ Usa una conexión no oficial (WhatsApp Web). Va contra los Términos de WhatsApp:
> hay riesgo de que baneen el número, sobre todo con envíos masivos. Úsalo para
> **responder** a quien te escribe, con sensatez.

## Requisitos
- Node.js 18 o superior (https://nodejs.org)
- Tu celular con WhatsApp Business
- Este PC **encendido** mientras quieras que el bot responda

## Pasos
1. (Opcional pero recomendado) En Vercel define `API_SHARED_SECRET` con un valor secreto.
   Debes usar EXACTAMENTE el mismo aquí.
2. Abre una terminal en esta carpeta `whatsapp-connector` y ejecuta:

   ```bash
   npm install
   ```

3. Define las variables y arranca:

   **Windows (PowerShell):**
   ```powershell
   $env:APP_URL="https://director-ejecutivo-ai.vercel.app"
   $env:API_SHARED_SECRET="el-mismo-de-vercel"
   npm start
   ```

   **Mac/Linux:**
   ```bash
   APP_URL="https://director-ejecutivo-ai.vercel.app" API_SHARED_SECRET="el-mismo-de-vercel" npm start
   ```

4. Aparece un **QR** en la terminal. En el celular: WhatsApp Business →
   **Ajustes → Dispositivos vinculados → Vincular dispositivo** → escanéalo.
5. Cuando diga `✅ Conectado`, ya responde. **Deja la ventana abierta.**

## Cómo se usa
- **Auto-respuesta:** actívala en la app (Comercial → WhatsApp → interruptor). El bot
  contesta los mensajes entrantes con tu base de conocimiento.
- **Intervenir:** en la bandeja de la app, abre un chat, pulsa **"Tomar yo"** (apaga el
  bot en ese chat) y escribe tu respuesta. El conector la envía por WhatsApp.
- **Opt-out:** si el cliente escribe la palabra de baja (por defecto `BAJA`), el bot no
  le responde.

## Mantenerlo siempre encendido (opcional)
- Déjalo en tu PC, o súbelo a un servicio 24/7 (Railway, Render, un VPS ~US$5/mes).
- La sesión se guarda en `.wwebjs_auth/` (no la borres para no re-escanear el QR).
