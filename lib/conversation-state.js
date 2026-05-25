const fs = require("fs");
const path = require("path");

function createConversationState(dataDir) {
  const pausasPath = path.join(dataDir, "pausas.json");
  const historialPath = path.join(dataDir, "historial.json");

  function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  function loadHistory() {
    try {
      if (fs.existsSync(historialPath)) {
        return JSON.parse(fs.readFileSync(historialPath, "utf8"));
      }
    } catch (error) {
      console.error("Error loading history:", error.message);
    }
    return {};
  }

  function addMessage(userId, role, text) {
    ensureDataDir();
    const history = loadHistory();
    if (!history[userId]) {
      history[userId] = [];
    }
    history[userId].push({
      timestamp: Date.now(),
      role: role,
      text: text
    });
    fs.writeFileSync(historialPath, JSON.stringify(history, null, 2));
  }

  function loadPauses() {
    try {
      if (fs.existsSync(pausasPath)) {
        return JSON.parse(fs.readFileSync(pausasPath, "utf8"));
      }
    } catch (error) {
      console.error("Error loading pauses:", error.message);
    }
    return {};
  }

  function savePauses(pauses) {
    ensureDataDir();
    fs.writeFileSync(pausasPath, JSON.stringify(pauses, null, 2));
  }

  function pauseUser(userId, reason) {
    const pauses = loadPauses();
    const usuarios = pauses.usuarios || {};
    usuarios[userId] = {
      pausado: true,
      timestamp: Date.now(),
      razon: reason
    };
    pauses.usuarios = usuarios;
    if (pauses.timestamp === undefined) {
      pauses.timestamp = Date.now();
    }
    savePauses(pauses);
  }

  function resumeUser(userId) {
    const pauses = loadPauses();
    const usuarios = pauses.usuarios || {};
    if (usuarios[userId]) {
      delete usuarios[userId];
      pauses.usuarios = usuarios;
      savePauses(pauses);
      return true;
    }
    return false;
  }

  function getChatState(pauseEntry) {
    if (!pauseEntry || !pauseEntry.pausado) return "bot";
    if (pauseEntry.razon === "atendido_desde_dashboard") return "active_human";
    if (pauseEntry.razon === "handoff_solicitado") return "waiting_human";
    return "waiting_human";
  }

  function listChats() {
    const history = loadHistory();
    const pauses = loadPauses();
    const usuariosPausados = pauses.usuarios || {};
    const chats = [];

    for (const [userId, mensajes] of Object.entries(history)) {
      if (!mensajes || mensajes.length === 0) continue;

      const ultimoMensaje = mensajes[mensajes.length - 1];
      const pauseEntry = usuariosPausados[userId] || {};
      const pausado = pauseEntry.pausado || false;
      const estado = getChatState(pauseEntry);

      chats.push({
        userId,
        nombre: userId.split("@")[0],
        ultimoMensaje: (ultimoMensaje.text || ultimoMensaje.texto || ultimoMensaje.parts?.[0]?.text || "").substring(0, 50),
        timestamp: ultimoMensaje.timestamp || Date.now(),
        estado,
        mensajes: mensajes.length,
        noLeidos: pausado ? 1 : 0
      });
    }

    chats.sort((a, b) => b.timestamp - a.timestamp);
    return chats;
  }

  return {
    loadHistory,
    addMessage,
    loadPauses,
    savePauses,
    pauseUser,
    resumeUser,
    listChats
  };
}

module.exports = { createConversationState };
