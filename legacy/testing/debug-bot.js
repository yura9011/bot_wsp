// Script de diagnóstico para el bot
require("dotenv").config();

console.log("🔍 DIAGNÓSTICO DEL BOT");
console.log("======================");

// 1. Verificar variables de entorno
console.log("\n1. Variables de entorno:");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✅ Configurada" : "❌ Falta");
console.log("SYSTEM_PROMPT:", process.env.SYSTEM_PROMPT ? "✅ Configurada" : "❌ Falta");
console.log("ADMIN_NUMBERS:", process.env.ADMIN_NUMBERS ? "✅ Configurada" : "❌ Falta");
console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "✅ Configurada" : "❌ Falta");

// 2. Verificar archivos críticos
console.log("\n2. Archivos críticos:");
const fs = require("fs");
const path = require("path");

const archivos = [
  "data/productos.js",
  "lib/logging.js",
  "lib/validation.js",
  "lib/control-manual.js",
  "lib/whatsapp-client.js",
  "flujos.js",
  "catalogo.js"
];

archivos.forEach(archivo => {
  const existe = fs.existsSync(archivo);
  console.log(`${archivo}:`, existe ? "✅ Existe" : "❌ Falta");
});

// 3. Probar importaciones
console.log("\n3. Probando importaciones:");
try {
  const { log } = require("./lib/logging");
  console.log("lib/logging:", "✅ OK");
  
  const { validarDatosIniciales } = require("./lib/validation");
  console.log("lib/validation:", "✅ OK");
  
  const { cargarEstadoPausas } = require("./lib/control-manual");
  console.log("lib/control-manual:", "✅ OK");
  
  const { initializeClient } = require("./lib/whatsapp-client");
  console.log("lib/whatsapp-client:", "✅ OK");
  
  const { ESTADOS } = require("./flujos");
  console.log("flujos.js:", "✅ OK");
  
  const { buscarProductos } = require("./catalogo");
  console.log("catalogo.js:", "✅ OK");
  
} catch (error) {
  console.log("❌ Error en importaciones:", error.message);
}

// 4. Probar validación
console.log("\n4. Probando validación:");
try {
  const { validarDatosIniciales } = require("./lib/validation");
  const resultado = validarDatosIniciales();
  console.log("Validación:", resultado ? "✅ Pasó" : "❌ Falló");
} catch (error) {
  console.log("❌ Error en validación:", error.message);
}

// 5. Verificar estado de pausas
console.log("\n5. Estado de pausas:");
try {
  const pausas = JSON.parse(fs.readFileSync("data/pausas.json", "utf8"));
  console.log("Bot pausado globalmente:", pausas.global ? "❌ SÍ" : "✅ NO");
  console.log("Usuarios pausados:", Object.keys(pausas.usuarios).length);
} catch (error) {
  console.log("❌ Error leyendo pausas:", error.message);
}

console.log("\n======================");
console.log("🔍 DIAGNÓSTICO COMPLETADO");