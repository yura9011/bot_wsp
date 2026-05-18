const fs = require("fs");
const path = require("path");
const { log } = require("./logging");

// ─── VALIDACIÓN DE DATOS NECESARIOS ──────────────────────────────────────────

/**
 * Valida que todos los archivos y datos necesarios estén disponibles
 * @returns {boolean} true si todo está correcto, false si hay problemas
 */
function validarDatosIniciales() {
  let todoCorrecto = true;

  // 1. Verificar que existe el archivo de productos
  const archivoProductos = path.join(__dirname, "..", "data", "productos.js");
  if (!fs.existsSync(archivoProductos)) {
    log("❌ ERROR CRÍTICO: No se encontró data/productos.js", "ERROR");
    todoCorrecto = false;
  } else {
    try {
      const { productos } = require("../data/productos.js");
      if (!productos || !Array.isArray(productos) || productos.length === 0) {
        log("⚠️ WARNING: El catálogo de productos está vacío", "WARN");
      } else {
        log(`✅ Catálogo cargado: ${productos.length} productos`);
      }
    } catch (error) {
      log(`❌ ERROR: No se pudo cargar data/productos.js: ${error.message}`, "ERROR");
      todoCorrecto = false;
    }
  }

  // 2. Verificar variables de entorno críticas
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const variablesRequeridas = [
    'SYSTEM_PROMPT',
    'ADMIN_NUMBERS',
    provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GEMINI_API_KEY'
  ];

  for (const variable of variablesRequeridas) {
    if (!process.env[variable]) {
      log(`❌ ERROR: Variable de entorno ${variable} no configurada`, "ERROR");
      todoCorrecto = false;
    }
  }

  // 3. Verificar variables opcionales pero recomendadas
  if (provider !== 'openrouter' && !process.env.OPENROUTER_API_KEY) {
    log("⚠️ WARNING: OPENROUTER_API_KEY no configurada. Fallbacks no disponibles.", "WARN");
  }

  // 4. Verificar que las carpetas necesarias existan
  const carpetasNecesarias = ['data', 'logs'];
  for (const carpeta of carpetasNecesarias) {
    const rutaCarpeta = path.join(__dirname, "..", carpeta);
    if (!fs.existsSync(rutaCarpeta)) {
      try {
        fs.mkdirSync(rutaCarpeta, { recursive: true });
        log(`📁 Carpeta ${carpeta}/ creada`);
      } catch (error) {
        log(`❌ ERROR: No se pudo crear carpeta ${carpeta}/: ${error.message}`, "ERROR");
        todoCorrecto = false;
      }
    }
  }

  return todoCorrecto;
}

/**
 * Valida la configuración de números admin
 * @returns {Object} Información sobre la configuración de admin
 */
function validarConfiguracionAdmin() {
  const adminNumbers = process.env.ADMIN_NUMBERS;
  
  if (!adminNumbers) {
    return {
      valido: false,
      cantidad: 0,
      mensaje: "No hay números admin configurados"
    };
  }

  const numeros = adminNumbers.split(',').map(n => n.trim()).filter(n => n.length > 0);
  
  return {
    valido: numeros.length > 0,
    cantidad: numeros.length,
    mensaje: `${numeros.length} números admin configurados`
  };
}

const { AUTO_RESUME_TIMEOUT_MS } = require("./control-manual");

module.exports = {
  validarDatosIniciales,
  validarConfiguracionAdmin,
  AUTO_RESUME_TIMEOUT_MS
};
