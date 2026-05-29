const { generarRespuestaLLM } = require("../llm");

const ESTADOS = {
  INICIAL: "vet_inicial",
  ESPERANDO_NOMBRE: "vet_esperando_nombre",
  MENU: "vet_menu",
  TURNO: "vet_turno",
  TURNO_MOTIVO: "vet_turno_motivo",
  TURNO_CONFIRMACION: "vet_turno_confirmacion",
  URGENCIA: "vet_urgencia",
};

function getSaludo(info) {
  return `Hola, bienvenido a *${info.nombre || "nuestra veterinaria"}* 🐾

📍 ${info.direccion || "Consultar dirección"}
📞 ${info.telefono || "Consultar teléfono"}
🕐 Horario: ${info.horario || "Lunes a Viernes 9 a 18 hs"}

¿Cómo te llamás?`;
}

function getMenu() {
  return `¿Qué necesitás?

1️⃣ Sacar turno
2️⃣ Ver servicios y precios
3️⃣ Urgencias
4️⃣ Contacto

0️⃣ Volver al menú

Elegí una opción.`;
}

function getUrgencia(info) {
  return `🚨 *URGENCIAS*

Si tu mascota está en estado grave, contactanos directamente:

📞 *${info.telefono || "Llamar al número de la clínica"}*
📍 *${info.direccion || "Presentate en la clínica"}*

⏰ Atendemos urgencias de 8 a 22 hs.

Mientras tanto:
• Mantené a tu mascota calmada
• No le des comida ni medicamentos
• Si sangra, presioná con una gasa

¿Querés que te derive con un operador? Escribí *hablar con persona*.`;
}

function getTurnoServicios() {
  return `¿Para qué servicio querés turno?

1️⃣ Consulta general
2️⃣ Vacunación
3️⃣ Estética (baño y corte)
4️⃣ Cirugía / Esterilización
5️⃣ Diagnóstico (radiografía, análisis)
6️⃣ Otro (escribí qué necesitás)

Elegí o escribí el servicio.`;
}

function getHorarios() {
  return `🕐 *Horarios de atención*

Lunes a Viernes: 9 a 18 hs
Sábados: 9 a 13 hs
Domingos y feriados: CERRADO

*Urgencias:* 8 a 22 hs (todos los días)

Respondé *0* para volver al menú.`;
}

function getContacto(info) {
  return `📞 *Contacto*

Nombre: ${info.nombre || "Nuestra veterinaria"}
Teléfono: ${info.telefono || "Consultar"}
Dirección: ${info.direccion || "Consultar"}
Horario: ${info.horario || "Lunes a Viernes 9 a 18 hs"}

¿Necesitás algo más? Respondé *0* para volver al menú.`;
}

