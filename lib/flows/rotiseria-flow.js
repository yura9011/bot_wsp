const { generarRespuestaLLM } = require("../llm");
const { cleanLLMResponse, isHumanHandoffEnabled } = require("../handoff-intent");

const ESTADOS = {
  INICIAL: "rotiseria_inicial",
  ESPERANDO_NOMBRE: "rotiseria_esperando_nombre",
  MENU: "rotiseria_menu",
  PEDIDO: "rotiseria_pedido",
};

const HORARIO_APERTURA = 11;
const HORARIO_CIERRE = 22;

function estaEnHorario() {
  const hora = new Date().getHours();
  return hora >= HORARIO_APERTURA && hora < HORARIO_CIERRE;
}

function getSaludo(info) {
  const horario = estaEnHorario();
  const avisoHorario = horario
    ? ""
    : "\n⚠️ *Estamos fuera de horario.* Nuestro horario es de 11 a 22 hs. Dejá tu pedido y lo preparamos para mañana.";

  return `Hola, bienvenido a *${info.nombre || "nuestra rotisería"}* 🍽️

📍 ${info.direccion || "Consultar dirección"}
📞 ${info.telefono || "Consultar teléfono"}
🕐 Horario: 11 a 22 hs${avisoHorario}

¿Cómo te llamás?`;
}

function getMenu() {
  return `¿Qué necesitás?

1️⃣ Ver menú con precios
2️⃣ Hacer un pedido
3️⃣ Horarios
4️⃣ Contacto

0️⃣ Volver al menú

Elegí una opción.`;
}

function getHorarios() {
  return `🕐 *Horarios de atención*

Lunes a Domingo: 11 a 22 hs
Días feriados: 12 a 21 hs

Respondé *0* para volver al menú.`;
}

function getContacto(info) {
  return `📞 *Contacto*

Nombre: ${info.nombre || "Nuestra rotisería"}
Teléfono: ${info.telefono || "Consultar"}
Dirección: ${info.direccion || "Consultar"}

¿Necesitás algo más? Respondé *0* para volver al menú.`;
}

function getMensajeFueraDeHorario() {
  return `Estamos fuera de horario (nuestro horario es de 11 a 22 hs).

Podés dejarme tu pedido y lo preparamos para mañana. ¿Qué querés ordenar?`;
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
    await agent.responderBot(message, `¡Hola ${agent.datosUsuario[userId].nombre}! 👋\n\n¿Qué necesitás?`);
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
      if (agent.catalogo && agent.catalogo.getMenuCompleto) {
        await agent.responderBot(message, agent.catalogo.getMenuCompleto());
      } else {
        await agent.responderBot(message, "El menú no está disponible en este momento.");
      }
      await agent.responderBot(message, "Escribí *2* para hacer un pedido, o *0* para volver al menú.");
      return;
    }
    if (texto === "2") {
      if (!estaEnHorario()) {
        await agent.responderBot(message, getMensajeFueraDeHorario());
      } else {
        await agent.responderBot(message, "Decime qué querés ordenar y yo te armo el pedido. 🍽️");
      }
      agent.estadosUsuario[userId] = ESTADOS.PEDIDO;
      return;
    }
    if (texto === "3") {
      await agent.responderBot(message, getHorarios());
      return;
    }
    if (texto === "4") {
      await agent.responderBot(message, getContacto(agent.config.info || {}));
      return;
    }
    await agent.responderBot(message, "No entendí. Elegí una opción del menú:\n\n1️⃣ Ver menú\n2️⃣ Hacer pedido\n3️⃣ Horarios\n4️⃣ Contacto");
    return;
  }

  if (estado === ESTADOS.PEDIDO) {
    if (texto === "0") {
      agent.estadosUsuario[userId] = ESTADOS.MENU;
      await agent.responderBot(message, getMenu());
      return;
    }

    if (!agent.conversaciones[userId]) {
      agent.conversaciones[userId] = [];
    }

    let contextoProductos = "";
    let productosEncontrados = [];

    if (agent.catalogo && agent.catalogo.buscarProductos) {
      try {
        productosEncontrados = agent.catalogo.buscarProductos(texto, 5);
        agent.statsManager.registrarBusqueda(texto, productosEncontrados.length).catch(() => {});
        if (productosEncontrados.length > 0 && agent.catalogo.formatearProductosParaContexto) {
          contextoProductos = agent.catalogo.formatearProductosParaContexto(productosEncontrados);
        }
      } catch (e) { /* catalog search failed, continue without context */ }
    }

    let mensajeConContexto;
    if (contextoProductos) {
      mensajeConContexto = `Contexto del menú:\n${contextoProductos}\n\n---\n\nPedido del cliente: ${texto}\n\nInstrucciones:\n1. Respondé sobre el pedido del cliente usando los productos del menú\n2. Si pide algo que no está en el menú, ofrecé alternativas similares\n3. Si el monto es alto (más de $15000), sugerí que un operador lo ayude\n4. Sé breve y directo`;
    } else {
      mensajeConContexto = `Pedido del cliente: ${texto}\n\nNo se encontraron productos exactos. Interpretá qué quiere el cliente y ofrecé opciones del menú. Sé breve.`;
    }

    agent.conversaciones[userId].push({ role: "user", parts: [{ text: texto }] });
    if (agent.conversaciones[userId].length > 10) {
      agent.conversaciones[userId] = agent.conversaciones[userId].slice(-10);
    }

    try {
      const respuesta = await generarRespuestaLLM(agent.conversaciones[userId].slice(0, -1), mensajeConContexto);

      const { uncertain } = cleanLLMResponse(respuesta);
      if (uncertain && isHumanHandoffEnabled(agent.config)) {
        await agent.triggerAutoHandoff(message, userId, "no_sabe", "El agente no supo responder");
        return;
      }

      agent.conversaciones[userId].push({ role: "model", parts: [{ text: respuesta }] });
      await agent.responderBot(message, respuesta);
    } catch (error) {
      if (isHumanHandoffEnabled(agent.config)) {
        await agent.triggerAutoHandoff(message, userId, "no_sabe", "Error del asistente virtual");
        return;
      }
      await agent.responderBot(message, "Disculpá, tuve un problema técnico. ¿Podés repetir tu pedido?");
    }
    return;
  }

  await agent.responderBot(message, "Escribí *0* para volver al menú.");
}

module.exports = {
  name: "rotiseria",
  ESTADOS,
  handleMessage,
  getSaludo,
  getMenu,
  getHorarios,
  getContacto,
  estaEnHorario
};
