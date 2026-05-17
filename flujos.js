// ─── FLUJOS Y MENÚS DEL BOT ──────────────────────────────────────────────────

// Información de la sucursal
const INFO_SUCURSAL = {
  nombre: "Dolce Party - Santa Ana",
  telefono: "0351 855-9145",
  horario: "Lunes a Sábado: 9:00 a 20:00hs | Domingo: Cerrado",
  direccion: "Sta. Ana 2637, X5010EEK Córdoba",
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

⚠️ *Importante:* Si dice "Disponible para retiro en la sucursal Dolce Party", significa que ya está acá.

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
  return `¡Hola! 👋

Estás hablando con una *demo del sistema de atención por WhatsApp*.

No es una tienda real y no toma pedidos. La idea es mostrar, en una interacción corta, cómo el bot puede recibir una consulta, responder con contexto y derivar a una persona cuando hace falta.

Escribí una consulta de ejemplo, por ejemplo:
• Quiero saber si tienen stock de un producto
• Necesito hablar con una persona
• Quiero consultar horarios o entregas`;
}

function getMensajeDemoRespuesta() {
  return `Gracias. Esta sería una respuesta automática de muestra:

Puedo entender la consulta, pedir datos si faltan y dejar el caso listo para que una persona continúe desde el panel humano.

Para esta demo dejamos la interacción acá, así evitamos simular una operación real.

Si querés ver otro caso, podemos reiniciar el recorrido desde el panel o preparar una demo específica para tu negocio.`;
}

function getMensajeDemoFinalizado() {
  return `La demo corta ya finalizó.

Este número está configurado solo para mostrar el funcionamiento del sistema. Para otra prueba, podemos reiniciar el recorrido o preparar un flujo demo específico.`;
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
};
