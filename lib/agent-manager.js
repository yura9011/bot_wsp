const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");

// ─── MÓDULOS INTERNOS ────────────────────────────────────────────────────────
const { log } = require("./logging");
const { inicializarModelo, generarRespuestaLLM } = require("./llm");
const { detectarHijacking, logearIntentoHijacking, RESPUESTAS_ANTI_HIJACKING } = require("./security");
const { contieneTemaProhibido, contieneInsulto } = require("./moderation");
const { createControlManager } = require("./control-manual");
const { createAdminCommands } = require("./admin-commands");
const { createStatisticsManager } = require("./statistics");
const { isAudioTranscriptionEnabled, transcribeAudioMedia } = require("./audio-transcription");

// ─── MÓDULOS DE DATOS ────────────────────────────────────────────────────────
const {
  ESTADOS,
  getMensajeBienvenida,
  getMenuPrincipal,
  getMenuPaqueteria,
  getMenuCorreoArgentino,
  getInfoCorreoArgentinoRetirar,
  getInfoCorreoArgentinoEnviar,
  getInfoAndreani,
  getInfoMercadoLibre,
  getMensajePedirNombre,
  getMensajeNoEntiendo,
  getMensajeDemoInicial,
  getMensajeDemoRespuesta,
  getMensajeDemoFinalizado,
} = require("../flujos.js");

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 500;
const DEBOUNCE_TIME_MS = 300;

class AgentManager {
  constructor(agentConfig) {
    this.id = agentConfig.id;
    this.name = agentConfig.name;
    this.config = agentConfig;
    this.client = null;
    this.api = null;
    this.isRunning = false;
    this.whatsappStatus = {
      status: "initializing",
      detail: "Cliente no inicializado",
      updatedAt: null
    };
    this.model = null;
    this.catalogo = null;
    
    // Estado del agente
    this.conversaciones = {};
    this.lastMessageTime = {};
    this.estadosUsuario = {};
    this.datosUsuario = {};
    
    // Crear directorios si no existen
    this.ensureDirectories();
    
    // Crear gestor de estadísticas para este agente
    const statsPath = this.getDataPath("estadisticas.json");
    this.statsManager = createStatisticsManager(statsPath);
    
    // Crear gestor de control (pausas/historial) aislado para este agente
    const dataDirPath = path.join(process.cwd(), this.config.paths.data);
    this.controlManager = createControlManager(dataDirPath);

    // Crear gestor de comandos admin aislado para este agente
    this.adminCommands = createAdminCommands(this.config, this.controlManager);
    
    // Cargar catálogo específico del agente
    this.loadCatalog();
  }

