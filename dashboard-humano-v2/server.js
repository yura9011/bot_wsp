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
const HISTORIAL_PATH = path.join(DATA_PATH, 'historial.json');
const PAUSAS_PATH = path.join(DATA_PATH, 'pausas.json');
const ADMIN_NUMBERS_PATH = path.join(DATA_PATH, 'admin-numbers.json');
const PHONE_MAP_PATH = resolveRuntimePath(process.env.PHONE_MAP_PATH || path.join('config', 'phone-map.json'));

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

function getBotApiPort() {
  const agent = leerConfig();
  if (agent && agent.ports && agent.ports.api) {
    return agent.ports.api;
  }
  return 3011;
}

async function callBotApi(pathname, options = {}) {
  const botPort = getBotApiPort();
  const response = await fetch(`http://127.0.0.1:${botPort}${pathname}`, options);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Bot API error: ${err}`);
  }

  return response;
}

function leerHistorial() {
  try {
    if (fs.existsSync(HISTORIAL_PATH)) {
      return JSON.parse(fs.readFileSync(HISTORIAL_PATH, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error leyendo historial:', error);
    return {};
  }
}

function leerPausas() {
  try {
    if (fs.existsSync(PAUSAS_PATH)) {
      return JSON.parse(fs.readFileSync(PAUSAS_PATH, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error leyendo pausas:', error);
    return {};
  }
}

function obtenerChats() {
  const historial = leerHistorial();
  const pausas = leerPausas();
  const chats = [];

  for (const [userId, mensajes] of Object.entries(historial)) {
    if (!mensajes || mensajes.length === 0) continue;

    const ultimoMensaje = mensajes[mensajes.length - 1];
    const pausa = pausas[userId] || {};
    const pausado = pausa.pausado || false;
    
    let estado = 'bot'; // Por defecto, bot manejando
    if (pausado) {
      estado = pausa.razon === 'atendido_desde_dashboard' ? 'active_human' : 'waiting_human';
    }

    chats.push({
      userId,
      nombre: userId.split('@')[0],
      ultimoMensaje: (ultimoMensaje.text || ultimoMensaje.texto || ultimoMensaje.parts?.[0]?.text || '').substring(0, 50),
      timestamp: ultimoMensaje.timestamp || Date.now(),
      estado,
      mensajes: mensajes.length,
      noLeidos: pausado ? 1 : 0
    });
  }

  // Ordenar por más reciente
  chats.sort((a, b) => b.timestamp - a.timestamp);

  return chats;
}

// ============================================
// FUNCIONES ADMIN NUMBERS
// ============================================

function leerAdminNumbers() {
  try {
    if (fs.existsSync(ADMIN_NUMBERS_PATH)) {
      return JSON.parse(fs.readFileSync(ADMIN_NUMBERS_PATH, 'utf8'));
    }
  } catch (error) {
    console.error('Error leyendo admin-numbers:', error);
  }

  const envAdmins = getAdminNumbersFromEnv();
  if (envAdmins.length > 0) {
    return { admins: envAdmins };
  }

  const configAdmins = getAdminNumbersFromAgentConfig();
  if (configAdmins.length > 0) {
    return { admins: configAdmins };
  }

  return { admins: [] };
}

function getAdminNumbersFromEnv() {
  return (process.env.ADMIN_NUMBERS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(id => buildAdminNumberEntry(id, 'Migrado desde .env'));
}

function getAdminNumbersFromAgentConfig() {
  const agent = leerConfig();
  if (!agent?.adminNumbers || agent.adminNumbers.length === 0) return [];

  return agent.adminNumbers
    .map(id => String(id).trim())
    .filter(Boolean)
    .map(id => buildAdminNumberEntry(id, 'Default agents.json'));
}

function buildAdminNumberEntry(id, nombre) {
  return {
    id,
    nombre,
    rol: 'admin',
    agregadoPor: 'runtime-config',
    fechaAgregado: new Date().toISOString()
  };
}

function guardarAdminNumbers(data) {
  try {
    fs.writeFileSync(ADMIN_NUMBERS_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error guardando admin-numbers:', error);
    return false;
  }
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
    // Enviar via bot API (que tiene el cliente WhatsApp)
    await callBotApi(`/message/sendMessage/${AGENT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: userId, message })
    });

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
    await callBotApi(`/pause/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'atendido_desde_dashboard' })
    });

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
    await callBotApi(`/resume/${encodeURIComponent(userId)}`, {
      method: 'POST'
    });

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
    // Enviar "MUCHAS GRACIAS" via bot API
    await callBotApi(`/message/sendMessage/${AGENT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: userId, message: 'MUCHAS GRACIAS' })
    });

    await callBotApi(`/resume/${encodeURIComponent(userId)}`, {
      method: 'POST'
    });

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

app.get('/api/admin-numbers', authenticateToken, (req, res) => {
  const data = leerAdminNumbers();
  res.json(data.admins);
});

app.post('/api/admin-numbers', authenticateToken, requireAdminRole, (req, res) => {
  const { id, nombre, rol } = req.body;

  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Número inválido. Solo dígitos.' });
  }

  if (rol && !['admin', 'ignorado'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Use admin o ignorado.' });
  }

  const data = leerAdminNumbers();

  if (data.admins.some(a => a.id === id)) {
    return res.status(409).json({ error: 'El número ya existe' });
  }

  data.admins.push({
    id,
    nombre: nombre || 'Sin nombre',
    rol: rol || 'ignorado',
    agregadoPor: req.user.username,
    fechaAgregado: new Date().toISOString()
  });

  if (guardarAdminNumbers(data)) {
    res.json({ success: true, message: 'Número agregado correctamente' });
  } else {
    res.status(500).json({ error: 'Error guardando los datos' });
  }
});

app.put('/api/admin-numbers/:id', authenticateToken, requireAdminRole, (req, res) => {
  const { id } = req.params;
  const { nombre, rol } = req.body;

  if (rol && !['admin', 'ignorado'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Use admin o ignorado.' });
  }

  const data = leerAdminNumbers();
  const index = data.admins.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Número no encontrado' });
  }

  if (nombre) data.admins[index].nombre = nombre;
  if (rol) data.admins[index].rol = rol;

  if (guardarAdminNumbers(data)) {
    res.json({ success: true, message: 'Número actualizado correctamente' });
  } else {
    res.status(500).json({ error: 'Error guardando los datos' });
  }
});

app.delete('/api/admin-numbers/:id', authenticateToken, requireAdminRole, (req, res) => {
  const { id } = req.params;
  const data = leerAdminNumbers();
  const index = data.admins.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Número no encontrado' });
  }

  data.admins.splice(index, 1);

  if (guardarAdminNumbers(data)) {
    res.json({ success: true, message: 'Número eliminado correctamente' });
  } else {
    res.status(500).json({ error: 'Error guardando los datos' });
  }
});

// ============================================
// ENDPOINT INTERNO (notificaciones desde el bot)
// ============================================

app.post('/api/internal/new-message', (req, res) => {
  const { userId } = req.body;
  io.emit('new_message', { userId });
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
    if (fs.existsSync(PHONE_MAP_PATH)) {
      res.json(JSON.parse(fs.readFileSync(PHONE_MAP_PATH, 'utf8')));
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
