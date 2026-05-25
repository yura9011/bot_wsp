const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { mountAgentApiRoutes } = require("./agent-api-routes");

function createFakeApp() {
  const routes = {};
  return {
    routes,
    get(route, handler) {
      routes[`GET ${route}`] = handler;
    },
    post(route, handler) {
      routes[`POST ${route}`] = handler;
    }
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function callRoute(app, key, req = {}) {
  const res = createResponse();
  await app.routes[key]({
    params: {},
    query: {},
    body: {},
    ...req
  }, res);
  return res;
}

function createDeps(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-api-routes-"));
  const dataPath = path.join(tmpDir, "data");
  const logsPath = path.join(tmpDir, "logs");
  fs.mkdirSync(dataPath);
  fs.mkdirSync(logsPath);

  let globalPaused = false;
  const pausedUsers = {};
  const sentMessages = [];
  const historyWrites = [];

  return {
    tmpDir,
    deps: {
      agentId: "demo-local",
      agentName: "Demo",
      getIsRunning: () => true,
      getWhatsAppStatus: () => ({ status: "ready" }),
      statsManager: {
        leerEstadisticas: async () => ({ mensajes: 2 })
      },
      controlManager: {
        getPausaGlobal: () => globalPaused,
        getUsuariosPausados: () => pausedUsers,
        pausarUsuario: (userId, reason) => {
          pausedUsers[userId] = { pausado: true, razon: reason };
        },
        reanudarUsuario: userId => {
          if (!pausedUsers[userId]) return false;
          delete pausedUsers[userId];
          return true;
        },
        setPausaGlobal: value => {
          globalPaused = value;
        },
        guardarEnHistorial: (chatId, role, message) => {
          historyWrites.push({ chatId, role, message });
        }
      },
      client: {
        sendMessage: async (chatId, message) => {
          sentMessages.push({ chatId, message });
        },
        getChatById: async () => ({
          fetchMessages: async ({ limit }) => [
            {
              body: `limit:${limit}`,
              from: "user@c.us",
              fromMe: false,
              timestamp: 1000,
              type: "chat"
            }
          ]
        })
      },
      dataPath,
      logsPath,
      logger: () => {},
      ...overrides
    },
    sentMessages,
    historyWrites,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true })
  };
}

test("status route returns current agent state", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    mountAgentApiRoutes(app, ctx.deps);
    ctx.deps.controlManager.pausarUsuario("user@c.us", "test");

    const res = await callRoute(app, "GET /status");

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.agentId, "demo-local");
    assert.equal(res.body.name, "Demo");
    assert.equal(res.body.isRunning, true);
    assert.deepEqual(res.body.whatsapp, { status: "ready" });
    assert.equal(res.body.globalPausado, false);
    assert.equal(res.body.usuariosPausados, 1);
    assert.equal(typeof res.body.timestamp, "number");
  } finally {
    ctx.cleanup();
  }
});

test("pause and resume user routes preserve response shape", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    mountAgentApiRoutes(app, ctx.deps);

    const pause = await callRoute(app, "POST /pause/:userId", {
      params: { userId: "user@c.us" },
      body: { reason: "atendido_desde_dashboard" }
    });
    const resume = await callRoute(app, "POST /resume/:userId", {
      params: { userId: "user@c.us" }
    });
    const invalid = await callRoute(app, "POST /pause/:userId", {
      params: { userId: "invalid" }
    });

    assert.deepEqual(pause.body, { success: true, message: "Usuario user@c.us pausado" });
    assert.deepEqual(resume.body, { success: true, message: "Reanudado" });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.body, { success: false, error: "userId inválido" });
  } finally {
    ctx.cleanup();
  }
});

test("pause and resume global routes preserve response shape", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    mountAgentApiRoutes(app, ctx.deps);

    const pause = await callRoute(app, "POST /pause-global");
    const statusPaused = await callRoute(app, "GET /status");
    const resume = await callRoute(app, "POST /resume-global");

    assert.deepEqual(pause.body, { success: true, message: "Bot pausado globalmente" });
    assert.equal(statusPaused.body.globalPausado, true);
    assert.deepEqual(resume.body, { success: true, message: "Bot reanudado globalmente" });
  } finally {
    ctx.cleanup();
  }
});

test("send human message route sends WhatsApp message and records history", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    mountAgentApiRoutes(app, ctx.deps);

    const res = await callRoute(app, "POST /message/sendMessage/:sessionId", {
      body: { chatId: "user@c.us", message: "Hola" }
    });

    assert.deepEqual(res.body, { success: true });
    assert.deepEqual(ctx.sentMessages, [{ chatId: "user@c.us", message: "Hola" }]);
    assert.deepEqual(ctx.historyWrites, [{ chatId: "user@c.us", role: "human", message: "Hola" }]);
  } finally {
    ctx.cleanup();
  }
});

test("conversations route reads history and applies limit", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    fs.writeFileSync(path.join(ctx.deps.dataPath, "historial.json"), JSON.stringify({
      "5493511111111@c.us": [
        { role: "user", text: "Uno", timestamp: 1000 },
        { role: "human", text: "Dos", timestamp: 2000 }
      ]
    }));
    mountAgentApiRoutes(app, ctx.deps);

    const res = await callRoute(app, "GET /conversations", {
      query: { limit: "1" }
    });

    assert.equal(res.body.conversaciones[0].numero, "+54 93511111111");
    assert.deepEqual(res.body.conversaciones[0].messages, [
      { type: "human", text: "Dos", timestamp: 2000 }
    ]);
    assert.equal(res.body.resumenPorNumero[0].totalMensajes, 2);
  } finally {
    ctx.cleanup();
  }
});

test("logs and security routes return empty arrays when files are missing", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    mountAgentApiRoutes(app, ctx.deps);

    assert.deepEqual((await callRoute(app, "GET /logs")).body, []);
    assert.deepEqual((await callRoute(app, "GET /security")).body, []);
  } finally {
    ctx.cleanup();
  }
});

test("logs and security routes parse existing files", async () => {
  const app = createFakeApp();
  const ctx = createDeps();
  try {
    fs.writeFileSync(path.join(ctx.deps.logsPath, "bot.log"), [
      "[2026-05-25 10:00] first",
      "[2026-05-25 10:01] second"
    ].join("\n"));
    fs.writeFileSync(path.join(ctx.deps.logsPath, "security.log"), [
      '[2026-05-25 10:02] Usuario: user@c.us - Tipo: hijack - Mensaje: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"'
    ].join("\n"));
    mountAgentApiRoutes(app, ctx.deps);

    const logs = await callRoute(app, "GET /logs", { query: { lines: "1" } });
    const security = await callRoute(app, "GET /security", { query: { lines: "1" } });

    assert.deepEqual(logs.body, [
      { timestamp: "2026-05-25 10:01", message: "[2026-05-25 10:01] second" }
    ]);
    assert.deepEqual(security.body, [
      {
        timestamp: "2026-05-25 10:02",
        userId: "user",
        tipo: "hijack",
        mensaje: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx..."
      }
    ]);
  } finally {
    ctx.cleanup();
  }
});
