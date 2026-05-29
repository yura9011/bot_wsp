const fs = require("fs");
const path = require("path");
const { log } = require("./logging");
const { createConversationState } = require("./conversation-state");

// ─── SISTEMA DE CONTROL MANUAL (DINÁMICO) ──────────────────────────────────

function createControlManager(dataDir) {
  const AUTO_RESUME_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

  // Persistencia delegada al módulo de conversation-state
  const conversationState = createConversationState(dataDir);

  // Crear carpeta de datos si no existe
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Estado interno de la instancia
  let usuariosPausados = {};
  let pausaGlobal = false;
  let timerReactivacion = null;

  // --- MÉTODOS ---

  const manager = {
    cargarEstadoPausas: function() {
      try {
        const estado = conversationState.loadPauses();
        if (estado && Object.keys(estado).length > 0) {
          usuariosPausados = estado.usuarios || {};
          pausaGlobal = estado.global || false;
        }
        log(`📂 [${path.basename(dataDir)}] Estado de pausas cargado: ${Object.keys(usuariosPausados).length} usuarios`);
        this.programarReactivacionAutomatica();
      } catch (error) {
        log(`⚠️ Error cargando pausas en ${dataDir}: ${error.message}`, "WARN");
      }
    },

    guardarEstadoPausas: function() {
      try {
        const estado = {
          global: pausaGlobal,
          usuarios: usuariosPausados,
          timestamp: Date.now()
        };
        conversationState.savePauses(estado);
      } catch (error) {
        log(`⚠️ Error guardando pausas en ${dataDir}: ${error.message}`, "WARN");
      }
    },

    pausarUsuario: function(userId, razon, metadata = {}) {
      usuariosPausados[userId] = {
        ...(usuariosPausados[userId] || {}),
        pausado: true,
        timestamp: Date.now(),
        razon: razon,
        notificado: false,
        ...metadata
      };
      this.guardarEstadoPausas();
      log(`⏸️ Usuario ${userId} pausado en ${path.basename(dataDir)} (${razon})`);
      this.programarReactivacionAutomatica();
    },

    reanudarUsuario: function(userId) {
      if (usuariosPausados[userId]) {
        delete usuariosPausados[userId];
        this.guardarEstadoPausas();
        log(`▶️ Usuario ${userId} reanudado en ${path.basename(dataDir)}`);
        this.programarReactivacionAutomatica();
        return true;
      }
      return false;
    },

    programarReactivacionAutomatica: function() {
      if (timerReactivacion) {
        clearTimeout(timerReactivacion);
        timerReactivacion = null;
      }
      
      const ahora = Date.now();
      let proximoVencimiento = null;
      
      for (const [userId, pausa] of Object.entries(usuariosPausados)) {
        const tiempoEspera = ahora - pausa.timestamp;
        const tiempoRestante = AUTO_RESUME_TIMEOUT_MS - tiempoEspera;
        
        if (tiempoRestante > 0) {
          if (!proximoVencimiento || tiempoRestante < proximoVencimiento.tiempo) {
            proximoVencimiento = { userId, tiempo: tiempoRestante };
          }
        }
      }
      
      if (proximoVencimiento) {
        timerReactivacion = setTimeout(() => {
          this.verificarYReactivarUsuarios();
        }, proximoVencimiento.tiempo);
        timerReactivacion.unref?.();
      }
    },

    verificarYReactivarUsuarios: async function() {
      const ahora = Date.now();
      const usuariosAReactivar = [];
      
      for (const [userId, pausa] of Object.entries(usuariosPausados)) {
        if ((ahora - pausa.timestamp) >= AUTO_RESUME_TIMEOUT_MS) {
          usuariosAReactivar.push(userId);
        }
      }
      
      for (const userId of usuariosAReactivar) {
        this.reanudarUsuario(userId);
        log(`🔄 Usuario ${userId} reactivado automáticamente en ${path.basename(dataDir)}`);
      }
      
      this.programarReactivacionAutomatica();
    },

    guardarEnHistorial: function(userId, role, texto) {
      try {
        conversationState.addMessage(userId, role, texto);
      } catch (error) {
        log(`⚠️ Error guardando historial en ${dataDir}: ${error.message}`, "WARN");
      }
    },

    getUsuariosPausados: () => usuariosPausados,
    getPausaGlobal: () => pausaGlobal,
    setPausaGlobal: function(estado) {
      pausaGlobal = estado;
      this.guardarEstadoPausas();
    },
    estaUsuarioPausado: (userId) => usuariosPausados[userId]?.pausado || false,
    getPausaUsuario: (userId) => usuariosPausados[userId] || null,
    AUTO_RESUME_TIMEOUT_MS
  };

  return manager;
}

module.exports = {
  createControlManager
};
