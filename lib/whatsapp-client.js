const { Client, LocalAuth } = require("whatsapp-web.js");

// ─── CLIENTE DE WHATSAPP SINGLETON ───────────────────────────────────────────

let client = null;

// Inicializar cliente con configuración mejorada y más estable
function initializeClient() {
  if (!client) {
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: "whatsapp-automation-demo",
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
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 60000,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      // Configuración adicional para estabilidad
      qrMaxRetries: 5,
      authTimeoutMs: 60000,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 60000
    });
  }
  return client;
}

// Obtener cliente (para uso en módulos)
function getClient() {
  if (!client) {
    throw new Error("Cliente de WhatsApp no inicializado. Llamar initializeClient() primero.");
  }
  return client;
}

module.exports = {
  initializeClient,
  getClient
};
