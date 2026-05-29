const MAX_TURNS_PER_DEMO = 10;

const DEMOS = [
  {
    key: "rotiseria",
    label: "Rotisería",
    emoji: "🍽️",
    catalogPath: "../../catalogs/catalogo-rotiseria.js",
    info: { nombre: "La Maria Rotisería", telefono: "+54 9 11 5555-1234", horario: "Lunes a Domingo: 11 a 22 hs", direccion: "Av. Ejemplo 1234, CABA" }
  },
  {
    key: "veterinaria",
    label: "Veterinaria",
    emoji: "🐾",
    catalogPath: "../../catalogs/catalogo-veterinaria.js",
    info: { nombre: "PetCare Veterinaria", telefono: "+54 9 11 5555-9999", horario: "Lunes a Viernes 9 a 18 hs", direccion: "Calle Falsa 456, CABA" }
  },
  {
    key: "catalogo",
    label: "Catálogo",
    emoji: "🛒",
    catalogPath: "../../catalogs/catalogo-catalogo.js",
    info: { nombre: "Mi Tienda", telefono: "+54 9 11 5555-7777", horario: "Lunes a Sábado 10 a 19 hs", direccion: "Calle Real 789, CABA" }
  }
];

const ESTADOS = {
  LAUNCHER_INICIAL: "demo_launcher_inicial",
  LAUNCHER_ESPERANDO_NOMBRE: "demo_launcher_esperando_nombre",
  LAUNCHER_MENU: "demo_launcher_menu",
  LAUNCHER_ACTIVE: "demo_launcher_active",
};

const catalogs = {};
const flows = {};

for (const d of DEMOS) {
  catalogs[d.key] = require(d.catalogPath);
  flows[d.key] = require(`./${d.key}-flow.js`);
}

function getMenu() {
  const items = DEMOS.map((d, i) => `${i + 1}️⃣ ${d.emoji} ${d.label}`).join("\n");
  return `Elegí la demo que querés probar:\n\n${items}\n\nEscribí el número de la demo.`;
}

function getSaludo() {
  const items = DEMOS.map(d => `${d.emoji} ${d.label}`).join(" | ");
  return `Hola! 👋 Soy el bot demo de esta plataforma.\n\nPodés probar 3 demos distintas desde este número:\n${items}\n\n¿Cómo te llamás?`;
}

function getDemoIntro(demo, nombre, turnos) {
  return `${demo.emoji} *Demo: ${demo.label}*\n\n¡Hola ${nombre}! Entraste a la demo de *${demo.label}*.\nTenés *${turnos} mensajes* para probar.\nEscribí *menú* para cambiar de demo en cualquier momento.`;
}

function getDemoFinished(demoLabel) {
  return `La demo de *${demoLabel}* terminó (${MAX_TURNS_PER_DEMO} mensajes).\n\nPodés probar otra demo:\n\n${getMenu()}`;
}

function getNoEntendi() {
  return `No entendí. Elegí una opción del menú:\n\n${getMenu()}`;
}

async function handleMessage(agent, message, userId, texto) {
  if (!agent.estadosUsuario[userId]) {
    agent.estadosUsuario[userId] = ESTADOS.LAUNCHER_INICIAL;
  }

  const estado = agent.estadosUsuario[userId];

  // ─── ACTIVE: delegar al sub-flow ───────────────────────────────
  if (estado === ESTADOS.LAUNCHER_ACTIVE) {
    if (/\b(menu|menú|volver|salir)\b/i.test(texto)) {
      agent.estadosUsuario[userId] = ESTADOS.LAUNCHER_MENU;
      await agent.responderBot(message, getMenu());
      return;
    }

    const userData = agent.datosUsuario[userId] || {};
    userData.demoTurns = (userData.demoTurns || 0) + 1;
    agent.datosUsuario[userId] = userData;

    if (userData.demoTurns >= MAX_TURNS_PER_DEMO) {
      const label = userData.activeDemoLabel || "la demo";
      agent.estadosUsuario[userId] = ESTADOS.LAUNCHER_MENU;
      await agent.responderBot(message, getDemoFinished(label));
      return;
    }

    const activeKey = userData.activeDemo;
    const subFlow = flows[activeKey];
    agent.catalogo = catalogs[activeKey];
    agent.config.info = DEMOS.find(d => d.key === activeKey).info;

    agent.estadosUsuario[userId] = userData.subFlowState || subFlow.ESTADOS.MENU;
    await subFlow.handleMessage(agent, message, userId, texto);
    userData.subFlowState = agent.estadosUsuario[userId];
    agent.datosUsuario[userId] = userData;

    if (agent.estadosUsuario[userId] === subFlow.ESTADOS.MENU) {
      const remaining = MAX_TURNS_PER_DEMO - userData.demoTurns;
      await agent.responderBot(message, `Escribí *menú* para cambiar de demo (${remaining} mensajes restantes).`);
    }
    return;
  }

  // ─── INICIAL ────────────────────────────────────────────────────
  if (estado === ESTADOS.LAUNCHER_INICIAL) {
    await agent.responderBot(message, getSaludo());
    agent.estadosUsuario[userId] = ESTADOS.LAUNCHER_ESPERANDO_NOMBRE;
    return;
  }

  // ─── ESPERANDO NOMBRE ───────────────────────────────────────────
  if (estado === ESTADOS.LAUNCHER_ESPERANDO_NOMBRE) {
    const nombre = texto.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s]/g, "").trim().split(/\s+/)[0] || "amigo";
    agent.datosUsuario[userId] = agent.datosUsuario[userId] || {};
    agent.datosUsuario[userId].nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    await agent.responderBot(message, `¡Hola ${agent.datosUsuario[userId].nombre}! 🎉\n\n${getMenu()}`);
    agent.estadosUsuario[userId] = ESTADOS.LAUNCHER_MENU;
    return;
  }

  // ─── MENU: selección de demo ────────────────────────────────────
  if (estado === ESTADOS.LAUNCHER_MENU) {
    const idx = parseInt(texto) - 1;

    if (idx >= 0 && idx < DEMOS.length) {
      const demo = DEMOS[idx];
      const userData = agent.datosUsuario[userId] || {};
      userData.activeDemo = demo.key;
      userData.activeDemoLabel = demo.label;
      userData.demoTurns = 0;
      userData.subFlowState = flows[demo.key].ESTADOS.MENU;
      agent.datosUsuario[userId] = userData;

      agent.catalogo = catalogs[demo.key];
      agent.config.info = demo.info;
      agent.conversaciones[userId] = [];

      await agent.responderBot(message, getDemoIntro(demo, userData.nombre, MAX_TURNS_PER_DEMO));

      const subFlow = flows[demo.key];
      if (subFlow.getMenu) {
        await agent.responderBot(message, subFlow.getMenu());
      }

      agent.estadosUsuario[userId] = ESTADOS.LAUNCHER_ACTIVE;
      return;
    }

    await agent.responderBot(message, getNoEntendi());
    return;
  }

  await agent.responderBot(message, getNoEntendi());
}

module.exports = {
  name: "demo-launcher",
  ESTADOS,
  handleMessage,
  getMenu,
  getSaludo,
  MAX_TURNS_PER_DEMO
};
