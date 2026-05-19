const fs = require("fs");
const path = require("path");
const { getTimestamp, log } = require("./logging");
const { resolveRuntimePath } = require("./runtime-paths");

// ─── SISTEMA ANTI-HIJACKING ──────────────────────────────────────────────────

// Patrones de ataques de hijacking
const PATRONES_HIJACKING = [
  // Prompt Injection
  /ignora.*instrucciones/i,
  /olvida.*que.*eres/i,
  /actúa.*como/i,
  /eres.*ahora/i,
  /cambia.*personalidad/i,
  /empezemos.*de.*cero/i,
  /resetea/i,
  /reinicia/i,
  
  // System Override
  /ignora.*system/i,
  /borra.*todo/i,
  /elimina.*catálogo/i,
  /borra.*catálogo/i,
  /destruye/i,
  /hackea/i,
  
  // Information Extraction
  /muestra.*prompt/i,
  /cuáles.*instrucciones/i,
  /repite.*configuración/i,
  /system.*prompt/i,
  /tu.*configuración/i,
  /tus.*instrucciones/i,
  /cómo.*funciona.*internamente/i,
  
  // Role Hijacking
  /chatgpt/i,
  /gpt-4/i,
  /claude/i,
  /asistente.*diferente/i,
  /no.*eres.*coti/i,
  /eres.*realmente/i,
  /actúa.*como.*si.*fueras/i,
  
  // Command Injection
  /ejecuta.*comando/i,
  /run.*command/i,
  /sudo/i,
  /admin.*mode/i,
  /modo.*desarrollador/i,
  /debug.*mode/i,
];

// Respuestas estándar para cada tipo de ataque
const RESPUESTAS_ANTI_HIJACKING = {
  prompt_injection: "Soy Coti, asistente de Dolce Party. ¿Te puedo ayudar con productos de cotillón? 🎈",
  role_hijacking: "Soy Coti y solo ayudo con productos de nuestra tienda. ¿Qué necesitás para tu fiesta? 🎉",
  system_override: "No puedo cambiar mi función. Estoy aquí para ayudarte con cotillón. ¿Qué buscás? 🎊",
  info_extraction: "Solo puedo ayudarte con productos y servicios de la tienda. ¿En qué te ayudo? 🛍️",
  command_injection: "Soy un asistente de tienda, no ejecuto comandos. ¿Te ayudo con algún producto? 🎁"
};

/**
 * Detecta intentos de hijacking en el mensaje del usuario
 * @param {string} mensaje - Mensaje del usuario
 * @returns {string|null} Tipo de ataque detectado o null si no hay ataque
 */
function detectarHijacking(mensaje) {
  const mensajeLower = mensaje.toLowerCase();
  
  // Verificar patrones de prompt injection
  if (PATRONES_HIJACKING.slice(0, 8).some(patron => patron.test(mensajeLower))) {
    return 'prompt_injection';
  }
  
  // Verificar patrones de system override
  if (PATRONES_HIJACKING.slice(8, 14).some(patron => patron.test(mensajeLower))) {
    return 'system_override';
  }
  
  // Verificar patrones de information extraction
  if (PATRONES_HIJACKING.slice(14, 21).some(patron => patron.test(mensajeLower))) {
    return 'info_extraction';
  }
  
  // Verificar patrones de role hijacking
  if (PATRONES_HIJACKING.slice(21, 28).some(patron => patron.test(mensajeLower))) {
    return 'role_hijacking';
  }
  
  // Verificar patrones de command injection
  if (PATRONES_HIJACKING.slice(28).some(patron => patron.test(mensajeLower))) {
    return 'command_injection';
  }
  
  return null;
}

/**
 * Registra intento de hijacking en logs de seguridad
 * @param {string} userId - ID del usuario
 * @param {string} mensaje - Mensaje del ataque
 * @param {string} tipoAtaque - Tipo de ataque detectado
 */
function logearIntentoHijacking(userId, mensaje, tipoAtaque) {
  const timestamp = getTimestamp();
  const logSeguridad = `${timestamp} [SECURITY] 🚨 INTENTO DE HIJACKING - Usuario: ${userId} - Tipo: ${tipoAtaque} - Mensaje: "${mensaje}"`;
  
  console.log(logSeguridad);
  
  // Guardar en archivo de seguridad
  const archivoSeguridad = resolveRuntimePath(process.env.SECURITY_LOG_PATH || path.join("logs", "security.log"));
  try {
    fs.appendFileSync(archivoSeguridad, logSeguridad + "\n");
  } catch (error) {
    console.error(`Error escribiendo log de seguridad: ${error.message}`);
  }
  
  // Log normal también
  log(`🚨 INTENTO DE HIJACKING: ${tipoAtaque} de ${userId}`, "SECURITY");
}

module.exports = {
  detectarHijacking,
  logearIntentoHijacking,
  RESPUESTAS_ANTI_HIJACKING
};
