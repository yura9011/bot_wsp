const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { authenticateToken, JWT_SECRET } = require('./middleware/auth');
const { findAgentConfig } = require('../lib/agent-config');
const { resolveRuntimePath } = require('../lib/runtime-paths');
const { createConversationState } = require('../lib/conversation-state');
const {
  AdminNumberRegistryError,
  createAdminNumberRegistry
} = require('../lib/admin-number-registry');
const { createBotApiClient } = require('./lib/bot-api-client');

console.log('🚀 Iniciando Dashboard Humano v2 - VERSIÓN CORREGIDA');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuración
const PORT = process.env.DASHBOARD_HUMANO_PORT || 3001;
const AGENT_ID = process.env.DASHBOARD_AGENT_ID || 'demo-local';
const CONFIG_AGENT_ID = process.env.CONFIG_AGENT_ID || AGENT_ID;
const IS_TESTING = process.env.NODE_ENV === 'development';

// Paths
const CONFIG_PATH = process.env.AGENTS_CONFIG_PATH || path.join(__dirname, '../config/agents.json');
const STARTUP_AGENT = resolveDashboardAgentConfig();
const DATA_PATH = process.env.DATA_PATH
  ? resolveRuntimePath(process.env.DATA_PATH)
  : resolveRuntimePath(STARTUP_AGENT?.paths?.data || path.join('data', AGENT_ID));
const conversationState = createConversationState(DATA_PATH);
const adminNumberRegistry = createAdminNumberRegistry({
  agentConfig: STARTUP_AGENT || {},
  dataPath: DATA_PATH
});
const botApiClient = createBotApiClient({
  agentId: AGENT_ID,
  getAgentConfig: leerConfig
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
// express.static se mueve al final (después de las rutas API)

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // 5 intentos
  message: { error: 'Demasiados intentos de login. Intenta en 1 minuto.' }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function leerConfig() {
  try {
    return resolveDashboardAgentConfig();
  } catch (error) {
    console.error('Error leyendo config:', error);
    return null;
  }
}

function resolveDashboardAgentConfig() {
  const { agent } = findAgentConfig(CONFIG_AGENT_ID, { configPath: CONFIG_PATH });
  return agent || null;
}

function leerHistorial() {
  return conversationState.loadHistory();
}

function leerPausas() {
  return conversationState.loadPauses();
}

function obtenerChats() {
  return conversationState.listChats();
}

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

console.log('📝 Registrando rutas de autenticación...');

app.get('/api/test', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ success: true, message: 'Test OK' });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('❌ Missing credentials');
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const agent = leerConfig();
  console.log('📋 Agent config:', agent ? 'Found' : 'Not found');
  console.log('👥 Dashboard users:', agent?.dashboardUsers ? 'Found' : 'Not found');
  
  if (!agent || !agent.dashboardUsers) {
    console.log('❌ No dashboard users configured');
    return res.status(500).json({ error: 'Configuración de usuarios no encontrada' });
  }

  const user = agent.dashboardUsers.find(u => u.username === username);
  console.log('👤 User found:', user ? 'Yes' : 'No');
  
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  console.log('🔑 Password valid:', validPassword);
  
  if (!validPassword) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  // Generar JWT
  const token = jwt.sign(
    { username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    sameSite: 'strict'
  });

  res.json({
    success: true,
    user: {
      username: user.username,
      name: user.name,
      role: user.role
    },
    token
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ============================================
// RUTAS DE DASHBOARD (PROTEGIDAS)
// ============================================

app.get('/api/chats', authenticateToken, (req, res) => {
  const chats = obtenerChats();
  res.json(chats);
});

app.get('/api/chats/:userId/messages', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const historial = leerHistorial();
  const mensajes = historial[userId] || [];
  res.json(mensajes);
});

app.post('/api/chats/:userId/message', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  try {
    await botApiClient.sendHumanMessage(userId, message);

    io.emit('message_sent', { userId, message, timestamp: Date.now() });
    res.json({ success: true });
  } catch (error) {
    console.error('Error enviando mensaje:', error.message);
    res.status(500).json({ error: 'Error enviando mensaje: ' + error.message });
  }
});

app.post('/api/chats/:userId/take', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    await botApiClient.takeConversation(userId);

    io.emit('handoff_taken', { userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error tomando conversación:', error.message);
    res.status(500).json({ error: 'Error tomando conversación: ' + error.message });
  }
});

app.post('/api/chats/:userId/resume', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    await botApiClient.resumeConversation(userId);

    io.emit('bot_resumed', { userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error devolviendo conversación al bot:', error.message);
    res.status(500).json({ error: 'Error devolviendo conversación al bot: ' + error.message });
  }
});

app.post('/api/chats/:userId/finish', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    await botApiClient.finishConversation(userId);

    io.emit('bot_resumed', { userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error finalizando conversación:', error.message);
    res.status(500).json({ error: 'Error finalizando conversación: ' + error.message });
  }
});

// ============================================
// RUTAS ADMIN NUMBERS (CRUD) - Solo admins
// ============================================

function requireAdminRole(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden gestionar números' });
  }
  next();
}

