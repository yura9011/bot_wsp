// ─── FLUJOS Y MENÚS DEL BOT ──────────────────────────────────────────────────

// Información de la sucursal
const INFO_SUCURSAL = {
  nombre: "Demo - WhatsApp Automation",
  telefono: "Demo",
  horario: "Demo environment",
  direccion: "Demo environment",
};

// Links de seguimiento
const LINKS = {
  correoArgentino: "https://www.correoargentino.com.ar/seguimiento-de-envios",
  andreani: null, // El cliente tiene el código en su app
  mercadoLibre: null, // El cliente tiene el código en su app
};

// ─── MENSAJES DEL SISTEMA ────────────────────────────────────────────────────

function getMensajeBienvenida(nombre = null, agentInfo = null) {
  const info = agentInfo || INFO_SUCURSAL;
  const saludo = nombre ? `¡Hola ${nombre}! 👋` : "¡Hola! 👋";
  
  return `${saludo}

Bienvenido/a a *${info.nombre}*

📍 *Dirección:* ${info.direccion}
📞 *Teléfono:* ${info.telefono}

🕐 *Horario de atención:*
${info.horario}

⚠️ *Importante:*
• No recibimos llamadas ni audios en este momento
• Por favor, escribí tus consultas por mensaje de texto

¿En qué puedo ayudarte hoy?`;
}

function getMenuPrincipal() {
  return `Por favor, elegí una opción:

1️⃣ Realizar pedido cotillón
2️⃣ Entrega y recepción de envíos

Respondé con el número de la opción que necesitás.`;
}

function getMenuPaqueteria() {
  return `*Consulta sobre paquetería*

Elegí el servicio de envío:

1️⃣ Correo Argentino
2️⃣ Andreani
3️⃣ Mercado Libre

0️⃣ Volver al menú principal

Respondé con el número de la opción.`;
}

function getMenuCorreoArgentino() {
  return `*📦 Correo Argentino*

¿Qué necesitás hacer?

1️⃣ Retirar un envío
2️⃣ Hacer un envío

0️⃣ Volver al menú anterior

Respondé con el número de la opción.`;
}

function getInfoCorreoArgentinoRetirar() {
  return `*📦 Correo Argentino - Retirar envío*

Podés consultar el estado de tu pedido acá:
${LINKS.correoArgentino}

⚠️ *Importante:* Si el operador confirma disponibilidad, el paquete ya está listo para retiro.

*Para retirar:*
• Venir con el *titular* y su *DNI*
• Si retira un tercero, necesita autorización del titular + fotocopia del DNI del titular

¿Necesitás algo más?
Respondé *0* para volver al menú principal.`;
}

function getInfoCorreoArgentinoEnviar() {
  return `*📦 Correo Argentino - Hacer envío*

Para despachar tu envío, necesitás:

✅ Paquete bien envuelto y cerrado
✅ Carátula del envío impresa y pegada
✅ Envío ya pagado

Una vez que lo tengas listo, podés traerlo en nuestro horario de atención:
${INFO_SUCURSAL.horario}

📍 ${INFO_SUCURSAL.direccion}

¿Necesitás algo más?
Respondé *0* para volver al menú principal.`;
}

function getInfoAndreani() {
  return `*📦 Andreani*

El seguimiento de tu pedido aparece en tu app de Andreani.

*Para retirar:*
• Necesitás el *QR* de tu pedido
• Y el *DNI del titular* de la compra

¿Necesitás algo más?
Respondé *0* para volver al menú principal.`;
}

function getInfoMercadoLibre() {
  return `*📦 Mercado Libre*

El seguimiento de tu compra aparece en tu app de Mercado Libre.

*Para retirar:*
• Solo necesitás venir con el *código QR* de tu compra

⚠️ *Importante:* Momentáneamente NO estamos habilitados para recibir devoluciones.

¿Necesitás algo más?
Respondé *0* para volver al menú principal.`;
}

