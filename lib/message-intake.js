const fs = require("fs");
const path = require("path");
const { isAudioTranscriptionEnabled, transcribeAudioMedia } = require("./audio-transcription");
const { resolveRuntimePath } = require("./runtime-paths");

const DEFAULT_DEBOUNCE_TIME_MS = 300;
const IGNORED_MESSAGE_TYPES = new Set(["revoked", "e2e_notification", "notification_template"]);

function createMessageIntake(options = {}) {
  const agentId = options.agentId;
  const configInfo = options.configInfo || {};
  const lastMessageTime = options.lastMessageTime || {};
  const debounceTimeMs = options.debounceTimeMs || DEFAULT_DEBOUNCE_TIME_MS;
  const logger = options.logger || (() => {});
  const now = options.now || Date.now;
  const env = options.env || process.env;
  const phoneMapPath = options.phoneMapPath
    ? resolveRuntimePath(options.phoneMapPath)
    : resolveRuntimePath(env.PHONE_MAP_PATH || path.join("config", "phone-map.json"));
  const audioTranscriptionEnabled = options.isAudioTranscriptionEnabled || isAudioTranscriptionEnabled;
  const transcribeAudio = options.transcribeAudioMedia || transcribeAudioMedia;

  async function processMessage(message, hooks = {}) {
    if (shouldIgnoreEnvelope(message)) {
      return { shouldProcess: false };
    }

    const userId = message.from;
    const text = await extractText(message, userId);
    if (text === null) {
      return { shouldProcess: false, userId };
    }

    if (!text) {
      logger(`[${agentId}] ⚠️ Mensaje vacío ignorado de ${userId}`);
      return { shouldProcess: false, userId };
    }

    if (hooks.shouldRejectText && await hooks.shouldRejectText({ message, userId, text })) {
      return { shouldProcess: false, userId };
    }

    await mapLidToPhone(message);

    if (isDebounced(userId)) {
      logger(`[${agentId}] ⏭️ Mensaje ignorado (debounce): ${userId}`);
      return { shouldProcess: false, userId };
    }

    lastMessageTime[userId] = now();

    return {
      shouldProcess: true,
      userId,
      text
    };
  }

  function shouldIgnoreEnvelope(message) {
    if (message.from.includes("@g.us")) return true;
    if (message.from === "status@broadcast" || message.isStatus) return true;
    return IGNORED_MESSAGE_TYPES.has(message.type);
  }

  async function extractText(message, userId) {
    let transcribedText = null;

    if (message.type === "ptt" || message.type === "audio") {
      if (!audioTranscriptionEnabled()) {
        await message.reply("⚠️ Por ahora no puedo escuchar audios. Por favor, escribí tu consulta por mensaje de texto.");
        return null;
      }

      try {
        await message.reply("🎙️ Recibí tu audio. Lo estoy transcribiendo para poder ayudarte.");
        const media = await message.downloadMedia();
        transcribedText = await transcribeAudio(media, agentId);
      } catch (error) {
        logger(`[${agentId}] ❌ Error transcribiendo audio de ${userId}: ${error.message}`, "ERROR");
        await message.reply("No pude transcribir el audio. Por favor, escribime tu consulta por mensaje de texto.");
        return null;
      }
    }

    if (await replyForUnsupportedMedia(message)) {
      return null;
    }

    return transcribedText || message.body.trim();
  }

  async function replyForUnsupportedMedia(message) {
    if (message.type === "image") {
      await message.reply("📷 Por ahora no proceso imágenes. Por favor, escribí tu consulta por mensaje de texto.");
      return true;
    }

    if (message.type === "video") {
      await message.reply("📹 Por ahora no proceso videos. Por favor, escribime tu consulta por mensaje de texto.");
      return true;
    }

    if (message.type === "document") {
      await message.reply("📄 Por ahora no proceso archivos. Por favor, escribime tu consulta por mensaje de texto.");
      return true;
    }

    if (message.type === "location") {
      const direccion = configInfo.direccion || "Sta. Ana 2637, Córdoba";
      await message.reply(`📍 Por ahora no proceso ubicaciones. Nuestra dirección es: ${direccion}. Escribime si necesitás más información.`);
      return true;
    }

    if (message.type === "sticker") {
      await message.reply("No puedo interpretar stickers. Escribime tu consulta en texto para poder ayudarte.");
      return true;
    }

    return false;
  }

  async function mapLidToPhone(message) {
    if (!message.from.includes("@lid") || message.author !== undefined) return;

    try {
      const contact = await message.getContact();
      if (!contact.number) return;

      let phoneMap = {};
      if (fs.existsSync(phoneMapPath)) {
        phoneMap = JSON.parse(fs.readFileSync(phoneMapPath, "utf8"));
      }

      const lidClean = message.from.replace(/@lid$/, "");
      if (!phoneMap[lidClean]) {
        phoneMap[lidClean] = contact.number;
        fs.writeFileSync(phoneMapPath, JSON.stringify(phoneMap, null, 2));
        logger(`[${agentId}] 📱 Mapeado: ${lidClean} → ${contact.number}`);
      }
    } catch (error) {
      // Phone-map enrichment is best-effort and must not block intake.
    }
  }

  function isDebounced(userId) {
    return lastMessageTime[userId] && (now() - lastMessageTime[userId]) < debounceTimeMs;
  }

  return {
    process: processMessage,
    shouldIgnoreEnvelope,
    extractText,
    replyForUnsupportedMedia,
    mapLidToPhone,
    isDebounced
  };
}

module.exports = {
  DEFAULT_DEBOUNCE_TIME_MS,
  IGNORED_MESSAGE_TYPES,
  createMessageIntake
};