function handleAdminNumberError(error, res) {
  if (error instanceof AdminNumberRegistryError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error('Error guardando admin-numbers:', error);
  return res.status(500).json({ error: 'Error guardando los datos' });
}

app.get('/api/admin-numbers', authenticateToken, (req, res) => {
  res.json(adminNumberRegistry.list());
});

app.post('/api/admin-numbers', authenticateToken, requireAdminRole, (req, res) => {
  const { id, nombre, rol } = req.body;

  try {
    adminNumberRegistry.addEntry({ id, nombre, rol, agregadoPor: req.user.username });
    res.json({ success: true, message: 'Número agregado correctamente' });
  } catch (error) {
    handleAdminNumberError(error, res);
  }
});

app.put('/api/admin-numbers/:id', authenticateToken, requireAdminRole, (req, res) => {
  const { id } = req.params;
  const { nombre, rol } = req.body;

  try {
    adminNumberRegistry.updateEntry(id, { nombre, rol });
    res.json({ success: true, message: 'Número actualizado correctamente' });
  } catch (error) {
    handleAdminNumberError(error, res);
  }
});

app.delete('/api/admin-numbers/:id', authenticateToken, requireAdminRole, (req, res) => {
  const { id } = req.params;

  try {
    adminNumberRegistry.deleteEntry(id);
    res.json({ success: true, message: 'Número eliminado correctamente' });
  } catch (error) {
    handleAdminNumberError(error, res);
  }
});

// ============================================
// ENDPOINT INTERNO (notificaciones desde el bot)
// ============================================

app.post('/api/internal/new-message', (req, res) => {
  const { userId, event = 'new_message', handoffReason = null, handoffReasonLabel = null, handoffRequestedAt = null } = req.body;
  io.emit(event, { userId, handoffReason, handoffReasonLabel, handoffRequestedAt });
  if (event !== 'new_message') {
    io.emit('new_message', { userId, handoffReason, handoffReasonLabel, handoffRequestedAt });
  }
  res.json({ ok: true });
});

// ============================================
// WEBSOCKET
// ============================================

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join_dashboard', ({ agentId }) => {
    socket.join(agentId);
    console.log(`Cliente ${socket.id} unido a sala ${agentId}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Polling para detectar cambios (cada 3 segundos)
setInterval(() => {
  const chats = obtenerChats();
  io.emit('chats_updated', chats);
}, 3000);

// ============================================
// ENDPOINT DE ENTORNO
// ============================================

app.get('/api/env', (req, res) => {
  res.json({ isTesting: IS_TESTING, agentId: AGENT_ID });
});

// ============================================
// ENDPOINT PHONE MAP
// ============================================

app.get('/api/phone-map', authenticateToken, (req, res) => {
  try {
    if (fs.existsSync(adminNumberRegistry.phoneMapPath)) {
      res.json(JSON.parse(fs.readFileSync(adminNumberRegistry.phoneMapPath, 'utf8')));
    } else {
      res.json({});
    }
  } catch(e) {
    res.json({});
  }
});

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS (DESPUÉS DE RUTAS API)
// ============================================
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// INICIAR SERVIDOR
// ============================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Dashboard Humano corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📊 Agente: ${AGENT_ID}`);
  if (IS_TESTING) console.log('⚠️  MODO TESTING ACTIVO');
});