  ensureDirectories() {
    const dirs = [
      this.config.paths.data,
      this.config.paths.logs
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadCatalog() {
    try {
      const catalogPath = path.join(process.cwd(), this.config.paths.catalog);
      if (fs.existsSync(catalogPath)) {
        this.catalogo = require(catalogPath);
        log(`[${this.id}] Catálogo cargado: ${catalogPath}`);
      } else {
        log(`[${this.id}] ⚠️ Catálogo no encontrado: ${catalogPath}`, "WARN");
      }
    } catch (error) {
      log(`[${this.id}] ❌ Error cargando catálogo: ${error.message}`, "ERROR");
    }
  }

  getDataPath(filename) {
    return path.join(this.config.paths.data, filename);
  }

  getLogPath(filename) {
    return path.join(this.config.paths.logs, filename);
  }

  updateWhatsAppStatus(status, detail = null) {
    this.whatsappStatus = {
      status,
      detail,
      updatedAt: new Date().toISOString()
    };
  }

  async responderBot(message, texto) {
    const respuesta = await message.reply(texto);
    this.statsManager.registrarMensaje(message.from, "enviado").catch(error => {
      log(`[${this.id}] ⚠️ Error registrando mensaje enviado: ${error.message}`, "WARN");
    });
    this.controlManager.guardarEnHistorial(message.from, "bot", texto);
    this.notificarDashboard(message.from);
    return respuesta;
  }

  notificarDashboard(userId) {
    const port = this.config.ports.dashboard;
    const data = JSON.stringify({ userId, event: 'new_message' });
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: '/api/internal/new-message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options);
    req.on('error', () => {});
    req.write(data);
    req.end();
  }

  _createClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.config.whatsappSession,
        dataPath: "./.wwebjs_auth"
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        timeout: 60000
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    this.client.on("qr", (qr) => {
      this.updateWhatsAppStatus("qr", "Esperando escaneo de QR");
      log(`[${this.id}] QR Code generado`);
      console.log(`\n===== QR para ${this.name} =====`);
      qrcode.generate(qr, { small: true });
    });

    this.client.on("ready", () => {
      log(`[${this.id}] Bot conectado y listo`);
      this.isRunning = true;
      this.updateWhatsAppStatus("connected", "WhatsApp listo");
      
      if (this.catalogo && this.catalogo.obtenerEstadisticasCatalogo) {
        const stats = this.catalogo.obtenerEstadisticasCatalogo();
        log(`[${this.id}] 📦 Catálogo: ${stats.totalProductos} productos en ${stats.totalCategorias} categorías`);
      }
      
      this.controlManager.cargarEstadoPausas();
    });

    this.client.on("authenticated", () => {
      this.updateWhatsAppStatus("authenticated", "Autenticación exitosa");
      log(`[${this.id}] Autenticación exitosa`);
    });

    this.client.on("auth_failure", (msg) => {
      this.updateWhatsAppStatus("auth_failure", msg || "Error de autenticación");
      log(`[${this.id}] Error de autenticación: ${msg}`, "ERROR");
    });

    this.client.on("disconnected", (reason) => {
      log(`[${this.id}] ⚠️ Bot desconectado: ${reason}`, "WARN");
      this.isRunning = false;
      this.updateWhatsAppStatus("disconnected", reason || "Desconectado");
    });

    this.setupMessageHandlers();
  }

  async initializeWhatsApp() {
    this._createClient();
    this.updateWhatsAppStatus("initializing", "Inicializando cliente WhatsApp");

    try {
      await this.client.initialize();
    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      const isBrowserConflict = (
        msg.includes('browser already running') ||
        msg.includes('browser is already running') ||
        msg.includes('target closed') ||
        msg.includes('eaddrInuse')
      );

      if (isBrowserConflict) {
        log(`[${this.id}] ⚠️ Browser conflict: ${error.message}. Matando Chrome huérfano y reintentando...`, "WARN");
        killOrphanChrome(this.config.whatsappSession);
        await new Promise(r => setTimeout(r, 2000));

        this._createClient();
        this.updateWhatsAppStatus("initializing", "Reintentando inicialización de WhatsApp");
        await this.client.initialize();
        log(`[${this.id}] ✅ Reintento exitoso después de matar Chrome huérfano`);
      } else {
        throw error;
      }
    }
  }

  setupMessageHandlers() {
    // Detección de finalización manual
    this.client.on("message_create", async (message) => {
      if (!message.fromMe) return;
      if (message.to.includes("@g.us")) return;
      
      const tiposIgnorados = ["revoked", "e2e_notification", "notification_template"];
      if (tiposIgnorados.includes(message.type)) return;
      
      const clienteId = message.to;
      const textoMensaje = message.body.trim();
      
      if (textoMensaje.toUpperCase() === "MUCHAS GRACIAS") {
        if (this.controlManager.estaUsuarioPausado(clienteId)) {
          log(`[${this.id}] 🎯 Finalización detectada: Personal escribió "MUCHAS GRACIAS" a ${clienteId}`);
          
          const mensajeDespedida = "¡Muchas gracias por contactarnos! 😊\n\n" +
            "Esperamos haberte ayudado. Si necesitás algo más, no dudes en escribirnos.\n\n" +
            "¡Que tengas un excelente día! 🎈";
          
          try {
            await this.client.sendMessage(clienteId, mensajeDespedida);
            log(`[${this.id}] 📤 Mensaje de despedida enviado a ${clienteId}`);
          } catch (error) {
            log(`[${this.id}] ❌ Error enviando despedida: ${error.message}`, "ERROR");
          }
          
          this.controlManager.reanudarUsuario(clienteId);
          log(`[${this.id}] ✅ Conversación finalizada con ${clienteId.replace(/@(c\.us|lid)$/, "")}`);
        }
      }
    });

    // Procesamiento de mensajes entrantes
    this.client.on("message", async (message) => {
      await this.handleIncomingMessage(message);
    });
  }

  async handleIncomingMessage(message) {
    // Ignorar mensajes de grupos
    if (message.from.includes("@g.us")) return;

    // Ignorar estados de WhatsApp
    if (message.from === 'status@broadcast' || message.isStatus) return;

    // Ignorar mensajes de estado y notificaciones
    const tiposIgnorados = ["revoked", "e2e_notification", "notification_template"];
    if (tiposIgnorados.includes(message.type)) return;

    const userId = message.from;

    // Comandos administrativos / usuarios ignorados
    const rol = this.adminCommands.getRolAdmin(userId);
    const esAdmin = this.adminCommands.esAdmin(userId);
    if (rol === 'ignorado') {
      log(`[${this.id}] 🚫 Mensaje de usuario ignorado: ${userId}`);
      return;
    }

    // Verificar pausa global y pausa por usuario antes de responder texto o media
    if (this.controlManager.getPausaGlobal()) {
      log(`[${this.id}] ⏸️ Bot pausado globalmente - Mensaje ignorado de ${userId}`);
      return;
    }

    if (this.controlManager.estaUsuarioPausado(userId)) {
      log(`[${this.id}] ⏸️ Usuario ${userId} en atención manual - Bot no responde`);
      return;
    }

    let textoTranscripto = null;
    if (message.type === "ptt" || message.type === "audio") {
      if (!isAudioTranscriptionEnabled()) {
        await message.reply("⚠️ Por ahora no puedo escuchar audios. Por favor, escribí tu consulta por mensaje de texto.");
        return;
      }

      try {
        await message.reply("🎙️ Recibí tu audio. Lo estoy transcribiendo para poder ayudarte.");
        const media = await message.downloadMedia();
        textoTranscripto = await transcribeAudioMedia(media, this.id);
      } catch (error) {
        log(`[${this.id}] ❌ Error transcribiendo audio de ${userId}: ${error.message}`, "ERROR");
        await message.reply("No pude transcribir el audio. Por favor, escribime tu consulta por mensaje de texto.");
        return;
      }
    }

    // Respuesta explícita por tipo de media no soportada
    if (message.type === "image") {
      await message.reply("📷 Por ahora no proceso imágenes. Por favor, escribí tu consulta por mensaje de texto.");
      return;
    }

    if (message.type === "video") {
      await message.reply("📹 Por ahora no proceso videos. Por favor, escribime tu consulta por mensaje de texto.");
      return;
    }

    if (message.type === "document") {
      await message.reply("📄 Por ahora no proceso archivos. Por favor, escribime tu consulta por mensaje de texto.");
      return;
    }

    if (message.type === "location") {
      const direccion = this.config.info?.direccion || "Sta. Ana 2637, Córdoba";
      await message.reply(`📍 Por ahora no proceso ubicaciones. Nuestra dirección es: ${direccion}. Escribime si necesitás más información.`);
      return;
    }

    if (message.type === "sticker") {
      await message.reply("No puedo interpretar stickers. Escribime tu consulta en texto para poder ayudarte.");
      return;
    }

    const texto = textoTranscripto || message.body.trim();

    // Mensaje vacío — no procesar
    if (!texto) {
      log(`[${this.id}] ⚠️ Mensaje vacío ignorado de ${userId}`);
      return;
    }

    // Detectar mensajes con solo emojis/símbolos en estados de menú
    const estadosMenu = [ESTADOS.MENU_PRINCIPAL, ESTADOS.MENU_PAQUETERIA, ESTADOS.MENU_CORREO_ARGENTINO,
      ESTADOS.INFO_CORREO_RETIRAR, ESTADOS.INFO_CORREO_ENVIAR, ESTADOS.INFO_ANDREANI, ESTADOS.INFO_MERCADOLIBRE];
    if (this.estadosUsuario[userId] && estadosMenu.includes(this.estadosUsuario[userId])) {
      if (!/[a-zA-Z0-9áéíóúñü]/u.test(texto)) {
        await message.reply("Por favor, elegí una opción del menú usando el número correspondiente (1, 2, 3...).");
        return;
      }
    }

    // Guardar mapeo lid → teléfono para resolución de IDs
    if (message.from.includes('@lid') && message.author === undefined) {
      try {
        const contact = await message.getContact();
        if (contact.number) {
          const phoneMapPath = path.join(process.cwd(), 'config', 'phone-map.json');
          let phoneMap = {};
          if (fs.existsSync(phoneMapPath)) {
            phoneMap = JSON.parse(fs.readFileSync(phoneMapPath, 'utf8'));
          }
          const lidClean = message.from.replace(/@lid$/, '');
          if (!phoneMap[lidClean]) {
            phoneMap[lidClean] = contact.number;
            fs.writeFileSync(phoneMapPath, JSON.stringify(phoneMap, null, 2));
            log(`[${this.id}] 📱 Mapeado: ${lidClean} → ${contact.number}`);
          }
        }
      } catch(e) { /* silencioso */ }
    }

    // Control de debounce (anti-spam)
    const ahora = Date.now();
    if (this.lastMessageTime[userId] && (ahora - this.lastMessageTime[userId]) < DEBOUNCE_TIME_MS) {
      log(`[${this.id}] ⏭️ Mensaje ignorado (debounce): ${userId}`);
      return;
    }
    this.lastMessageTime[userId] = ahora;

    log(`[${this.id}] 📩 [${userId}]: ${texto}`);
    
    // Registrar mensaje en estadísticas
    this.statsManager.registrarMensaje(userId, "recibido").catch(error => {
      log(`[${this.id}] ⚠️ Error registrando mensaje: ${error.message}`, "WARN");
    });
    
    // Guardar mensaje del usuario en historial
    this.controlManager.guardarEnHistorial(userId, "user", texto);
    this.notificarDashboard(userId);

    if (esAdmin) {
      log(`[${this.id}] 🔐 Comando admin detectado de ${userId}`);
      const esComando = await this.adminCommands.procesarComandoAdmin(message, texto, this.estadosUsuario);
      if (esComando) return;
      log(`[${this.id}] 🚫 Mensaje de admin ignorado (no es comando): ${userId}`);
      return;
    }

    log(`[${this.id}] ✅ Procesando mensaje de ${userId}: "${texto}"`);

    if (this.id === "demo-local") {
      await this.handleDemoFlow(message, userId);
      return;
    }

    // Primera interacción
    if (!this.estadosUsuario[userId]) {
      this.estadosUsuario[userId] = ESTADOS.INICIAL;
      await this.responderBot(message, getMensajeBienvenida(null, this.config.info));
      await this.responderBot(message, getMensajePedirNombre());
      this.estadosUsuario[userId] = ESTADOS.ESPERANDO_NOMBRE;
      log(`[${this.id}] 👋 Nuevo usuario: ${userId} - Enviando bienvenida`);
      return;
    }

    // Esperando nombre
    if (this.estadosUsuario[userId] === ESTADOS.ESPERANDO_NOMBRE) {
      let nombre = texto;
      
      const patronNombre = /(?:mi nombre es|me llamo|soy|claro,?\s*mi nombre es)\s+([a-záéíóúñ]+)/i;
      const match = texto.match(patronNombre);
      if (match) {
        nombre = match[1];
      } else {
        const palabras = texto.split(' ');
        for (const palabra of palabras) {
          if (palabra.length >= 2 && /^[a-záéíóúñ]+$/i.test(palabra)) {
            nombre = palabra;
            break;
          }
        }
      }
      
      nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
      
      this.datosUsuario[userId] = { nombre: nombre };
      await this.responderBot(message, `Encantado de conocerte, ${nombre}! 😊`);
      await this.responderBot(message, getMenuPrincipal());
      this.estadosUsuario[userId] = ESTADOS.MENU_PRINCIPAL;
      log(`[${this.id}] ✅ Usuario ${userId} registrado como: ${nombre}`);
      return;
    }

    // Volver al menú principal (opción 0)
    if (texto === "0") {
      await this.responderBot(message, getMenuPrincipal());
      this.estadosUsuario[userId] = ESTADOS.MENU_PRINCIPAL;
      return;
    }

    // Menú principal
    if (this.estadosUsuario[userId] === ESTADOS.MENU_PRINCIPAL) {
      if (texto === "1") {
        this.estadosUsuario[userId] = ESTADOS.PEDIDO;
        await this.responderBot(message, "Perfecto! ¿Qué productos necesitás para tu pedido? También podés consultarme sobre nuestro catálogo de globos y decoración.");
        log(`[${this.id}] 🛒 Usuario ${userId} inició pedido`);
        return;
      }
      
      if (texto === "2") {
        await this.responderBot(message, getMenuPaqueteria());
        this.estadosUsuario[userId] = ESTADOS.MENU_PAQUETERIA;
        return;
      }
      
      await this.responderBot(message, getMensajeNoEntiendo());
      await this.responderBot(message, getMenuPrincipal());
      return;
    }

    // Menú paquetería
    if (this.estadosUsuario[userId] === ESTADOS.MENU_PAQUETERIA) {
      if (texto === "1") {
        await this.responderBot(message, getMenuCorreoArgentino());
        this.estadosUsuario[userId] = ESTADOS.MENU_CORREO_ARGENTINO;
        return;
      }
      
      if (texto === "2") {
        await this.responderBot(message, getInfoAndreani());
        this.estadosUsuario[userId] = ESTADOS.INFO_ANDREANI;
        return;
      }
      
      if (texto === "3") {
        await this.responderBot(message, getInfoMercadoLibre());
        this.estadosUsuario[userId] = ESTADOS.INFO_MERCADOLIBRE;
        return;
      }
      
      await this.responderBot(message, getMensajeNoEntiendo());
      await this.responderBot(message, getMenuPaqueteria());
      return;
    }

    // Submenú Correo Argentino
    if (this.estadosUsuario[userId] === ESTADOS.MENU_CORREO_ARGENTINO) {
      if (texto === "1") {
        await this.responderBot(message, getInfoCorreoArgentinoRetirar());
        this.estadosUsuario[userId] = ESTADOS.INFO_CORREO_RETIRAR;
        return;
      }
      
      if (texto === "2") {
        await this.responderBot(message, getInfoCorreoArgentinoEnviar());
        this.estadosUsuario[userId] = ESTADOS.INFO_CORREO_ENVIAR;
        return;
      }
      
      if (texto === "0") {
        await this.responderBot(message, getMenuPaqueteria());
        this.estadosUsuario[userId] = ESTADOS.MENU_PAQUETERIA;
        return;
      }
      
      await this.responderBot(message, getMensajeNoEntiendo());
      await this.responderBot(message, getMenuCorreoArgentino());
      return;
    }

    // Viendo info de paquetería
    if (this.estadosUsuario[userId] === ESTADOS.INFO_CORREO_RETIRAR ||
        this.estadosUsuario[userId] === ESTADOS.INFO_CORREO_ENVIAR ||
        this.estadosUsuario[userId] === ESTADOS.INFO_ANDREANI || 
        this.estadosUsuario[userId] === ESTADOS.INFO_MERCADOLIBRE) {
      if (texto === "0") {
        await this.responderBot(message, getMenuPrincipal());
        this.estadosUsuario[userId] = ESTADOS.MENU_PRINCIPAL;
        return;
      }
      
      await this.responderBot(message, "¿Querés consultar otro servicio de envío?");
      await this.responderBot(message, getMenuPaqueteria());
      this.estadosUsuario[userId] = ESTADOS.MENU_PAQUETERIA;
      return;
    }

    // Flujo de pedido
    if (this.estadosUsuario[userId] === ESTADOS.PEDIDO) {
      await this.handlePedidoFlow(message, texto, userId);
      return;
    }

    // Cualquier otro estado
    await this.responderBot(message, getMenuPrincipal());
    this.estadosUsuario[userId] = ESTADOS.MENU_PRINCIPAL;
  }

  async handleDemoFlow(message, userId) {
    if (!this.estadosUsuario[userId]) {
      await this.responderBot(message, getMensajeDemoInicial());
      this.estadosUsuario[userId] = ESTADOS.DEMO_ESPERANDO_CONSULTA;
      log(`[${this.id}] 👋 Demo iniciada para ${userId}`);
      return;
    }

    if (this.estadosUsuario[userId] === ESTADOS.DEMO_ESPERANDO_CONSULTA) {
      await this.responderBot(message, getMensajeDemoRespuesta());
      this.estadosUsuario[userId] = ESTADOS.DEMO_FINALIZADO;
      log(`[${this.id}] ✅ Demo finalizada para ${userId}`);
      return;
    }

    await this.responderBot(message, getMensajeDemoFinalizado());
  }

  async handlePedidoFlow(message, texto, userId) {
    // Verificación anti-hijacking
    const tipoAtaque = detectarHijacking(texto);
    if (tipoAtaque) {
      logearIntentoHijacking(userId, texto, tipoAtaque);
      this.statsManager.registrarHijacking(userId, tipoAtaque).catch(error => {
        log(`[${this.id}] ⚠️ Error registrando hijacking: ${error.message}`, "WARN");
      });
      await this.responderBot(message, RESPUESTAS_ANTI_HIJACKING[tipoAtaque]);
      return;
    }

    // Validar longitud del mensaje
    if (texto.length > MAX_MESSAGE_LENGTH) {
      log(`[${this.id}] ⚠️ Mensaje muy largo: ${userId} (${texto.length} caracteres)`);
      await this.responderBot(message,
        `Tu mensaje es muy largo (${texto.length} caracteres). Por favor, enviá un mensaje de máximo ${MAX_MESSAGE_LENGTH} caracteres.`
      );
      return;
    }

    // Moderación de contenido
    const temaProhibido = contieneTemaProhibido(texto);
    if (temaProhibido) {
      log(`[${this.id}] 🚫 Tema prohibido bloqueado: "${temaProhibido}" de ${userId}`, "WARN");
      await this.responderBot(message,
        "Disculpá, solo puedo ayudarte con temas de la tienda. ¿Te puedo ayudar con algo más sobre productos o pedidos?"
      );
      return;
    }

    const insulto = contieneInsulto(texto);
    if (insulto) {
      log(`[${this.id}] ⚠️ Lenguaje ofensivo detectado: "${insulto}" de ${userId}`, "WARN");
    }

    // Detección de handoff
    const textoLower = texto.toLowerCase();
    if (textoLower.includes("humano") || 
        textoLower.includes("encargado") || 
        textoLower.includes("operador") ||
        textoLower.includes("persona") ||
        textoLower.includes("alguien") ||
        textoLower.includes("agente")) {
      this.controlManager.pausarUsuario(userId, "handoff_solicitado");
      
      this.statsManager.registrarHandoff(userId, "handoff_solicitado").catch(error => {
        log(`[${this.id}] ⚠️ Error registrando handoff: ${error.message}`, "WARN");
      });
      
      await this.responderBot(message,
        "Entendido 👋 Un agente se va a comunicar con vos a la brevedad. ¡Gracias por tu paciencia!"
      );
      
      log(`[${this.id}] 🚨 HANDOFF solicitado por ${userId}`);
      return;
    }

    // Historial de conversación
    if (!this.conversaciones[userId]) {
      this.conversaciones[userId] = [];
    }

    this.conversaciones[userId].push({
      role: "user",
      parts: [{ text: texto }],
    });

    if (this.conversaciones[userId].length > 10) {
      this.conversaciones[userId] = this.conversaciones[userId].slice(-10);
    }

    // Búsqueda en catálogo (RAG)
    log(`[${this.id}] 🔍 Buscando productos: "${texto}"`);

    let productosEncontrados = [];
    let contextoProductos = "";
    
    if (this.catalogo && this.catalogo.buscarProductos) {
      try {
        productosEncontrados = this.catalogo.buscarProductos(texto, 5);
        log(`[${this.id}] 📦 Productos encontrados: ${productosEncontrados.length}`);
        
        this.statsManager.registrarBusqueda(texto, productosEncontrados.length).catch(error => {
          log(`[${this.id}] ⚠️ Error registrando búsqueda: ${error.message}`, "WARN");
        });
        
        if (productosEncontrados.length > 0 && this.catalogo.formatearProductosParaContexto) {
          contextoProductos = this.catalogo.formatearProductosParaContexto(productosEncontrados);
        }
      } catch (error) {
        log(`[${this.id}] ⚠️ Error buscando productos: ${error.message}`, "WARN");
        this.statsManager.registrarBusqueda(texto, 0).catch(error => {
          log(`[${this.id}] ⚠️ Error registrando búsqueda fallida: ${error.message}`, "WARN");
        });
      }
    }

    // Llamada al LLM
    try {
      if (!this.model) {
        this.model = inicializarModelo();
      }

      let mensajeConContexto = texto;
      if (contextoProductos) {
        mensajeConContexto = `${contextoProductos}\n\n---\n\nPregunta del cliente: ${texto}\n\nInstrucciones especiales:\n1. Si el cliente usa lenguaje coloquial como "cositos", "flecos", "para colgar", INTERPRETÁ qué está buscando\n2. Los productos listados arriba son los más relevantes para su consulta\n3. Si no hay productos exactos, SUGERÍ productos similares o relacionados\n4. PREGUNTÁ para clarificar si es necesario (colores, ocasión, tamaño)\n5. Sé conversacional y ayudá al cliente a encontrar lo que necesita`;
      } else {
        mensajeConContexto = `Pregunta del cliente: ${texto}\n\nNo se encontraron productos específicos para esta consulta, pero:\n1. INTERPRETÁ qué podría estar buscando el cliente\n2. SUGERÍ categorías de productos que podrían interesarle\n3. PREGUNTÁ para clarificar qué necesita exactamente\n4. Mencioná que tenés amplio catálogo de cotillón y decoración`;
      }

      const respuesta = await generarRespuestaLLM(this.conversaciones[userId].slice(0, -1), mensajeConContexto);

      this.conversaciones[userId].push({
        role: "model",
        parts: [{ text: respuesta }],
      });

      log(`[${this.id}] 🤖 Bot: ${respuesta}`);
      await this.responderBot(message, respuesta);
      
      await this.responderBot(message, "\n¿Necesitás algo más? Respondé *0* para volver al menú principal.");
      
    } catch (error) {
      log(`[${this.id}] ❌ Error después de reintentos: ${error.message}`, "ERROR");
      await this.responderBot(message,
        "Ups, tuve un problema técnico. Por favor intentá de nuevo en un momento."
      );
    }
  }

  initializeAPI() {
    this.api = express();
    this.api.use(express.json());

    // Endpoint de status
    this.api.get("/status", (req, res) => {
      res.json({
        agentId: this.id,
        name: this.name,
        isRunning: this.isRunning,
        whatsapp: this.whatsappStatus,
        globalPausado: this.controlManager.getPausaGlobal(),
        usuariosPausados: Object.keys(this.controlManager.getUsuariosPausados()).length,
        timestamp: Date.now()
      });
    });

    // Endpoint de stats
    this.api.get("/stats", async (req, res) => {
      try {
        const stats = await this.statsManager.leerEstadisticas();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint de usuarios pausados
    this.api.get("/paused", (req, res) => {
      try {
        const pausados = this.controlManager.getUsuariosPausados();
        res.json(pausados);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoints de control
    this.api.post("/pause/:userId", (req, res) => {
      const userId = req.params.userId;
      if (!userId.includes("@")) {
        return res.status(400).json({ success: false, error: "userId inválido" });
      }
      const reason = req.body?.reason || "pausado_por_api";
      this.controlManager.pausarUsuario(userId, reason);
      res.json({ success: true, message: `Usuario ${userId} pausado` });
    });

    this.api.post("/resume/:userId", (req, res) => {
      const userId = req.params.userId;
      if (!userId.includes("@")) {
        return res.status(400).json({ success: false, error: "userId inválido" });
      }
      const resultado = this.controlManager.reanudarUsuario(userId);
      res.json({ success: resultado, message: resultado ? "Reanudado" : "No estaba pausado" });
    });

    this.api.post("/pause-global", (req, res) => {
      this.controlManager.setPausaGlobal(true);
      res.json({ success: true, message: "Bot pausado globalmente" });
    });

    this.api.post("/resume-global", (req, res) => {
      this.controlManager.setPausaGlobal(false);
      res.json({ success: true, message: "Bot reanudado globalmente" });
    });

    // --- NUEVOS ENDPOINTS PARA PANEL HUMANO ---

    // Enviar mensaje como humano (usado por dashboard-central)
    this.api.post("/message/sendMessage/:sessionId", async (req, res) => {
      const { chatId, message } = req.body;
      if (!chatId || !message) {
        return res.status(400).json({ error: "Faltan datos" });
      }

      try {
        log(`[${this.id}] 🧑‍💼 Enviando mensaje humano a ${chatId}: "${message}"`);
        await this.client.sendMessage(chatId, message);
        
        // Registrar en historial como humano
        this.controlManager.guardarEnHistorial(chatId, "human", message);
        
        res.json({ success: true });
      } catch (error) {
        log(`[${this.id}] ❌ Error enviando mensaje humano: ${error.message}`, "ERROR");
        res.status(500).json({ error: error.message });
      }
    });

    // Obtener mensajes recientes de un chat específico
    this.api.post("/chat/fetchMessages/:sessionId", async (req, res) => {
      const { chatId, limit = 50 } = req.body;
      if (!chatId) {
        return res.status(400).json({ error: "Falta chatId" });
      }

      try {
        const chat = await this.client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit });
        
        // Formatear para que coincida con lo esperado por el panel
        const formatted = messages.map(m => ({
          body: m.body,
          from: m.from,
          fromMe: m.fromMe,
          timestamp: m.timestamp * 1000,
          type: m.type
        }));
        
        res.json(formatted);
      } catch (error) {
        log(`[${this.id}] ❌ Error obteniendo mensajes: ${error.message}`, "ERROR");
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint de conversaciones
    this.api.get("/conversations", (req, res) => {
      try {
        const historialPath = this.getDataPath("historial.json");
        if (fs.existsSync(historialPath)) {
          const historial = JSON.parse(fs.readFileSync(historialPath, "utf8"));
          const conversaciones = [];
          const resumenPorNumero = {};
          const limit = parseInt(req.query.limit) || 0; // 0 = sin límite
          
          for (const [userId, mensajes] of Object.entries(historial)) {
            if (mensajes && mensajes.length > 0) {
              const numeroLimpio = userId.replace(/@.*/, '').replace(/^54/, '+54 ');
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
                type: msg.role === 'user' ? 'user' : 
                      msg.role === 'human' ? 'human' : 'bot',
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
          
          res.json({
            conversaciones: sorted,
            resumenPorNumero: resumen
          });
        } else {
          res.json({ conversaciones: [], resumenPorNumero: [] });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint de logs
    this.api.get("/logs", (req, res) => {
      try {
        const lineas = parseInt(req.query.lines) || 50;
        const logPath = this.getLogPath("bot.log");
        
        if (fs.existsSync(logPath)) {
          const data = fs.readFileSync(logPath, "utf8");
          const logs = data.split('\n').filter(l => l.trim()).slice(-lineas).map(log => ({
            timestamp: log.match(/\[(.+?)\]/)?.[1] || 'Unknown',
            message: log
          }));
          res.json(logs);
        } else {
          res.json([]);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint de seguridad
    this.api.get("/security", (req, res) => {
      try {
        const lineas = parseInt(req.query.lines) || 20;
        const logPath = this.getLogPath("security.log");
        
        if (fs.existsSync(logPath)) {
          const data = fs.readFileSync(logPath, "utf8");
          const logs = data.split('\n').filter(l => l.trim()).slice(-lineas).map(log => {
            const match = log.match(/\[(.+?)\].*Usuario: (.+?) - Tipo: (.+?) - Mensaje: "(.+?)"/);
            if (match) {
              const [, timestamp, userId, tipo, mensaje] = match;
              return {
                timestamp,
                userId: userId.replace(/@(c\.us|lid)$/, ''),
                tipo,
                mensaje: mensaje.substring(0, 50) + (mensaje.length > 50 ? '...' : '')
              };
            }
            return { timestamp: 'Unknown', userId: 'Unknown', tipo: 'Unknown', mensaje: log };
          });
          res.json(logs);
        } else {
          res.json([]);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.api.listen(this.config.ports.api, () => {
      log(`[${this.id}] 🔌 API iniciada en puerto ${this.config.ports.api}`);
    });
  }

  async start() {
    log(`[${this.id}] Iniciando agente ${this.name}...`);
    await this.statsManager.inicializar().catch(error => {
      log(`[${this.id}] ⚠️ Error inicializando estadísticas: ${error.message}`, "WARN");
    });
    this._setupSignalHandlers();
    await this.initializeWhatsApp();
    this.initializeAPI();
    log(`[${this.id}] Agente iniciado correctamente`);
  }

  async stop() {
    log(`[${this.id}] Deteniendo agente...`);
    if (this.client) {
      await this.client.destroy();
    }
    this.isRunning = false;
    log(`[${this.id}] Agente detenido`);
  }

  _setupSignalHandlers() {
    const handleShutdown = async (signal) => {
      log(`[${this.id}] 📥 Recibido ${signal} - Cerrando gracefulmente...`);
      if (this.client) {
        try {
          await this.client.destroy();
        } catch (e) {
          log(`[${this.id}] ⚠️ Error destruyendo cliente: ${e.message}`, "WARN");
        }
      }
      killOrphanChrome(this.config.whatsappSession);
      process.exit(0);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      isRunning: this.isRunning,
      whatsapp: this.whatsappStatus,
      config: this.config
    };
  }
}

// ─── KILL ORPHAN CHROME ──────────────────────────────────────────────────────────

function killOrphanChrome(sessionName) {
  try {
    const killCmd = sessionName
      ? `pkill -f "${sessionName}" 2>/dev/null; pkill -f ".local-chromium" 2>/dev/null`
      : 'pkill -f ".local-chromium" 2>/dev/null';
    execSync(killCmd, { stdio: 'ignore' });
  } catch (e) {
    // ignore
  }
}

module.exports = AgentManager;
