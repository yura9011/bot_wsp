const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { handleMessage, ESTADOS, formatearResultados } = require("./catalogo-flow");

function createAgent(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "catalogo-flow-"));
  const agent = {
    id: "demo-catalogo",
    config: {
      info: { nombre: "Mi Tienda", telefono: "+54 9 11 5555-7777", direccion: "Calle Real 789" },
      features: { flowType: "catalogo", human_handoff: true }
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

function createCatalogo() {
  const productos = [
    { id: "p1", nombre: " Producto Alfa", categoria: "electrónica", precio: 5000, stock: 10, descripcion: "Un producto electrónico.", tags: ["electronica", "tech"], disponible: true },
    { id: "p2", nombre: " Producto Beta", categoria: "electrónica", precio: 3000, stock: 2, descripcion: "Otro producto.", tags: ["electronica", "barato"], disponible: true },
    { id: "p3", nombre: " Producto Gamma", categoria: "hogar", precio: 8000, stock: 0, descripcion: "Producto de hogar.", tags: ["hogar", "casa"], disponible: false },
  ];
  return {
    productos,
    buscarProductos: (q, lim) => {
      const query = q.toLowerCase();
      return productos.filter(p => (p.nombre + p.categoria + p.descripcion + p.tags.join(" ")).toLowerCase().includes(query)).slice(0, lim || 5);
    },
    formatearProductosParaContexto: (items) => items.map(i => `- ${i.nombre}: $${i.precio}`).join("\n"),
    getCategorias: () => ["electrónica", "hogar"],
    getProductosPorCategoria: (cat) => productos.filter(p => p.categoria === cat)
  };
}

test("catalogo flow sends greeting and asks for name", async () => {
  const ctx = createAgent();
  try {
    await handleMessage(ctx.agent, createMessage("Hola"), "user@c.us", "Hola");
    assert.equal(ctx.replies().length, 1);
    assert.match(ctx.replies()[0], /Mi Tienda/);
    assert.match(ctx.replies()[0], /llamás/i);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.ESPERANDO_NOMBRE);
  } finally { ctx.cleanup(); }
});

test("catalogo flow saves name and shows menu", async () => {
  const ctx = createAgent();
  try {
    await handleMessage(ctx.agent, createMessage("Hola"), "user@c.us", "Hola");
    ctx.clearReplies();
    await handleMessage(ctx.agent, createMessage("Pedro"), "user@c.us", "Pedro");
    assert.match(ctx.replies()[0], /Hola Pedro/);
    assert.match(ctx.replies()[1], /Buscar producto/);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.MENU);
  } finally { ctx.cleanup(); }
});

test("catalogo flow enters search when option 1", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    await handleMessage(ctx.agent, createMessage("1"), "user@c.us", "1");
    assert.match(ctx.replies()[0], /buscando/);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.BUSCAR);
  } finally { ctx.cleanup(); }
});

test("catalogo flow searches and shows results with stock", async () => {
  const ctx = createAgent({ catalogo: createCatalogo() });
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.BUSCAR;
    await handleMessage(ctx.agent, createMessage("electrónica"), "user@c.us", "electrónica");
    assert.match(ctx.replies()[0], /Resultados/);
    assert.match(ctx.replies()[0], /Producto Alfa/);
    assert.match(ctx.replies()[0], /\$5000/);
  } finally { ctx.cleanup(); }
});

test("catalogo flow shows no results message and suggests alternatives", async () => {
  const ctx = createAgent({ catalogo: createCatalogo() });
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.BUSCAR;
    await handleMessage(ctx.agent, createMessage("xyz123"), "user@c.us", "xyz123");
    assert.match(ctx.replies()[0], /No encontré/);
  } finally { ctx.cleanup(); }
});

test("catalogo flow shows categories when option 2", async () => {
  const ctx = createAgent({ catalogo: createCatalogo() });
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.MENU;
    await handleMessage(ctx.agent, createMessage("2"), "user@c.us", "2");
    assert.match(ctx.replies()[0], /Categorías/);
    assert.match(ctx.replies()[0], /electrónica/i);
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.CATEGORIAS);
  } finally { ctx.cleanup(); }
});

test("catalogo flow shows products in category", async () => {
  const ctx = createAgent({ catalogo: createCatalogo() });
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.CATEGORIAS;
    await handleMessage(ctx.agent, createMessage("1"), "user@c.us", "1");
    assert.match(ctx.replies()[0], /electrónica/i);
    assert.match(ctx.replies()[0], /Producto Alfa/);
  } finally { ctx.cleanup(); }
});

test("catalogo flow goes back to menu with 0", async () => {
  const ctx = createAgent();
  try {
    ctx.agent.estadosUsuario["user@c.us"] = ESTADOS.BUSCAR;
    await handleMessage(ctx.agent, createMessage("0"), "user@c.us", "0");
    assert.equal(ctx.agent.estadosUsuario["user@c.us"], ESTADOS.MENU);
    assert.match(ctx.replies()[0], /Buscar producto/);
  } finally { ctx.cleanup(); }
});

test("formatearResultados shows stock info", () => {
  const items = [
    { nombre: "A", precio: 1000, stock: 10, descripcion: "desc" },
    { nombre: "B", precio: 2000, stock: 0, descripcion: "desc" },
    { nombre: "C", precio: 3000, stock: 2, descripcion: "desc" },
  ];
  const result = formatearResultados(items);
  assert.match(result, /Stock: 10/);
  assert.match(result, /SIN STOCK/);
  assert.match(result, /últimas 2/i);
});
