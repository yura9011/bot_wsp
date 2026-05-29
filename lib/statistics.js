const fs = require("fs");
const path = require("path");
const { log } = require("./logging");
const { leerArchivoJSON, modificarArchivoJSON } = require("./file-manager");

// Estructura por defecto para estadísticas
const ESTRUCTURA_ESTADISTICAS = {
  mensajes: {},
  usuarios: {},
  handoffs: {},
  hijacking: {},
  busquedas: {},
  aiRespondidas: {},
  errores: {},
  metadatos: {
    fechaInicio: new Date().toISOString(),
    version: "1.0.0"
  }
};

// Obtener fecha en formato YYYY-MM-DD
function getFechaHoy() {
  return new Date().toISOString().split('T')[0];
}

// Crear un gestor de estadísticas para un archivo específico
function createStatisticsManager(filePath) {
  const archivo = filePath;
  
  return {
    async inicializar() {
      try {
        await leerArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS);
        log("📊 Sistema de estadísticas inicializado: " + archivo);
      } catch (error) {
        log(`❌ Error inicializando estadísticas: ${error.message}`, "ERROR");
      }
    },

    async leerEstadisticas() {
      return await leerArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS);
    },

    async registrarMensaje(userId, tipo = "recibido") {
      const fecha = getFechaHoy();
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, (stats) => {
          if (!stats.mensajes[fecha]) {
            stats.mensajes[fecha] = { recibidos: 0, enviados: 0, handoffs: 0 };
          }
          if (tipo === "recibido") {
            stats.mensajes[fecha].recibidos++;
          } else if (tipo === "enviado") {
            stats.mensajes[fecha].enviados++;
          }
          if (!stats.usuarios[fecha]) {
            stats.usuarios[fecha] = [];
          }
          if (!Array.isArray(stats.usuarios[fecha])) {
            stats.usuarios[fecha] = Array.from(stats.usuarios[fecha]);
          }
          if (!stats.usuarios[fecha].includes(userId)) {
            stats.usuarios[fecha].push(userId);
          }
          return stats;
        });
      } catch (error) {
        log(`⚠️ Error registrando mensaje: ${error.message}`, "WARN");
      }
    },

    async registrarHandoff(userId, razon = "solicitado") {
      const fecha = getFechaHoy();
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, (stats) => {
          if (!stats.handoffs[fecha]) {
            stats.handoffs[fecha] = { total: 0, automaticos: 0, manuales: 0 };
          }
          stats.handoffs[fecha].total++;
          if (razon === "handoff_solicitado") {
            stats.handoffs[fecha].automaticos++;
          } else {
            stats.handoffs[fecha].manuales++;
          }
          if (!stats.mensajes[fecha]) {
            stats.mensajes[fecha] = { recibidos: 0, enviados: 0, handoffs: 0 };
          }
          stats.mensajes[fecha].handoffs++;
          return stats;
        });
      } catch (error) {
        log(`⚠️ Error registrando handoff: ${error.message}`, "WARN");
      }
    },

    async registrarHijacking(userId, tipo) {
      const fecha = getFechaHoy();
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, (stats) => {
          if (!stats.hijacking[fecha]) {
            stats.hijacking[fecha] = { 
              total: 0, 
              prompt_injection: 0, 
              role_hijacking: 0, 
              system_override: 0, 
              info_extraction: 0, 
              command_injection: 0 
            };
          }
          stats.hijacking[fecha].total++;
          if (stats.hijacking[fecha][tipo] !== undefined) {
            stats.hijacking[fecha][tipo]++;
          }
          return stats;
        });
      } catch (error) {
        log(`⚠️ Error registrando hijacking: ${error.message}`, "WARN");
      }
    },

    async registrarBusqueda(consulta, resultados = 0) {
      const fecha = getFechaHoy();
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, (stats) => {
          if (!stats.busquedas[fecha]) {
            stats.busquedas[fecha] = { total: 0, conResultados: 0, sinResultados: 0, consultas: [] };
          }
          stats.busquedas[fecha].total++;
          if (resultados > 0) {
            stats.busquedas[fecha].conResultados++;
          } else {
            stats.busquedas[fecha].sinResultados++;
          }
          if (stats.busquedas[fecha].consultas.length < 100) {
            stats.busquedas[fecha].consultas.push({
              consulta: consulta.substring(0, 50),
              resultados,
              timestamp: Date.now()
            });
          }
          return stats;
        });
      } catch (error) {
        log(`⚠️ Error registrando búsqueda: ${error.message}`, "WARN");
      }
    },

    async registrarRespuestaIA(userId) {
      const fecha = getFechaHoy();
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, (stats) => {
          if (!stats.aiRespondidas[fecha]) {
            stats.aiRespondidas[fecha] = { total: 0, usuarios: [] };
          }
          stats.aiRespondidas[fecha].total++;
          if (!stats.aiRespondidas[fecha].usuarios.includes(userId)) {
            stats.aiRespondidas[fecha].usuarios.push(userId);
          }
          return stats;
        });
      } catch (error) {
        log(`⚠️ Error registrando respuesta IA: ${error.message}`, "WARN");
      }
    },

    async registrarError(userId, tipo = "desconocido") {
      const fecha = getFechaHoy();
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, (stats) => {
          if (!stats.errores[fecha]) {
            stats.errores[fecha] = { total: 0, hijacking: 0, prohibido: 0, llm_fallo: 0, mensaje_largo: 0 };
          }
          stats.errores[fecha].total++;
          if (stats.errores[fecha][tipo] !== undefined) {
            stats.errores[fecha][tipo]++;
          }
          return stats;
        });
      } catch (error) {
        log(`⚠️ Error registrando error: ${error.message}`, "WARN");
      }
    },

    async getEstadisticasHoy() {
      const stats = await this.leerEstadisticas();
      const fecha = getFechaHoy();
      return this._buildDiaSnapshot(stats, fecha);
    },

    async getEstadisticasUltimosDias(dias = 7) {
      const stats = await this.leerEstadisticas();
      const resultado = [];
      for (let i = dias - 1; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];
        resultado.push(this._buildDiaSnapshot(stats, fechaStr));
      }
      return resultado;
    },

    _buildDiaSnapshot(stats, fecha) {
      return {
        fecha,
        mensajes: stats.mensajes[fecha] || { recibidos: 0, enviados: 0, handoffs: 0 },
        usuariosUnicos: stats.usuarios[fecha] ? stats.usuarios[fecha].length : 0,
        handoffs: stats.handoffs[fecha] || { total: 0, automaticos: 0, manuales: 0 },
        hijacking: stats.hijacking[fecha] || { total: 0 },
        busquedas: stats.busquedas[fecha] || { total: 0, conResultados: 0, sinResultados: 0 },
        aiRespondidas: stats.aiRespondidas[fecha] || { total: 0, usuarios: [] },
        errores: stats.errores[fecha] || { total: 0, hijacking: 0, prohibido: 0, llm_fallo: 0, mensaje_largo: 0 }
      };
    },

    async getEstadisticasRango(fechaDesde, fechaHasta) {
      const stats = await this.leerEstadisticas();
      const resultado = [];
      const desde = new Date(fechaDesde + 'T00:00:00');
      const hasta = new Date(fechaHasta + 'T00:00:00');
      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split('T')[0];
        resultado.push(this._buildDiaSnapshot(stats, fechaStr));
      }
      return resultado;
    },

    async getResumenGeneral() {
      const stats = await this.leerEstadisticas();
      const hoy = await this.getEstadisticasHoy();
      const ultimos7Dias = await this.getEstadisticasUltimosDias(7);
      
      const totalesSemana = ultimos7Dias.reduce((acc, dia) => {
        acc.mensajes += dia.mensajes.recibidos;
        acc.handoffs += dia.handoffs.total;
        acc.hijacking += dia.hijacking.total;
        acc.busquedas += dia.busquedas.total;
        return acc;
      }, { mensajes: 0, handoffs: 0, hijacking: 0, busquedas: 0 });
      
      const usuariosUnicos = new Set();
      Object.values(stats.usuarios).forEach(usuarios => {
        if (Array.isArray(usuarios)) {
          usuarios.forEach(user => usuariosUnicos.add(user));
        }
      });
      
      return {
        hoy,
        semana: {
          ...totalesSemana,
          usuariosUnicos: usuariosUnicos.size,
          promedioDiario: {
            mensajes: Math.round(totalesSemana.mensajes / 7),
            handoffs: Math.round(totalesSemana.handoffs / 7),
            busquedas: Math.round(totalesSemana.busquedas / 7)
          }
        },
        total: {
          usuariosRegistrados: usuariosUnicos.size,
          diasActivo: Object.keys(stats.mensajes).length,
          fechaInicio: stats.metadatos.fechaInicio
        }
      };
    },

    async getConsultasFrecuentes(dias = 7) {
      const stats = await this.leerEstadisticas();
      const consultas = {};
      for (let i = 0; i < dias; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];
        if (stats.busquedas[fechaStr] && stats.busquedas[fechaStr].consultas) {
          stats.busquedas[fechaStr].consultas.forEach(item => {
            const consulta = item.consulta.toLowerCase();
            consultas[consulta] = (consultas[consulta] || 0) + 1;
          });
        }
      }
      return Object.entries(consultas)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([consulta, frecuencia]) => ({ consulta, frecuencia }));
    },

    async resetEstadisticas() {
      try {
        await modificarArchivoJSON(archivo, ESTRUCTURA_ESTADISTICAS, () => {
          return {
            mensajes: {},
            usuarios: {},
            handoffs: {},
            hijacking: {},
            busquedas: {},
            aiRespondidas: {},
            errores: {},
            metadatos: {
              fechaInicio: new Date().toISOString(),
              version: "1.0.0"
            }
          };
        });
        return true;
      } catch (error) {
        log(`❌ Error reseteando estadísticas: ${error.message}`, "ERROR");
        return false;
      }
    }
  };
}

module.exports = {
  createStatisticsManager,
  ESTRUCTURA_ESTADISTICAS
};
