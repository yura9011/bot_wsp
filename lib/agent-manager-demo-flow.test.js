const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const AgentManager = require("./agent-manager");
const { ESTADOS } = require("../flujos");

function createManager(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-manager-demo-"));
  const dataDir = path.join(tmpDir, "data");
  const llmCalls = [];
  const pauses = [];
  const manager = new AgentManager({
    id: "demo-local",
    name: "Demo",
    whatsappSession: "demo-session",
    ports: { api: 5010, dashboard: 5999 },
    paths: {
      data: dataDir,
      logs: path.join(tmpDir, "logs"),
      auth: path.join(tmpDir, "auth")
    },
    features: { human_handoff: true },
    info: {},
    adminNumbers: []
  }, {
    inicializarModelo: () => ({ provider: "test" }),
    generarRespuestaLLM: async (history, text, options) => {
      llmCalls.push({ history, text, options });
      if (overrides.llmError) throw new Error("LLM down");
      return overrides.llmResponse || "Respuesta IA de capacidades.";
    },
    createAdminCommands: () => ({
      esAdmin: () => false,
      getRolAdmin: () => null,
      procesarComandoAdmin: async () => false,
      recargarAdminNumbers: () => {}
    })
  });

  manager.notificarDashboard = () => {};
  manager.statsManager = {
    registrarMensaje: async () => {},
    registrarHijacking: async () => {},
    registrarHandoff: async () => {},
    registrarBusqueda: async () => {},
    registrarRespuestaIA: async () => {},
    registrarError: async () => {}
  };
  const originalPausarUsuario = manager.controlManager.pausarUsuario.bind(manager.controlManager);
  manager.controlManager.pausarUsuario = (userId, reason, metadata) => {
    pauses.push({ userId, reason, metadata });
    return originalPausarUsuario(userId, reason, metadata);
  };

  return {
    manager,
    dataDir,
    llmCalls,
    pauses,
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
    reply: async text => {
      replies.push(text);
    }
  };
}

test("demo flow greets first and waits for one capability question", async () => {
  const ctx = createManager();
  try {
    const message = createMessage("Hola");

    await ctx.manager.handleDemoFlow(message, message.from, message.body);

    assert.equal(ctx.manager.estadosUsuario[message.from], ESTADOS.DEMO_ESPERANDO_CONSULTA);
    assert.equal(message.replies.length, 1);
    assert.match(message.replies[0], /demo del agente de respuesta por WhatsApp/);
    assert.equal(ctx.llmCalls.length, 0);
  } finally {
    ctx.cleanup();
  }
});

test("demo flow answers one question with scoped LLM prompt and then closes", async () => {
  const ctx = createManager({ llmResponse: "Puede automatizar respuestas y registrar conversaciones. La demo termina aca." });
  try {
    const first = createMessage("Hola");
    await ctx.manager.handleDemoFlow(first, first.from, first.body);

    const second = createMessage("Que puede resolver?");
    await ctx.manager.handleDemoFlow(second, second.from, second.body);

    assert.equal(ctx.manager.estadosUsuario[second.from], ESTADOS.DEMO_FINALIZADO);
    assert.deepEqual(second.replies, ["Puede automatizar respuestas y registrar conversaciones. La demo termina aca."]);
    assert.equal(ctx.llmCalls.length, 1);
    assert.match(ctx.llmCalls[0].text, /Consulta del visitante: Que puede resolver\?/);
    assert.match(ctx.llmCalls[0].options.systemPrompt, /No simules una tienda/);

    const third = createMessage("Otra consulta");
    await ctx.manager.handleDemoFlow(third, third.from, third.body);

    assert.match(third.replies[0], /La demo finalizó/);
    assert.equal(ctx.llmCalls.length, 1);
  } finally {
    ctx.cleanup();
  }
});

test("demo flow pauses and records handoff when visitor asks for a human", async () => {
  const ctx = createManager();
  try {
    const first = createMessage("Hola");
    await ctx.manager.handleDemoFlow(first, first.from, first.body);

    const second = createMessage("Quiero hablar con una persona");
    await ctx.manager.handleDemoFlow(second, second.from, second.body);

    assert.equal(ctx.manager.estadosUsuario[second.from], ESTADOS.DEMO_FINALIZADO);
    assert.equal(ctx.pauses.length, 1);
    assert.equal(ctx.pauses[0].reason, "handoff_solicitado");
    assert.equal(ctx.pauses[0].metadata.handoffReason, "quiere_humano");
    assert.equal(ctx.llmCalls.length, 0);
    assert.match(second.replies[0], /Te paso con una persona/);
  } finally {
    ctx.cleanup();
  }
});

test("demo flow pauses for pricing handoff without calling LLM", async () => {
  const ctx = createManager();
  try {
    const first = createMessage("Hola");
    await ctx.manager.handleDemoFlow(first, first.from, first.body);

    const second = createMessage("Necesito precio y presupuesto");
    await ctx.manager.handleDemoFlow(second, second.from, second.body);

    assert.equal(ctx.pauses.length, 1);
    assert.equal(ctx.pauses[0].metadata.handoffReason, "precio");
    assert.equal(ctx.llmCalls.length, 0);
    assert.match(second.replies[0], /Motivo: Precio/);
  } finally {
    ctx.cleanup();
  }
});

test("paused user messages are stored and do not get automatic replies", async () => {
  const ctx = createManager();
  try {
    ctx.manager.controlManager.pausarUsuario("user@c.us", "handoff_solicitado", {
      handoffReason: "quiere_humano",
      handoffReasonLabel: "Quiere hablar con una persona"
    });

    const message = createMessage("Sigo esperando");
    await ctx.manager.handleIncomingMessage(message);

    const history = JSON.parse(fs.readFileSync(path.join(ctx.dataDir, "historial.json"), "utf8"));
    assert.equal(message.replies.length, 0);
    assert.equal(history["user@c.us"].at(-1).role, "user");
    assert.equal(history["user@c.us"].at(-1).text, "Sigo esperando");
  } finally {
    ctx.cleanup();
  }
});

test("demo flow triggers handoff when LLM fails", async () => {
  const ctx = createManager({ llmError: true });
  try {
    const first = createMessage("Hola");
    await ctx.manager.handleDemoFlow(first, first.from, first.body);

    const second = createMessage("Que limites tiene?");
    await ctx.manager.handleDemoFlow(second, second.from, second.body);

    assert.equal(ctx.llmCalls.length, 1);
    assert.match(second.replies[0], /Te paso con una persona del equipo/);
    assert.match(second.replies[0], /Error del asistente virtual/);
    assert.equal(ctx.pauses.length, 1);
    assert.equal(ctx.pauses[0].reason, "handoff_solicitado");
  } finally {
    ctx.cleanup();
  }
});

test("demo flow resets old demo states once per version", async () => {
  const ctx = createManager();
  try {
    ctx.manager.estadosUsuario["user@c.us"] = ESTADOS.DEMO_FINALIZADO;
    const message = createMessage("Hola de nuevo");

    await ctx.manager.handleDemoFlow(message, message.from, message.body);

    assert.equal(ctx.manager.estadosUsuario[message.from], ESTADOS.DEMO_ESPERANDO_CONSULTA);
    assert.match(message.replies[0], /demo del agente de respuesta por WhatsApp/);
  } finally {
    ctx.cleanup();
  }
});
