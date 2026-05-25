require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// Solo las importaciones básicas para debug
const { log } = require("./lib/logging");
const { initializeClient } = require("./lib/whatsapp-client");

console.log("🔍 INICIANDO BOT EN MODO DEBUG");

const client = initializeClient();

client.on("qr", (qr) => {
  log("\n📱 Escanea este QR con tu WhatsApp:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  log("✅ Bot conectado y listo en modo DEBUG!");
});

client.on("message", async (message) => {
  console.log("\n🔍 MENSAJE RECIBIDO:");
  console.log("From:", message.from);
  console.log("Type:", message.type);
  console.log("Body:", message.body);
  console.log("IsGroup:", message.from.includes("@g.us"));
  console.log("IsStatus:", message.isStatus);
  console.log("IsFromMe:", message.fromMe);
  
  // Responder a cualquier mensaje de texto
  if (message.type === "chat" && !message.fromMe && !message.from.includes("@g.us")) {
    try {
      await message.reply("🔍 DEBUG: Bot funcionando correctamente. Mensaje recibido: " + message.body);
      console.log("✅ Respuesta enviada");
    } catch (error) {
      console.log("❌ Error enviando respuesta:", error.message);
    }
  }
});

client.initialize();