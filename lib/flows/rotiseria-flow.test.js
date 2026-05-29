const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { handleMessage, ESTADOS } = require("./rotiseria-flow");

function createAgent(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rotiseria-flow-"));
  const dataDir = path.join(tmpDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "logs"), { recursive: true });

  const llmCalls = [];
  const agent = {
    id: "demo-rotiseria",
    config: {
      info: {
        nombre: "La Maria Rotisería",
        telefono: "+54 9 11 5555-1234",
        horario: "Lunes a Domingo: 11 a 22 hs",
        direccion: "Av. Ejemplo 1234, CABA"
      },
      features: { flowType: "rotiseria", human_handoff: true }
    },
    estadosUsuario: {},
    datosUsuario: {},
    conversaciones: {},
    catalogo: overrides.catalogo || null,
    statsManager: {
      registrarMensaje: async () => {},
      registrarBusqueda: async () => {},
      registrarHandoff: async () => {},
      registrarHijacking: async () => {},
      registrarRespuestaIA: async () => {},
      registrarError: async () => {}
    },
    controlManager: { pausarUsuario: () => {} },
    notificarDashboard: () => {},
    responderBot: async (msg, text) => {
      if (!agent.replies) agent.replies = [];
      agent.replies.push(text);
    }
  };

  return {
    agent,
    replies: () => agent.replies || [],
    clearReplies: () => { agent.replies = []; },
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true })
  };
}

function createMessage(body = "Hola") {
  const replies = [];
  return {
    from: "user@c.us",
    body,
    type: "chat",
    replies,
    reply: async text => { replies.push(text); }
  };
}

test("rotiseria flow sends greeting and asks for name", async () => {
  const ctx = createAgent();
  try {
    const message = createMessage("Hola");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.equal(ctx.replies().length, 1);
    assert.match(ctx.replies()[0], /La Maria Rotisería/);
    assert.match(ctx.replies()[0], /bienvenido/);
    assert.match(ctx.replies()[0], /llamás/i);
    assert.equal(ctx.agent.estadosUsuario[message.from], ESTADOS.ESPERANDO_NOMBRE);
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow saves name and shows menu", async () => {
  const ctx = createAgent();
  try {
    const message1 = createMessage("Hola");
    await handleMessage(ctx.agent, message1, message1.from, message1.body);
    ctx.clearReplies();

    const message2 = createMessage("Carlos");
    await handleMessage(ctx.agent, message2, message2.from, message2.body);

    assert.match(ctx.replies()[0], /Hola Carlos/);
    assert.match(ctx.replies()[1], /Ver menú/);
    assert.match(ctx.replies()[1], /Hacer un pedido/);
    assert.equal(ctx.agent.estadosUsuario[message2.from], ESTADOS.MENU);
    assert.equal(ctx.agent.datosUsuario[message2.from].nombre, "Carlos");
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow shows full menu when option 1", async () => {
  const ctx = createAgent({
    catalogo: {
      getMenuCompleto: () => "📋 *NUESTRO MENÚ*\n\n*Entradas*\n  • Empanadas — $3500\n\n*Platos*\n  • Milanesa — $4200",
      buscarProductos: () => [],
      formatearProductosParaContexto: () => ""
    }
  });
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    const message = createMessage("1");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.match(ctx.replies()[0], /NUESTRO MENÚ/);
    assert.match(ctx.replies()[1], /hacer un pedido/);
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow enters pedido state when option 2", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    const message = createMessage("2");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.equal(ctx.agent.estadosUsuario[message.from], ESTADOS.PEDIDO);
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow shows hours when option 3", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    const message = createMessage("3");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.match(ctx.replies()[0], /Horarios/);
    assert.match(ctx.replies()[0], /11 a 22/);
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow shows contact when option 4", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    const message = createMessage("4");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.match(ctx.replies()[0], /Contacto/);
    assert.match(ctx.replies()[0], /La Maria Rotisería/);
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow goes back to menu with 0", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.PEDIDO;
    const message = createMessage("0");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.equal(ctx.agent.estadosUsuario[message.from], ESTADOS.MENU);
    assert.match(ctx.replies()[0], /Ver menú/);
  } finally {
    ctx.cleanup();
  }
});

test("rotiseria flow shows menu for unknown option in menu state", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    const message = createMessage("5");
    await handleMessage(ctx.agent, message, message.from, message.body);

    assert.match(ctx.replies()[0], /No entendí/);
  } finally {
    ctx.cleanup();
  }
});
