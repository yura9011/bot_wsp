const fs = require("fs");
const path = require("path");

function seedDemoData(dataDir) {
  const now = Date.now();
  const min = 60 * 1000;
  const hour = 60 * min;

  const conversations = {
    "5491111111111@c.us": [
      { timestamp: now - 2 * hour, role: "user", text: "hola" },
      { timestamp: now - 2 * hour + 1000, role: "bot", text: "Hola. Esta es una demo del agente de respuesta por WhatsApp. Podés enviar una consulta sobre cómo automatiza respuestas, qué puede resolver, cómo trabaja con un panel humano o qué límites tiene." },
      { timestamp: now - 1 * hour - 30 * min, role: "user", text: "qué puede hacer el bot?" },
      { timestamp: now - 1 * hour - 30 * min + 2000, role: "bot", text: "El agente puede responder consultas frecuentes, mantener el tono definido para la marca y dejar trazabilidad para que el equipo vea la conversación desde el panel. También puede configurarse con reglas, límites y criterios de derivación según el caso real." }
    ],
    "5491111122222@c.us": [
      { timestamp: now - 45 * min, role: "user", text: "hola" },
      { timestamp: now - 45 * min + 1000, role: "bot", text: "Hola. Esta es una demo del agente de respuesta por WhatsApp. Podés enviar una consulta sobre cómo automatiza respuestas." },
      { timestamp: now - 40 * min, role: "user", text: "necesito hablar con una persona" },
      { timestamp: now - 40 * min + 1500, role: "bot", text: "Te paso con una persona del equipo. Dejé pausada la IA y el panel ya tiene el historial para continuar. Motivo: Quiere hablar con una persona." }
    ],
    "5491111133333@c.us": [
      { timestamp: now - 30 * min, role: "user", text: "hola" },
      { timestamp: now - 30 * min + 1000, role: "bot", text: "Hola. Esta es una demo del agente de respuesta por WhatsApp. Podés enviar una consulta sobre cómo automatiza respuestas." },
      { timestamp: now - 25 * min, role: "user", text: "tengo un reclamo" },
      { timestamp: now - 25 * min + 1500, role: "bot", text: "Te paso con una persona del equipo. Dejé pausada la IA y el panel ya tiene el historial para continuar. Motivo: Reclamo." }
    ],
    "5491111144444@c.us": [
      { timestamp: now - 2 * hour + 15 * min, role: "user", text: "hola" },
      { timestamp: now - 2 * hour + 15 * min + 1000, role: "bot", text: "Hola. Esta es una demo del agente de respuesta por WhatsApp." },
      { timestamp: now - 2 * hour + 20 * min, role: "user", text: "quiero precios" },
      { timestamp: now - 2 * hour + 20 * min + 1500, role: "bot", text: "Te paso con una persona del equipo. Motivo: Precio." },
      { timestamp: now - 1 * hour, role: "human", text: "Hola, gracias por contactarnos. Te envío la información de precios por privado." }
    ],
    "5491111155555@c.us": [
      { timestamp: now - 3 * hour, role: "user", text: "hola" },
      { timestamp: now - 3 * hour + 1000, role: "bot", text: "Hola. Esta es una demo del agente de respuesta por WhatsApp." },
      { timestamp: now - 3 * hour + 5 * min, role: "user", text: "cómo funciona el handoff?" },
      { timestamp: now - 3 * hour + 5 * min + 2000, role: "bot", text: "El agente puede transferir conversaciones a un operador humano cuando detecta ciertas intenciones como pedidos de precio, reclamos o solicitud explícita de humano. La transferencia es instantánea y el panel muestra el historial completo." }
    ]
  };

  const pauses = {
    global: false,
    usuarios: {
      "5491111122222@c.us": {
        pausado: true,
        timestamp: now - 40 * min,
        razon: "handoff_solicitado",
        notificado: true,
        handoffReason: "quiere_humano",
        handoffReasonLabel: "Quiere hablar con una persona",
        handoffRequestedAt: now - 40 * min
      },
      "5491111133333@c.us": {
        pausado: true,
        timestamp: now - 25 * min,
        razon: "handoff_solicitado",
        notificado: true,
        handoffReason: "reclamo",
        handoffReasonLabel: "Reclamo",
        handoffRequestedAt: now - 25 * min
      },
      "5491111144444@c.us": {
        pausado: true,
        timestamp: now - 1 * hour,
        razon: "atendido_desde_dashboard",
        notificado: false,
        handoffReason: "precio",
        handoffReasonLabel: "Precio",
        handoffRequestedAt: now - 2 * hour + 20 * min
      }
    },
    timestamp: now - 40 * min
  };

  const historialPath = path.join(dataDir, "historial.json");
  const pausasPath = path.join(dataDir, "pausas.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(historialPath, JSON.stringify(conversations, null, 2));
  fs.writeFileSync(pausasPath, JSON.stringify(pauses, null, 2));

  return Object.keys(conversations).length;
}

module.exports = { seedDemoData };
