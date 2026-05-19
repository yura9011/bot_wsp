const fs = require("fs");
const path = require("path");
const { resolveRuntimePath } = require("./runtime-paths");

// ─── UTILIDADES DE LOGGING ────────────────────────────────────────────────────

const LOG_FILE = resolveRuntimePath(process.env.LOG_FILE_PATH || path.join("logs", "bot.log"));

// Crear carpeta de logs si no existe
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Función para obtener timestamp formateado [DD/MM/YYYY HH:mm:ss]
function getTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `[${day}/${month}/${year} ${hours}:${minutes}:${seconds}]`;
}

// Función para hacer log (consola + archivo)
function log(mensaje, nivel = "INFO") {
  const timestamp = getTimestamp();
  const logLine = `${timestamp} [${nivel}] ${mensaje}`;
  
  // Consola
  console.log(logLine);
  
  // Archivo
  try {
    fs.appendFileSync(LOG_FILE, logLine + "\n");
  } catch (error) {
    console.error(`Error escribiendo log: ${error.message}`);
  }
}

module.exports = {
  log,
  getTimestamp
};
