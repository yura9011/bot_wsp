const productos = [
  // Entradas
  { id: "empanadas", nombre: "Empanadas (docena)", categoria: "entradas", precio: 3500, descripcion: "Empanadas caseras, variedad: carne, pollo, jamón y queso.", tags: ["empanada", "entrada", "picada"], disponible: true },
  { id: "bruschetta", nombre: "Bruschetta (6 u)", categoria: "entradas", precio: 2800, descripcion: "Tostadas con tomate, albahaca y queso fresco.", tags: ["bruschetta", "tostada", "entrada"], disponible: true },
  { id: "sopa", nombre: "Sopa del día (porción)", categoria: "entradas", precio: 1500, descripcion: "Sopa casera, variedad según disponibilidad.", tags: ["sopa", "entrada", "caldo"], disponible: true },

  // Platos principales
  { id: "milanesa-nap", nombre: "Milanesa a la Napolitana", categoria: "platos", precio: 4200, descripcion: "Milanesa de carne con salsa de tomate, jamón y queso gratinado.", tags: ["milanesa", "napolitana", "carne", "principal"], disponible: true },
  { id: "pollo-al-horno", nombre: "Pollo al horno", categoria: "platos", precio: 3800, descripcion: "Pollo entero al horno con papas y verduras.", tags: ["pollo", "horno", "principal"], disponible: true },
  { id: "pastas", nombre: "Tallarines caseros con tuco", categoria: "platos", precio: 3200, descripcion: "Pastas caseras con salsa de tomate tradicional.", tags: ["tallarines", "pasta", "tuco", "principal"], disponible: true },
  { id: "pescado", nombre: "Filete de merluza", categoria: "platos", precio: 4500, descripcion: "Merluza al horno con limón y hierbas.", tags: ["merluz", "pescado", "fish", "principal"], disponible: true },
  { id: "ensalada", nombre: "Ensalada completa", categoria: "platos", precio: 2800, descripcion: "Lechuga, tomate, zanahoria, huevo, pollo y aderezo.", tags: ["ensalada", "verdura", "ligero", "principal"], disponible: true },

  // Bebidas
  { id: "agua", nombre: "Agua mineral 500ml", categoria: "bebidas", precio: 800, descripcion: "Agua mineral sin gas.", tags: ["agua", "bebida", "mineral"], disponible: true },
  { id: "gaseosa", nombre: "Gaseosa 500ml", categoria: "bebidas", precio: 1000, descripcion: "Gaseosa cola, naranja o limón.", tags: ["gaseosa", "cola", "bebida"], disponible: true },
  { id: "jugos", nombre: "Jugo natural (vaso)", categoria: "bebidas", precio: 1200, descripcion: "Jugo de naranja, limón o manzana recién exprimido.", tags: ["jugo", "naranja", "bebida", "natural"], disponible: true },

  // Postres
  { id: "flan", nombre: "Flan casero", categoria: "postres", precio: 1500, descripcion: "Flan casero con crema y dulce de leche.", tags: ["flan", "postre", "dulce"], disponible: true },
  { id: "tiramisu", nombre: "Tiramisú (porción)", categoria: "postres", precio: 2000, descripcion: "Tiramisú italiano con café y mascarpone.", tags: ["tiramisu", "postre", "cafe"], disponible: true },
  { id: "helado", nombre: "Helado artesanal (2 bolas)", categoria: "postres", precio: 1800, descripcion: "Helado artesanal, variedad de gustos.", tags: ["helado", "postre", "artesanal"], disponible: true },
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
    .map(item => `- ${item.nombre}: $${item.precio} - ${item.descripcion}`)
    .join("\n");
}

function obtenerEstadisticasCatalogo() {
  return {
    totalProductos: productos.length,
    categorias: [...new Set(productos.map(item => item.categoria))]
  };
}

function getMenuCompleto() {
  const categorias = {};
  for (const p of productos) {
    if (!categorias[p.categoria]) categorias[p.categoria] = [];
    categorias[p.categoria].push(p);
  }
  const orden = ["entradas", "platos", "bebidas", "postres"];
  let texto = "📋 *NUESTRO MENÚ*\n\n";
  for (const cat of orden) {
    if (!categorias[cat]) continue;
    const titulo = cat.charAt(0).toUpperCase() + cat.slice(1);
    texto += `*${titulo}*\n`;
    for (const p of categorias[cat]) {
      texto += `  • ${p.nombre} — $${p.precio}\n`;
    }
    texto += "\n";
  }
  texto += "Para hacer un pedido, escribí *2* y decime qué querés.";
  return texto;
}

module.exports = {
  productos,
  buscarProductos,
  formatearProductosParaContexto,
  obtenerEstadisticasCatalogo,
  getMenuCompleto
};
