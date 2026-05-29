const productos = [
  // Alimentos
  { id: "alimento-perro", nombre: "Alimento para perro (15kg)", categoria: "alimentos", precio: 18000, stock: 10, descripcion: "Alimento balanceado premium para perros adultos.", tags: ["alimento", "perro", "comida", "balanceado"], disponible: true },
  { id: "alimento-gato", nombre: "Alimento para gato (10kg)", categoria: "alimentos", precio: 15000, stock: 8, descripcion: "Alimento balanceado para gatos.", tags: ["alimento", "gato", "comida", "balanceado"], disponible: true },
  { id: "alimento-hamster", nombre: "Alimento para hamster", categoria: "alimentos", precio: 2500, stock: 15, descripcion: "Mezcla de semillas y granos para hamsters.", tags: ["alimento", "hamster", "semillas"], disponible: true },

  // Accesorios
  { id: "correa", nombre: "Correa retráctil", categoria: "accesorios", precio: 4500, stock: 12, descripcion: "Correa retráctil de 5 metros con freno.", tags: ["correa", "paseo", "perro", "retractil"], disponible: true },
  { id: "collar", nombre: "Collar ajustable", categoria: "accesorios", precio: 3000, stock: 20, descripcion: "Collar de nylon ajustable con Hebilla de seguridad.", tags: ["collar", "perro", "gato", "nylon"], disponible: true },
  { id: "camita", nombre: "Cama acolchada", categoria: "accesorios", precio: 8000, stock: 5, descripcion: "Cama suave y lavable para mascotas medianas.", tags: ["cama", "descanso", "acolchada", "comoda"], disponible: true },
  { id: "transportadora", nombre: "Transportadora plástica", categoria: "accesorios", precio: 12000, stock: 3, descripcion: "Transportadora rígida para viajes y consultas.", tags: ["transportadora", "viaje", "portaequipaje"], disponible: true },
  { id: "juguete-cuerda", nombre: "Juguete de cuerda", categoria: "accesorios", precio: 1500, stock: 25, descripcion: "Juguete resistente de cuerda trenzada.", tags: ["juguete", "cuerda", "perro", "juego"], disponible: true },

  // Higiene
  { id: "shampoo", nombre: "Shampoo antipulgas", categoria: "higiene", precio: 3500, stock: 14, descripcion: "Shampoo medicado antipulgas y garrapatas.", tags: ["shampoo", "baño", "pulga", "garrapata", "higiene"], disponible: true },
  { id: "cepillo", nombre: "Cepillo deslanador", categoria: "higiene", precio: 2800, stock: 18, descripcion: "Cepillo para eliminar pelo muerto y nudos.", tags: ["cepillo", "pelo", "deslanador", "grooming"], disponible: true },
  { id: "arena", nombre: "Arena para gato (10kg)", categoria: "higiene", precio: 3000, stock: 20, descripcion: "Arena aglomerante con control de olores.", tags: ["arena", "gato", "arenero", "higiene"], disponible: true },
  { id: "spray-olor", nombre: "Spray neutralizador de olores", categoria: "higiene", precio: 2200, stock: 0, descripcion: "Spray para eliminar olores de mascotas.", tags: ["spray", "olor", "neutralizador", "limpieza"], disponible: false },

  // Salud
  { id: "antipulgas", nombre: "Collar antipulgas", categoria: "salud", precio: 5500, stock: 7, descripcion: "Collar con repelente de pulgas por 6 meses.", tags: ["antipulgas", "collar", "pulga", "proteccion"], disponible: true },
  { id: "vitaminas", nombre: "Vitaminas (tubo)", categoria: "salud", precio: 4000, stock: 11, descripcion: "Suplemento vitamínico para mascotas.", tags: ["vitamina", "suplemento", "salud", "nutricion"], disponible: true },
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
    .map(item => {
      const stockInfo = item.stock === 0 ? " (SIN STOCK)" : item.stock <= 3 ? " (últimas unidades)" : "";
      return `- ${item.nombre}: $${item.precio}${stockInfo} - ${item.descripcion}`;
    })
    .join("\n");
}

function obtenerEstadisticasCatalogo() {
  return {
    totalProductos: productos.length,
    categorias: [...new Set(productos.map(item => item.categoria))]
  };
}

function getProductosPorCategoria(categoria) {
  return productos.filter(p => p.categoria === categoria && p.disponible);
}

function getCategorias() {
  return [...new Set(productos.map(p => p.categoria))];
}

module.exports = {
  productos,
  buscarProductos,
  formatearProductosParaContexto,
  obtenerEstadisticasCatalogo,
  getProductosPorCategoria,
  getCategorias
};
