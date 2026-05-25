// Script de prueba para el módulo de catálogo
const {
  buscarProductos,
  formatearProductosParaContexto,
  obtenerEstadisticasCatalogo,
} = require("./catalogo.js");

console.log("=== TEST DEL CATÁLOGO ===\n");

// Test 1: Estadísticas
console.log("1. Estadísticas del catálogo:");
const stats = obtenerEstadisticasCatalogo();
console.log(`   Total productos: ${stats.totalProductos}`);
console.log(`   Total categorías: ${stats.totalCategorias}`);
console.log(`   Productos con precio: ${stats.productosConPrecio}`);
console.log(`   Categorías: ${stats.categorias.slice(0, 5).join(", ")}...\n`);

// Test 2: Búsqueda de globos
console.log("2. Búsqueda: 'globos'");
const resultadosGlobos = buscarProductos("globos", 3);
console.log(`   Encontrados: ${resultadosGlobos.length}`);
resultadosGlobos.forEach((p) => {
  console.log(`   - ${p.nombre} (${p.categoria}) - $${p.precio || "Consultar"}`);
});
console.log();

// Test 3: Búsqueda de pelota
console.log("3. Búsqueda: 'pelota'");
const resultadosPelota = buscarProductos("pelota", 3);
console.log(`   Encontrados: ${resultadosPelota.length}`);
resultadosPelota.forEach((p) => {
  console.log(`   - ${p.nombre} (${p.categoria}) - $${p.precio || "Consultar"}`);
});
console.log();

// Test 4: Búsqueda de cumpleaños
console.log("4. Búsqueda: 'cumpleaños'");
const resultadosCumple = buscarProductos("cumpleaños", 3);
console.log(`   Encontrados: ${resultadosCumple.length}`);
resultadosCumple.forEach((p) => {
  console.log(`   - ${p.nombre} (${p.categoria}) - $${p.precio || "Consultar"}`);
});
console.log();

// Test 5: Formateo para contexto
console.log("5. Formato para contexto (primeros 500 chars):");
const contexto = formatearProductosParaContexto(resultadosGlobos);
console.log(contexto.substring(0, 500) + "...\n");

console.log("=== TESTS COMPLETADOS ===");
