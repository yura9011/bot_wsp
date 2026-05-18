const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { log } = require("./logging");

const MAX_AUDIO_BYTES = Number(process.env.AUDIO_TRANSCRIPTION_MAX_BYTES || 8 * 1024 * 1024);
const TIMEOUT_MS = Number(process.env.AUDIO_TRANSCRIPTION_TIMEOUT_MS || 45000);

function isAudioTranscriptionEnabled() {
  return process.env.ENABLE_AUDIO_TRANSCRIPTION === "true" &&
    process.env.AUDIO_TRANSCRIPTION_PROVIDER === "local" &&
    Boolean(process.env.AUDIO_TRANSCRIPTION_COMMAND);
}

function getAudioExtension(mimetype = "") {
  if (mimetype.includes("ogg")) return "ogg";
  if (mimetype.includes("mpeg") || mimetype.includes("mp3")) return "mp3";
  if (mimetype.includes("mp4")) return "mp4";
  if (mimetype.includes("m4a")) return "m4a";
  if (mimetype.includes("wav")) return "wav";
  if (mimetype.includes("webm")) return "webm";
  return "ogg";
}

function splitCommand(command) {
  return command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(part => part.replace(/^"|"$/g, "")) || [];
}

function runTranscriptionCommand(filePath) {
  return new Promise((resolve, reject) => {
    const commandParts = splitCommand(process.env.AUDIO_TRANSCRIPTION_COMMAND);
    if (commandParts.length === 0) {
      reject(new Error("AUDIO_TRANSCRIPTION_COMMAND vacío"));
      return;
    }

    const [command, ...args] = commandParts;
    const child = spawn(command, [...args, filePath], {
      windowsHide: true,
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timeout transcribiendo audio (${TIMEOUT_MS}ms)`));
    }, TIMEOUT_MS);

    child.stdout.on("data", data => {
      stdout += data.toString();
    });

    child.stderr.on("data", data => {
      stderr += data.toString();
    });

    child.on("error", error => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", code => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Transcriptor local falló (${code}): ${stderr.trim()}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function transcribeAudioMedia(media, agentId) {
  if (!isAudioTranscriptionEnabled()) {
    throw new Error("Transcripción de audio local deshabilitada");
  }

  if (!media?.data) {
    throw new Error("Audio sin datos descargables");
  }

  const audioBuffer = Buffer.from(media.data, "base64");
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    throw new Error(`Audio demasiado grande (${audioBuffer.length} bytes)`);
  }

  const extension = getAudioExtension(media.mimetype);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "whatsapp-audio-"));
  const audioPath = path.join(tempDir, `message.${extension}`);

  try {
    fs.writeFileSync(audioPath, audioBuffer);
    const text = await runTranscriptionCommand(audioPath);
    const cleanText = String(text || "").trim();

    if (!cleanText) {
      throw new Error("Transcripción vacía");
    }

    log(`[${agentId}] 🎙️ Audio transcripto: "${cleanText}"`);
    return cleanText;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  isAudioTranscriptionEnabled,
  transcribeAudioMedia
};
