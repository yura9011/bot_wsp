#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Uso: node scripts/csv-to-catalog.js <input.csv> <output.js>");
  console.error("");
  console.error("Ejemplo:");
  console.error("  node scripts/csv-to-catalog.js productos.csv catalogs/catalogo-cliente.js");
  console.error("");
  console.error("Formato CSV esperado:");
  console.error("  producto,categoria,descripcion,precio,stock,sinonimos,observaciones");
  console.error("  bengala dorada,cotillon,bengala para torta,1500,10,bengalita vela,no usar en interior");
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);

if (!fs.existsSync(inputPath)) {
  console.error(`Error: No se encontró el archivo ${inputPath}`);
  process.exit(1);
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseStock(stockStr) {
  if (!stockStr) return { stock: 0, disponible: true };
  const s = stockStr.toLowerCase().trim();
  if (s === "disponible" || s === "si" || s === "sí" || s === "true") return { stock: 99, disponible: true };
  if (s === "no disponible" || s === "no" || s === "false" || s === "agotado") return { stock: 0, disponible: false };
  const num = parseInt(s, 10);
  if (isNaN(num)) return { stock: 0, disponible: true };
  return { stock: num, disponible: num > 0 };
}

function escapeJS(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}

const raw = fs.readFileSync(inputPath, "utf8");
const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);

if (lines.length < 2) {
  console.error("Error: El CSV debe tener al menos una cabecera y una fila de datos.");
  process.exit(1);
}

const header = parseCSVLine(lines[0]);
const requiredCols = ["producto", "categoria", "precio"];
const missingCols = requiredCols.filter(col => !header.includes(col));

if (missingCols.length > 0) {
  console.error(`Error: Faltan columnas obligatorias: ${missingCols.join(", ")}`);
  console.error(`Columnas encontradas: ${header.join(", ")}`);
  process.exit(1);
}

const colIndex = {};
header.forEach((col, idx) => { colIndex[col.toLowerCase().trim()] = idx; });

const productos = [];
const errors = [];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  if (cols.length < header.length) {
    errors.push(`Línea ${i + 1}: menos columnas que la cabecera`);
    continue;
  }

  const nombre = (cols[colIndex.producto] || "").trim();
  const categoria = (cols[colIndex.categoria] || "").trim();
  const descripcion = (cols[colIndex.descripcion] || "").trim();
  const precioStr = (cols[colIndex.precio] || "0").trim();
  const stockStr = cols[colIndex.stock] !== undefined ? (cols[colIndex.stock] || "").trim() : "";
  const sinonimosStr = cols[colIndex.sinonimos] !== undefined ? (cols[colIndex.sinonimos] || "").trim() : "";
  const observaciones = cols[colIndex.observaciones] !== undefined ? (cols[colIndex.observaciones] || "").trim() : "";

  if (!nombre) {
    errors.push(`Línea ${i + 1}: nombre de producto vacío`);
    continue;
  }

  const precio = parseInt(precioStr.replace(/[^0-9]/g, ""), 10) || 0;
  const { stock, disponible } = parseStock(stockStr);
  const tags = sinonimosStr ? sinonimosStr.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean) : [];
  const descFull = observaciones ? `${descripcion}. ${observaciones}` : descripcion;

  productos.push({
    id: slugify(nombre),
    nombre,
    categoria: categoria.toLowerCase().trim(),
    precio,
    stock,
    disponible,
    descripcion: descFull,
    tags
  });
}

if (errors.length > 0) {
  console.error("Errores encontrados:");
  errors.forEach(e => console.error(`  - ${e}`));
  if (productos.length === 0) {
    console.error("No se generó ningún producto. Abortando.");
    process.exit(1);
  }
  console.error(`\nGenerando catálogo con ${productos.length} productos válidos.`);
}

const catalogName = path.basename(outputPath, ".js");

const jsContent = `// Catálogo generado automáticamente desde CSV
// Fuente: ${path.basename(inputPath)}
// Productos: ${productos.length}

const productos = [
${productos.map(p => `  {
    id: '${escapeJS(p.id)}',
    nombre: '${escapeJS(p.nombre)}',
    categoria: '${escapeJS(p.categoria)}',
    precio: ${p.precio},
    stock: ${p.stock},
    disponible: ${p.disponible},
    descripcion: '${escapeJS(p.descripcion)}',
    tags: [${p.tags.map(t => `'${escapeJS(t)}'`).join(", ")}]
  }`).join(",\n")}
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
      return searchable.includes(query) || query.split(/\\s+/).some(term => searchable.includes(term));
    })
    .slice(0, limite);
}

function formatearProductosParaContexto(items) {
  return items
    .map(item => {
      const stockInfo = item.stock === 0 ? " (SIN STOCK)" : item.stock <= 3 ? " (últimas " + item.stock + " unidades)" : "";
      return "- " + item.nombre + ": $" + item.precio + stockInfo + " - " + item.descripcion;
    })
    .join("\\n");
}

function obtenerEstadisticasCatalogo() {
  return {
    totalProductos: productos.length,
    categorias: [...new Set(productos.map(item => item.categoria))]
  };
}

function getCategorias() {
  return [...new Set(productos.map(p => p.categoria))];
}

function getProductosPorCategoria(categoria) {
  return productos.filter(p => p.categoria === categoria && p.disponible);
}

function getMenuCompleto() {
  const categorias = {};
  for (const p of productos) {
    if (!categorias[p.categoria]) categorias[p.categoria] = [];
    categorias[p.categoria].push(p);
  }
  const cats = getCategorias();
  let texto = "📋 *CATÁLOGO*\\n\\n";
  for (const cat of cats) {
    if (!categorias[cat]) continue;
    const titulo = cat.charAt(0).toUpperCase() + cat.slice(1);
    texto += "*" + titulo + "*\\n";
    for (const p of categorias[cat]) {
      texto += "  • " + p.nombre + " — $" + p.precio + "\\n";
    }
    texto += "\\n";
  }
  texto += "Escribí el nombre de un producto para buscar más info.";
  return texto;
}

module.exports = {
  productos,
  buscarProductos,
  formatearProductosParaContexto,
  obtenerEstadisticasCatalogo,
  getCategorias,
  getProductosPorCategoria,
  getMenuCompleto
};
`;

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, jsContent, "utf8");

console.log(`✅ Catálogo generado: ${outputPath}`);
console.log(`   Productos: ${productos.length}`);
console.log(`   Categorías: ${[...new Set(productos.map(p => p.categoria))].join(", ")}`);
if (errors.length > 0) {
  console.log(`   Errores corregidos: ${errors.length}`);
}
