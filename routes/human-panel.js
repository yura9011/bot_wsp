// routes/human-panel.js
// Endpoints para el Panel de Agente Humano
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadAgentsConfig: loadRuntimeAgentsConfig } = require('../lib/agent-config');
const { resolveRuntimePath } = require('../lib/runtime-paths');

// ─── HELPERS ─────────────────────────────────────────────────

function loadAgentsConfig() {
    return loadRuntimeAgentsConfig().config;
}

// ─── GET HANDOFFS ACTIVOS ──────────────────────────────────────
// Lista usuarios pausados con razon "handoff_solicitado"

router.get('/:id/handoffs', async (req, res) => {
    try {
        const config = loadAgentsConfig();
        const agent = config.agents.find(a => a.id === req.params.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agente no encontrado' });
        }

        // Leer archivo de pausas
        const pausasPath = path.join(resolveRuntimePath(agent.paths.data), 'pausas.json');
        
        if (!fs.existsSync(pausasPath)) {
            return res.json({ handoffs: [] });
        }

        const pausas = JSON.parse(fs.readFileSync(pausasPath, 'utf8'));
        const handoffs = [];

        // Filtrar usuarios con handoff solicitado
        for (const [userId, data] of Object.entries(pausas.usuarios || {})) {
            if (data.razon === 'handoff_solicitado' && data.pausado) {
                handoffs.push({
                    userId,
                    fechaPausa: data.timestamp, // Corregido: antes era fechaPausa
                    tiempoTranscurrido: Date.now() - (data.timestamp || Date.now()),
                    chatId: userId.includes('@') ? userId : `${userId}@c.us`
                });
            }
        }

        res.json({ handoffs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── ENVIAR MENSAJE COMO HUMANO ──────────────────────────────
// Usa la API wwebjs para enviar mensaje

router.post('/:id/send-human-message', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({ error: 'Faltan userId o message' });
        }

        const config = loadAgentsConfig();
        const agent = config.agents.find(a => a.id === req.params.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agente no encontrado' });
        }

        const fetch = require('node-fetch');
        const chatId = userId.includes('@') ? userId : `${userId}@c.us`;
        const sessionId = agent.whatsappSession || agent.id;
        
        const response = await fetch(`http://127.0.0.1:${agent.ports.api}/message/sendMessage/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                message: `🧑‍💼 [Humano]: ${message}`
            })
        });

        const result = await response.json();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── RESOLVER HANDOFF ──────────────────────────────────────────
// Reanuda al usuario (quita pausa)

router.post('/:id/resolve-handoff/:userId', async (req, res) => {
    try {
        const config = loadAgentsConfig();
        const agent = config.agents.find(a => a.id === req.params.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agente no encontrado' });
        }

        const fetch = require('node-fetch');
        const dashboardPort = agent.ports.dashboard || (agent.ports.api - 10);
        const response = await fetch(`http://127.0.0.1:${dashboardPort}/api/resume/${req.params.userId}`, {
            method: 'POST'
        });

        const result = await response.json();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── OBTENER MENSAJES DE UN CHAT ────────────────────────────

router.post('/:id/fetch-messages', async (req, res) => {
    try {
        const { chatId, limit } = req.body;
        
        if (!chatId) {
            return res.status(400).json({ error: 'Falta chatId' });
        }

        const config = loadAgentsConfig();
        const agent = config.agents.find(a => a.id === req.params.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agente no encontrado' });
        }

        const sessionId = agent.whatsappSession || agent.id;
        const fetch = require('node-fetch');
        const response = await fetch(`http://127.0.0.1:${agent.ports.api}/chat/fetchMessages/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                limit: limit || 50
            })
        });

        const messages = await response.json();
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
