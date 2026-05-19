const fs = require("fs");
const path = require("path");
const { log } = require("./logging");
const { resolveRuntimePath } = require("./runtime-paths");

const PHONE_MAP_PATH = resolveRuntimePath(process.env.PHONE_MAP_PATH || path.join('config', 'phone-map.json'));

function createAdminCommands(agentConfig, controlManager) {
  const DATA_PATH = resolveRuntimePath(agentConfig.paths.data);
  const ADMIN_NUMBERS_PATH = path.join(DATA_PATH, "admin-numbers.json");
  const LOGS_PATH = resolveRuntimePath(agentConfig.paths.logs);

  let adminNumbersCache = [];

  function cargarAdminNumbers() {
    try {
      if (fs.existsSync(ADMIN_NUMBERS_PATH)) {
        const data = JSON.parse(fs.readFileSync(ADMIN_NUMBERS_PATH, 'utf8'));
        adminNumbersCache = data.admins || [];
        log(`[${agentConfig.id}] 📋 Admin numbers cargados: ${adminNumbersCache.length} registros`);
        return;
      }
    } catch (error) {
      log(`[${agentConfig.id}] ⚠️ Error leyendo admin-numbers: ${error.message}`);
    }

    const envNumbers = process.env.ADMIN_NUMBERS
      ? process.env.ADMIN_NUMBERS.split(',').map(n => n.trim()).filter(n => n.length > 0)
      : [];

    if (envNumbers.length > 0) {
      adminNumbersCache = envNumbers.map(id => ({ id, rol: 'admin', nombre: 'Migrado desde .env' }));
      log(`[${agentConfig.id}] 📋 Admin numbers cargados desde .env: ${adminNumbersCache.length} registros`);
      return;
    }

    if (agentConfig.adminNumbers && agentConfig.adminNumbers.length > 0) {
      adminNumbersCache = agentConfig.adminNumbers.map(id => ({ id, rol: 'admin', nombre: 'Default agents.json' }));
      log(`[${agentConfig.id}] 📋 Admin numbers cargados desde agents.json: ${adminNumbersCache.length} registros`);
      return;
    }

    adminNumbersCache = [];
    log(`[${agentConfig.id}] 📋 No hay admin numbers configurados`);
  }

  function resolverNumero(numero) {
    const limpio = numero.replace(/@(c\.us|lid)$/, '');
    try {
      if (fs.existsSync(PHONE_MAP_PATH)) {
        const mapa = JSON.parse(fs.readFileSync(PHONE_MAP_PATH, 'utf8'));
        if (mapa[limpio]) return [limpio, mapa[limpio]];
        const lidEntry = Object.entries(mapa).find(([lid, phone]) => phone === limpio);
        if (lidEntry) return [limpio, lidEntry[0]];
      }
    } catch(e) {}
    return [limpio];
  }

  function esAdmin(numero) {
    const ids = resolverNumero(numero);
    return adminNumbersCache.some(a => ids.includes(a.id));
  }

  function getRolAdmin(numero) {
    const ids = resolverNumero(numero);
    const entry = adminNumbersCache.find(a => ids.includes(a.id));
    return entry ? entry.rol : null;
  }

  function initFileWatcher() {
    try {
      fs.watchFile(ADMIN_NUMBERS_PATH, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          log(`[${agentConfig.id}] 🔄 admin-numbers.json cambiado, recargando...`);
          cargarAdminNumbers();
        }
      });
      log(`[${agentConfig.id}] 👁️ Watching admin-numbers.json para cambios`);
    } catch (error) {
      log(`[${agentConfig.id}] ⚠️ Error iniciando file watcher: ${error.message}`);
    }
  }

  function recargarAdminNumbers() {
    cargarAdminNumbers();
  }

  async function procesarComandoAdmin(message, comando, estadosUsuario) {
    const partes = comando.trim().split(" ");
    const cmd = partes.slice(0, 3).join(" ").toUpperCase();

    if (cmd === "PAUSAR BOT GLOBAL") {
      controlManager.setPausaGlobal(true);
      await message.reply("✅ Bot pausado globalmente. Ningún cliente recibirá respuestas automáticas.");
      log(`[${agentConfig.id}] 🔴 Bot pausado globalmente por admin`);
      return true;
    }

    if (cmd === "REANUDAR BOT GLOBAL") {
      controlManager.setPausaGlobal(false);
      await message.reply("✅ Bot reanudado globalmente. Volviendo a responder automáticamente.");
      log(`[${agentConfig.id}] 🟢 Bot reanudado globalmente por admin`);
      return true;
    }

    if (partes[0].toUpperCase() === "ESTADO" && partes[1].toUpperCase() === "BOT") {
      const pausados = controlManager.getUsuariosPausados();
      const usuariosPausadosCount = Object.keys(pausados).length;
      let respuesta = "📊 *Estado del Bot*\n\n";
      respuesta += `• Global: ${controlManager.getPausaGlobal() ? "⏸️ Pausado" : "✅ Activo"}\n`;
      respuesta += `• Usuarios pausados: ${usuariosPausadosCount}\n`;

      if (usuariosPausadosCount > 0) {
        respuesta += "\n*Usuarios en atención manual:*\n";
        const ahora = Date.now();
        for (const [userId, pausa] of Object.entries(pausados)) {
          const minutos = Math.floor((ahora - pausa.timestamp) / 60000);
          const minutosRestantes = Math.max(0, Math.ceil((controlManager.AUTO_RESUME_TIMEOUT_MS - (ahora - pausa.timestamp)) / 60000));
          respuesta += `  - ${userId.replace(/@(c\.us|lid)$/, "")} (${minutos} min, auto-reactiva en ${minutosRestantes} min)\n`;
        }
      }

      await message.reply(respuesta);
      return true;
    }

    if (partes[0].toUpperCase() === "SEGURIDAD" && partes[1].toUpperCase() === "BOT") {
      try {
        const archivoSeguridad = path.join(LOGS_PATH, "security.log");
        if (fs.existsSync(archivoSeguridad)) {
          const logsData = fs.readFileSync(archivoSeguridad, "utf8");
          const lineas = logsData.split('\n').filter(l => l.trim()).slice(-10);

          let respuesta = "🔒 *Últimos Intentos de Hijacking*\n\n";
          if (lineas.length === 0) {
            respuesta += "✅ No hay intentos de hijacking registrados";
          } else {
            lineas.forEach((linea, index) => {
              const match = linea.match(/\[(.+?)\].*Usuario: (.+?) - Tipo: (.+?) - Mensaje:/);
              if (match) {
                const [, timestamp, userId, tipo] = match;
                respuesta += `${index + 1}. ${timestamp}\n`;
                respuesta += `   Usuario: ${userId.replace(/@(c\.us|lid)$/, "")}\n`;
                respuesta += `   Tipo: ${tipo}\n\n`;
              }
            });
          }

          await message.reply(respuesta);
        } else {
          await message.reply("🔒 No hay logs de seguridad disponibles");
        }
      } catch (error) {
        await message.reply("❌ Error leyendo logs de seguridad");
      }
      return true;
    }

    if (partes[0].toUpperCase() === "PAUSAR" && partes.length >= 2) {
      const numeroBase = partes[1];
      let usuarioEncontrado = null;
      const formatosPosibles = [`${numeroBase}@c.us`, `${numeroBase}@lid`];

      for (const formato of formatosPosibles) {
        if (estadosUsuario[formato]) {
          usuarioEncontrado = formato;
          break;
        }
      }

      if (usuarioEncontrado) {
        controlManager.pausarUsuario(usuarioEncontrado, "pausado_por_admin");
        await message.reply(`✅ Usuario ${numeroBase} pausado. El bot dejará de responderle.`);
      } else {
        const pausados = controlManager.getUsuariosPausados();
        let usuarioYaPausado = null;

        for (const formato of formatosPosibles) {
          if (pausados[formato]) {
            usuarioYaPausado = formato;
            break;
          }
        }

        if (usuarioYaPausado) {
          await message.reply(`⚠️ Usuario ${numeroBase} ya está pausado desde una sesión anterior.`);
        } else {
          await message.reply(`⚠️ Usuario ${numeroBase} no tiene conversación activa con el bot y no está pausado.`);
        }
      }
      return true;
    }

    if (partes[0].toUpperCase() === "REANUDAR" && partes.length >= 2) {
      const numeroBase = partes[1];
      let usuarioEncontrado = null;
      const formatosPosibles = [`${numeroBase}@c.us`, `${numeroBase}@lid`];

      for (const formato of formatosPosibles) {
        if (controlManager.getUsuariosPausados()[formato]) {
          usuarioEncontrado = formato;
          break;
        }
      }

      if (usuarioEncontrado && controlManager.reanudarUsuario(usuarioEncontrado)) {
        await message.reply(`✅ Usuario ${numeroBase} reanudado. El bot volverá a responderle.`);
      } else {
        await message.reply(`⚠️ Usuario ${numeroBase} no estaba pausado.`);
      }
      return true;
    }

    return false;
  }

  cargarAdminNumbers();
  initFileWatcher();

  return {
    esAdmin,
    getRolAdmin,
    procesarComandoAdmin,
    recargarAdminNumbers
  };
}

module.exports = { createAdminCommands };
