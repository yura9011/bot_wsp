const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { handleMessage, ESTADOS } = require("./veterinaria-flow");

function createAgent(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vet-flow-"));
  const agent = {
    id: "demo-veterinaria",
    config: {
      info: { nombre: "PetCare Veterinaria", telefono: "+54 9 11 5555-9999", horario: "Lunes a Viernes 9 a 18 hs", direccion: "Calle Falsa 456" },
      features: { flowType: "veterinaria", human_handoff: true }
    },
    estadosUsuario: {},
    datosUsuario: {},
    conversaciones: {},
    catalogo: overrides.catalogo || null,
    statsManager: { registrarMensaje: async () => {}, registrarBusqueda: async () => {} },
    controlManager: { pausarUsuario: () => {} },
    notificarDashboard: () => {},
    responderBot: async (msg, text) => { if (!agent.replies) agent.replies = []; agent.replies.push(text); }
  };
  return {
    agent,
    replies: () => agent.replies || [],
    clearReplies: () => { agent.replies = []; },
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true })
  };
}

function createMessage(body = "Hola") {
  return { from: "user@c.us", body, type: "chat", replies: [], reply: async t => {} };
}

test("veterinaria flow sends greeting and asks for name", async () => {
  const ctx = createAgent();
  try {
    const msg = createMessage("Hola");
    await handleMessage(ctx.agent, msg, msg.from, msg.body);
    assert.equal(ctx.replies().length, 1);
    assert.match(ctx.replies()[0], /PetCare Veterinaria/);
    assert.match(ctx.replies()[0], /llamás/i);
    assert.equal(ctx.agent.estadosUsuario[msg.from], ESTADOS.ESPERANDO_NOMBRE);
  } finally { ctx.cleanup(); }
});

test("veterinaria flow saves name and shows menu", async () => {
  const ctx = createAgent();
  try {
    await handleMessage(ctx.agent, createMessage("Hola"), "user@c.us", "Hola");
    ctx.clearReplies();
    await handleMessage(ctx.agent, createMessage("Laura"), "user@c.us", "Laura");
    assert.match(ctx.replies()[0], /Hola Laura/);
    assert.match(ctx.replies()[1], /Sacar turno/);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.MENU);
    assert.equal(ctx.agent.datosUsuario["user@c.us"].nombre, "Laura");
  } finally { ctx.cleanup(); }
});

test("veterinaria flow shows services when option 2", async () => {
  const ctx = createAgent({
    catalogo: {
      getMenuServicios: () => "🐾 *NUESTROS SERVICIOS*\n\n*Consultas*\n  • Consulta general — $8000\n  • Vacunación — $6000"
    }
  });
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    await handleMessage(ctx.agent, createMessage("2"), "user@c.us", "2");
    assert.match(ctx.replies()[0], /SERVICIOS/);
    assert.match(ctx.replies()[0], /Consulta general/);
  } finally { ctx.cleanup(); }
});

test("veterinaria flow shows urgency info when option 3", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    await handleMessage(ctx.agent, createMessage("3"), "user@c.us", "3");
    assert.match(ctx.replies()[0], /URGENCIAS/);
    assert.match(ctx.replies()[0], /8 a 22/);
  } finally { ctx.cleanup(); }
});

test("veterinaria flow enters turno flow when option 1", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    await handleMessage(ctx.agent, createMessage("1"), "user@c.us", "1");
    assert.match(ctx.replies()[0], /servicio/);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.TURNO);
  } finally { ctx.cleanup(); }
});

test("veterinaria flow collects motivo and shows confirmation", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.TURNO;
    ctx.agent.datosUsuario["user@c.us"] = { nombre: "Laura" };
    await handleMessage(ctx.agent, createMessage("1"), "user@c.us", "1");
    ctx.clearReplies();
    await handleMessage(ctx.agent, createMessage("Mi perro no come"), "user@c.us", "Mi perro no come");
    assert.match(ctx.replies()[0], /Resumen del turno/);
    assert.match(ctx.replies()[0], /Consulta general/);
    assert.match(ctx.replies()[0], /Mi perro no come/);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.TURNO_CONFIRMACION);
  } finally { ctx.cleanup(); }
});

test("veterinaria flow confirms turno", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.TURNO_CONFIRMACION;
    await handleMessage(ctx.agent, createMessage("1"), "user@c.us", "1");
    assert.match(ctx.replies()[0], /Turno confirmado/);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.MENU);
  } finally { ctx.cleanup(); }
});

test("veterinaria flow goes back to menu with 0", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    await handleMessage(ctx.agent, createMessage("0"), "user@c.us", "0");
    assert.match(ctx.replies()[0], /Sacar turno/);
  } finally { ctx.cleanup(); }
});
