const fs = require("fs");
const path = require("path");

function createAgentApiApp(deps) {
  const express = require("express");
  const app = express();
  app.use(express.json());
  mountAgentApiRoutes(app, deps);
  return app;
}

function mountAgentApiRoutes(app, deps) {
  const {
    agentId,
    agentName,
    getIsRunning,
    getWhatsAppStatus,
    statsManager,
    controlManager,
    client,
    dataPath,
    logsPath,
    logger
  } = deps;

  const log = logger || (() => {});

  app.get("/status", (req, res) => {
    res.json({
      agentId,
      name: agentName,
      isRunning: getIsRunning(),
      whatsapp: getWhatsAppStatus(),
      globalPausado: controlManager.getPausaGlobal(),
      usuariosPausados: Object.keys(controlManager.getUsuariosPausados()).length,
      timestamp: Date.now()
    });
  });

  app.get("/stats", async (req, res) => {
    try {
      const stats = await statsManager.leerEstadisticas();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/paused", (req, res) => {
    try {
      const pausados = controlManager.getUsuariosPausados();
      res.json(pausados);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/pause/:userId", (req, res) => {
    const userId = req.params.userId;
    if (!userId.includes("@")) {
      return res.status(400).json({ success: false, error: "userId inválido" });
    }
    const reason = req.body?.reason || "pausado_por_api";
    const metadata = req.body?.metadata || {};
    controlManager.pausarUsuario(userId, reason, metadata);
    res.json({ success: true, message: `Usuario ${userId} pausado` });
  });

  app.post("/resume/:userId", (req, res) => {
    const userId = req.params.userId;
    if (!userId.includes("@")) {
      return res.status(400).json({ success: false, error: "userId inválido" });
    }
    const resultado = controlManager.reanudarUsuario(userId);
    res.json({ success: resultado, message: resultado ? "Reanudado" : "No estaba pausado" });
  });

  app.post("/pause-global", (req, res) => {
    controlManager.setPausaGlobal(true);
    res.json({ success: true, message: "Bot pausado globalmente" });
  });

  app.post("/resume-global", (req, res) => {
    controlManager.setPausaGlobal(false);
    res.json({ success: true, message: "Bot reanudado globalmente" });
  });

  app.post("/message/sendMessage/:sessionId", async (req, res) => {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    try {
      log(`[${agentId}] 🧑‍💼 Enviando mensaje humano a ${chatId}: "${message}"`);
      await client.sendMessage(chatId, message);
      controlManager.guardarEnHistorial(chatId, "human", message);
      res.json({ success: true });
    } catch (error) {
      log(`[${agentId}] ❌ Error enviando mensaje humano: ${error.message}`, "ERROR");
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/chat/fetchMessages/:sessionId", async (req, res) => {
    const { chatId, limit = 50 } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: "Falta chatId" });
    }

    try {
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      const formatted = messages.map(m => ({
        body: m.body,
        from: m.from,
        fromMe: m.fromMe,
        timestamp: m.timestamp * 1000,
        type: m.type
      }));

      res.json(formatted);
    } catch (error) {
      log(`[${agentId}] ❌ Error obteniendo mensajes: ${error.message}`, "ERROR");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/conversations", (req, res) => {
    try {
      const historialPath = path.join(dataPath, "historial.json");
      if (fs.existsSync(historialPath)) {
        const historial = JSON.parse(fs.readFileSync(historialPath, "utf8"));
        res.json(formatConversations(historial, parseInt(req.query.limit) || 0));
      } else {
        res.json({ conversaciones: [], resumenPorNumero: [] });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/logs", (req, res) => {
    try {
      const lineas = parseInt(req.query.lines) || 50;
      const logPath = path.join(logsPath, "bot.log");

      if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, "utf8");
        res.json(formatBotLogs(data, lineas));
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/security", (req, res) => {
    try {
      const lineas = parseInt(req.query.lines) || 20;
      const logPath = path.join(logsPath, "security.log");

      if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, "utf8");
        res.json(formatSecurityLogs(data, lineas));
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

function formatConversations(historial, limit) {
  const conversaciones = [];
  const resumenPorNumero = {};

  for (const [userId, mensajes] of Object.entries(historial)) {
    if (mensajes && mensajes.length > 0) {
      const numeroLimpio = userId.replace(/@.*/, "").replace(/^54/, "+54 ");
      resumenPorNumero[numeroLimpio] = {
        userId,
        numero: numeroLimpio,
        totalMensajes: mensajes.length,
        ultimoMensaje: mensajes[mensajes.length - 1]?.timestamp || 0
      };

      let mensajesParaMostrar = mensajes;
      if (limit > 0 && mensajes.length > limit) {
        mensajesParaMostrar = mensajes.slice(-limit);
      }

      const mensajesFormateados = mensajesParaMostrar.map(msg => ({
        type: msg.role === "user" ? "user" :
              msg.role === "human" ? "human" : "bot",
        text: msg.text,
        timestamp: msg.timestamp
      }));

      conversaciones.push({
        userId,
        numero: numeroLimpio,
        messages: mensajesFormateados,
        lastMessage: mensajes[mensajes.length - 1]?.timestamp || 0,
        totalMensajes: mensajes.length
      });
    }
  }

  const sorted = conversaciones.sort((a, b) => b.lastMessage - a.lastMessage);
  const resumen = Object.values(resumenPorNumero).sort((a, b) => b.ultimoMensaje - a.ultimoMensaje);

  return {
    conversaciones: sorted,
    resumenPorNumero: resumen
  };
}

function formatBotLogs(data, lineas) {
  return data.split("\n").filter(l => l.trim()).slice(-lineas).map(log => ({
    timestamp: log.match(/\[(.+?)\]/)?.[1] || "Unknown",
    message: log
  }));
}

function formatSecurityLogs(data, lineas) {
  return data.split("\n").filter(l => l.trim()).slice(-lineas).map(log => {
    const match = log.match(/\[(.+?)\].*Usuario: (.+?) - Tipo: (.+?) - Mensaje: "(.+?)"/);
    if (match) {
      const [, timestamp, userId, tipo, mensaje] = match;
      return {
        timestamp,
        userId: userId.replace(/@(c\.us|lid)$/, ""),
        tipo,
        mensaje: mensaje.substring(0, 50) + (mensaje.length > 50 ? "..." : "")
      };
    }
    return { timestamp: "Unknown", userId: "Unknown", tipo: "Unknown", mensaje: log };
  });
}

module.exports = {
  createAgentApiApp,
  mountAgentApiRoutes,
  formatConversations,
  formatBotLogs,
  formatSecurityLogs
};
