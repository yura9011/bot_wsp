const servicios = [
  { id: "consulta-general", nombre: "Consulta general", categoria: "consultas", precio: 8000, descripcion: "Consulta clínica general para mascotas.", tags: ["consulta", "clinica", "general", "chequeo"], disponible: true },
  { id: "vacunacion", nombre: "Vacunación", categoria: "consultas", precio: 6000, descripcion: "Aplicación de vacunas según esquema.", tags: ["vacuna", "vacunacion", "calendario"], disponible: true },
  { id: "desparasitacion", nombre: "Desparasitación", categoria: "consultas", precio: 4000, descripcion: "Tratamiento antiparasitario interno y externo.", tags: ["desparasitacion", "gusano", "pulga"], disponible: true },
  { id: "cirugia", nombre: "Cirugía menor", categoria: "procedimientos", precio: 25000, descripcion: "Procedimientos quirúrgicos menores con anestesia.", tags: ["cirugia", "operacion", "quirofano"], disponible: true },
  { id: "esterilizacion", nombre: "Esterilización", categoria: "procedimientos", precio: 30000, descripcion: "Castración o ovariohisterectomía.", tags: ["esterilizacion", "castracion", "ovario"], disponible: true },
  { id: "estetica", nombre: "Estética (baño y corte)", categoria: "estetica", precio: 5000, descripcion: "Baño, corte de pelo y limpieza de orejas.", tags: ["estetica", "baño", "corte", "pelo", "grooming"], disponible: true },
  { id: "radiografia", nombre: "Radiografía", categoria: "diagnostico", precio: 10000, descripcion: "Estudio radiológico digital.", tags: ["radiografia", "rayos", "imagen", "diagnostico"], disponible: true },
  { id: "analisis-sangre", nombre: "Análisis de sangre", categoria: "diagnostico", precio: 12000, descripcion: "Análisis hematológico y bioquímico.", tags: ["sangre", "analisis", "laboratorio", "hemograma"], disponible: true },
];

function normalizar(texto) {
  return String(texto || "").toLowerCase();
}

function buscarServicios(consulta, limite = 5) {
  const query = normalizar(consulta);
  if (!query) return [];

  return servicios
    .filter(servicio => {
      const searchable = normalizar([
        servicio.nombre,
        servicio.categoria,
        servicio.descripcion,
        ...(servicio.tags || [])
      ].join(" "));
      return searchable.includes(query) || query.split(/\s+/).some(term => searchable.includes(term));
    })
    .slice(0, limite);
}

function formatearServiciosParaContexto(items) {
  return items
    .map(item => `- ${item.nombre}: $${item.precio} - ${item.descripcion}`)
    .join("\n");
}

function obtenerEstadisticasCatalogo() {
  return {
    totalProductos: servicios.length,
    categorias: [...new Set(servicios.map(item => item.categoria))]
  };
}

function getMenuServicios() {
  const categorias = {};
  for (const s of servicios) {
    if (!categorias[s.categoria]) categorias[s.categoria] = [];
    categorias[s.categoria].push(s);
  }
  const orden = ["consultas", "procedimientos", "estetica", "diagnostico"];
  let texto = "🐾 *NUESTROS SERVICIOS*\n\n";
  for (const cat of orden) {
    if (!categorias[cat]) continue;
    const titulo = cat.charAt(0).toUpperCase() + cat.slice(1);
    texto += `*${titulo}*\n`;
    for (const s of categorias[cat]) {
      texto += `  • ${s.nombre} — $${s.precio}\n`;
    }
    texto += "\n";
  }
  texto += "Para sacar un turno, escribí *1* y decime qué servicio necesitás.";
  return texto;
}

module.exports = {
  servicios,
  buscarProductos: buscarServicios,
  formatearProductosParaContexto: formatearServiciosParaContexto,
  obtenerEstadisticasCatalogo,
  getMenuServicios
};