function getMenuEnvios() {
  return `*📮 Realizar envíos*

¿Tenés el paquete listo?

1️⃣ Sí, está listo
2️⃣ No, no sé cómo prepararlo

0️⃣ Volver al menú principal

Respondé con el número de la opción.`;
}

function getInfoPreparacionPaquete() {
  return `*📦 Cómo preparar tu paquete*

Para que podamos despachar tu envío, necesitás:

✅ Paquete bien envuelto y cerrado
✅ Carátula del envío impresa y pegada
✅ Envío ya pagado

Una vez que lo tengas listo, podés traerlo en nuestro horario de atención:
${INFO_SUCURSAL.horario}

¿Necesitás algo más?
Respondé *0* para volver al menú principal.`;
}

function getInfoPaqueteListo() {
  return `*✅ Perfecto*

Podés traer tu paquete en nuestro horario de atención:
${INFO_SUCURSAL.horario}

📍 ${INFO_SUCURSAL.direccion}

Recordá que debe estar:
• Bien envuelto
• Con la carátula pegada
• Envío pagado

¿Necesitás algo más?
Respondé *0* para volver al menú principal.`;
}

function getMensajePedirNombre() {
  return `Para poder ayudarte mejor, ¿podrías indicarme tu nombre? 😊`;
}

function getMensajeNoEntiendo() {
  return `Disculpá, no entendí tu respuesta. Por favor, elegí una de las opciones del menú usando el número correspondiente.`;
}

function getMensajeDemoInicial() {
  return `Hola.

Esta es una demo del agente de respuesta por WhatsApp.

Podés enviar una consulta sobre cómo automatiza respuestas, qué puede resolver, cómo trabaja con un panel humano o qué límites tiene.

La demo responde una sola consulta para evitar conversaciones extendidas.`;
}

function getMensajeDemoRespuesta() {
  return `El agente puede responder consultas frecuentes, mantener el tono definido para la marca y dejar trazabilidad para que el equipo vea la conversación desde el panel.

También puede configurarse con reglas, límites y criterios de derivación según el caso real.

La demo finalizó. Para otra prueba podemos preparar un caso específico con el flujo, tono y reglas de tu negocio.`;
}

function getMensajeDemoFinalizado() {
  return `La demo finalizó. Para otra prueba podemos preparar un caso específico con el flujo, tono y reglas de tu negocio.`;
}

function getMensajeDerivacion() {
  return `No tengo ese dato confirmado en este momento. Te derivo con alguien del equipo para evitar darte información incorrecta.`;
}

// ─── ESTADOS DEL FLUJO ───────────────────────────────────────────────────────

const ESTADOS = {
  INICIAL: "inicial",
  ESPERANDO_NOMBRE: "esperando_nombre",
  MENU_PRINCIPAL: "menu_principal",
  MENU_PAQUETERIA: "menu_paqueteria",
  MENU_CORREO_ARGENTINO: "menu_correo_argentino",
  INFO_CORREO_RETIRAR: "info_correo_retirar",
  INFO_CORREO_ENVIAR: "info_correo_enviar",
  INFO_ANDREANI: "info_andreani",
  INFO_MERCADOLIBRE: "info_mercadolibre",
  PEDIDO: "pedido",
  DEMO_ESPERANDO_CONSULTA: "demo_esperando_consulta",
  DEMO_FINALIZADO: "demo_finalizado",
};

module.exports = {
  INFO_SUCURSAL,
  LINKS,
  ESTADOS,
  getMensajeBienvenida,
  getMenuPrincipal,
  getMenuPaqueteria,
  getMenuCorreoArgentino,
  getInfoCorreoArgentinoRetirar,
  getInfoCorreoArgentinoEnviar,
  getInfoAndreani,
  getInfoMercadoLibre,
  getMensajePedirNombre,
  getMensajeNoEntiendo,
  getMensajeDemoInicial,
  getMensajeDemoRespuesta,
  getMensajeDemoFinalizado,
  getMensajeDerivacion,
};
