const { log } = require("./logging");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const OPENROUTER_FALLBACK_MODELS = [
  "inclusionai/ling-2.6-flash:free",
  "google/gemma-4-26b-a4b-it:free"
];

function toOpenRouterMessages(history, texto, options = {}) {
  const systemPrompt = options.systemPrompt || process.env.SYSTEM_PROMPT;
  return [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...history.map(msg => ({
      role: msg.role === "model" ? "assistant" : msg.role,
      content: msg.parts?.[0]?.text || ""
    })).filter(msg => msg.content),
    { role: "user", content: texto }
  ];
}

async function llamarOpenRouter(history, texto, modelo = process.env.OPENROUTER_MODEL || "openrouter/owl-alpha", options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY no configurada");
  }

  const fetch = require("node-fetch");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5011",
      "X-Title": process.env.OPENROUTER_APP_NAME || "WhatsApp Automation Demo"
    },
    body: JSON.stringify({
      model: modelo,
      messages: toOpenRouterMessages(history, texto, options),
      temperature: Number(process.env.LLM_TEMPERATURE || 0.4)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter devolvió respuesta vacía");
  }
  return content.trim();
}

async function llamarOpenRouterConFallbacks(history, texto, options = {}) {
  const modelos = [
    process.env.OPENROUTER_MODEL || "openrouter/owl-alpha",
    ...OPENROUTER_FALLBACK_MODELS
  ].filter((modelo, index, all) => modelo && all.indexOf(modelo) === index);

  let lastError;
  for (const modelo of modelos) {
    try {
      log(`🔄 LLM OpenRouter: ${modelo}`);
      const respuesta = await llamarOpenRouter(history, texto, modelo, options);
      log(`✅ OpenRouter OK: ${modelo}`);
      return respuesta;
    } catch (error) {
      lastError = error;
      log(`❌ OpenRouter falló (${modelo}): ${error.message}`, "ERROR");
    }
  }

  throw lastError;
}

async function llamarGeminiConReintentos(history, texto, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = options.systemPrompt || process.env.SYSTEM_PROMPT;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction: systemPrompt
  });
  let lastError;

  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    try {
      log(`🔄 Intento ${intento}/${MAX_RETRIES} de llamada a Gemini`);
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(texto);
      return result.response.text();
    } catch (error) {
      lastError = error;
      log(`⚠️ Error Gemini intento ${intento}: ${error.message}`, "WARN");
      if (intento < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError;
}

async function generarRespuestaLLM(history, texto, options = {}) {
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();

  if (provider === "openrouter") {
    try {
      return await llamarOpenRouterConFallbacks(history, texto, options);
    } catch (error) {
      if (process.env.LLM_ENABLE_GEMINI_FALLBACK === "true") {
        log(`⚠️ OpenRouter falló; intentando Gemini fallback: ${error.message}`, "WARN");
        return llamarGeminiConReintentos(history, texto, options);
      }
      throw error;
    }
  }

  try {
    return await llamarGeminiConReintentos(history, texto, options);
  } catch (error) {
    if (process.env.OPENROUTER_API_KEY) {
      log(`⚠️ Gemini falló; intentando OpenRouter fallback: ${error.message}`, "WARN");
      return llamarOpenRouterConFallbacks(history, texto, options);
    }
    throw error;
  }
}

function inicializarModelo() {
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  log(`🤖 LLM provider: ${provider}`);
  return { provider };
}

module.exports = {
  generarRespuestaLLM,
  inicializarModelo,
  llamarOpenRouter,
  llamarGeminiConReintentos
};
