const productos = [
  {
    id: "demo-automation",
    nombre: "Automatizacion WhatsApp",
    categoria: "software",
    descripcion: "Bot conversacional con panel humano y handoff por conversacion.",
    tags: ["whatsapp", "bot", "dashboard", "handoff"]
  },
  {
    id: "demo-dashboard",
    nombre: "Dashboard humano",
    categoria: "software",
    descripcion: "Panel para revisar chats, tomar conversaciones y responder manualmente.",
    tags: ["dashboard", "operacion", "soporte"]
  }
];

function normalizar(texto) {
  return String(texto || "").toLowerCase();
}

function buscarProductos(consulta, limite = 5) {
  const query = normalizar(consulta);
  if (!query) return [];

  return productos
    .filter(producto => {
      const searchable = normalizar([
        producto.nombre,
        producto.categoria,
        producto.descripcion,
        ...(producto.tags || [])
      ].join(" "));
      return searchable.includes(query) || query.split(/\s+/).some(term => searchable.includes(term));
    })
    .slice(0, limite);
}

function formatearProductosParaContexto(items) {
  return items
    .map(item => `- ${item.nombre}: ${item.descripcion}`)
    .join("\n");
}

function obtenerEstadisticasCatalogo() {
  return {
    totalProductos: productos.length,
    categorias: [...new Set(productos.map(item => item.categoria))]
  };
}

module.exports = {
  productos,
  buscarProductos,
  formatearProductosParaContexto,
  obtenerEstadisticasCatalogo
};