async function handleMessage(agent, message, userId, texto) {
  if (!agent.estadosUsuario[userId]) {
    agent.estadosUsuario[userId] = ESTADOS.INICIAL;
  }

  const estado = agent.estadosUsuario[userId];

  if (estado === ESTADOS.INICIAL) {
    await agent.responderBot(message, getSaludo(agent.config.info || {}));
    agent.estadosUsuario[userId] = ESTADOS.ESPERANDO_NOMBRE;
    return;
  }

  if (estado === ESTADOS.ESPERANDO_NOMBRE) {
    const nombre = texto.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s]/g, "").trim().split(/\s+/)[0] || "amigo";
    agent.datosUsuario[userId] = agent.datosUsuario[userId] || {};
    agent.datosUsuario[userId].nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    await agent.responderBot(message, `¡Hola ${agent.datosUsuario[userId].nombre}! 🐾\n\n¿Qué necesitás?`);
    await agent.responderBot(message, getMenu());
    agent.estadosUsuario[userId] = ESTADOS.MENU;
    return;
  }

  if (estado === ESTADOS.MENU) {
    if (texto === "0") {
      await agent.responderBot(message, getMenu());
      return;
    }
    if (texto === "1") {
      await agent.responderBot(message, getTurnoServicios());
      agent.estadosUsuario[userId] = ESTADOS.TURNO;
      return;
    }
    if (texto === "2") {
      if (agent.catalogo && agent.catalogo.getMenuServicios) {
        await agent.responderBot(message, agent.catalogo.getMenuServicios());
      } else {
        await agent.responderBot(message, "Los servicios no están disponibles en este momento.");
      }
      await agent.responderBot(message, "Escribí *1* para sacar turno, o *0* para volver al menú.");
      return;
    }
    if (texto === "3") {
      await agent.responderBot(message, getUrgencia(agent.config.info || {}));
      return;
    }
    if (texto === "4") {
      await agent.responderBot(message, getContacto(agent.config.info || {}));
      return;
    }
    await agent.responderBot(message, "No entendí. Elegí una opción del menú:\n\n1️⃣ Sacar turno\n2️⃣ Servicios\n3️⃣ Urgencias\n4️⃣ Contacto");
    return;
  }

  if (estado === ESTADOS.TURNO) {
    if (texto === "0") {
      agent.estadosUsuario[userId] = ESTADOS.MENU;
      await agent.responderBot(message, getMenu());
      return;
    }

    let servicio = "";
    if (texto === "1") servicio = "Consulta general";
    else if (texto === "2") servicio = "Vacunación";
    else if (texto === "3") servicio = "Estética (baño y corte)";
    else if (texto === "4") servicio = "Cirugía / Esterilización";
    else if (texto === "5") servicio = "Diagnóstico";
    else servicio = texto;

    agent.datosUsuario[userId].servicio = servicio;
    await agent.responderBot(message, `Perfecto, para *${servicio}*.\n\n¿Algún motivo o síntoma que quieras que sepamos antes del turno?\n\nEscribí el motivo o *0* para continuar sin detalle.`);
    agent.estadosUsuario[userId] = ESTADOS.TURNO_MOTIVO;
    return;
  }

  if (estado === ESTADOS.TURNO_MOTIVO) {
    const motivo = texto === "0" ? "Sin detalle" : texto;
    agent.datosUsuario[userId].motivo = motivo;

    const nombre = agent.datosUsuario[userId].nombre || "Cliente";
    const servicio = agent.datosUsuario[userId].servicio || "Consulta";

    await agent.responderBot(message, `📋 *Resumen del turno:*

👤 Paciente/Tutor: ${nombre}
🩺 Servicio: ${servicio}
📝 Motivo: ${motivo}

El horario exacto lo confirmamos por mensaje.

¿Confirmás el turno?\n1️⃣ Sí, confirmo\n2️⃣ No, cancelar`);
    agent.estadosUsuario[userId] = ESTADOS.TURNO_CONFIRMACION;
    return;
  }

  if (estado === ESTADOS.TURNO_CONFIRMACION) {
    if (texto === "1" || texto.toLowerCase().includes("sí") || texto.toLowerCase().includes("si")) {
      await agent.responderBot(message, `✅ *Turno confirmado*

Te enviamos los datos. Aguardá confirmación por mensaje con el horario asignado.

¿Necesitás algo más? Respondé *0* para volver al menú.`);
      agent.estadosUsuario[userId] = ESTADOS.MENU;
    } else {
      await agent.responderBot(message, "Turno cancelado. ¿Querés elegir otra opción?");
      agent.estadosUsuario[userId] = ESTADOS.MENU;
      await agent.responderBot(message, getMenu());
    }
    return;
  }

  if (estado === ESTADOS.URGENCIA) {
    if (texto === "0") {
      agent.estadosUsuario[userId] = ESTADOS.MENU;
      await agent.responderBot(message, getMenu());
      return;
    }
    await agent.responderBot(message, "Para urgencias, contactanos directamente al teléfono de la clínica. ¿Querés que te derive con un operador? Escribí *hablar con persona*.");
    return;
  }

  await agent.responderBot(message, "Escribí *0* para volver al menú.");
}

module.exports = {
  name: "veterinaria",
  ESTADOS,
  handleMessage,
  getSaludo,
  getMenu,
  getUrgencia,
  getHorarios,
  getContacto
};
