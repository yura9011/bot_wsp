const HANDOFF_REASONS = {
  quiere_humano: {
    label: "Quiere hablar con una persona",
    patterns: [
      /quiero hablar con/i,
      /necesito hablar con/i,
      /pasame con/i,
      /comunicarme con/i,
      /\bhumano\b/i,
      /\bpersona\b/i,
      /\basesor(?:a)?\b/i,
      /\boperador(?:a)?\b/i,
      /\bagente\b/i
    ]
  },
  precio: {
    label: "Precio",
    patterns: [
      /\bprecio\b/i,
      /\bcosto\b/i,
      /cu[aá]nto sale/i,
      /cu[aá]nto cuesta/i,
      /\bpresupuesto\b/i,
      /\btarifa\b/i
    ]
  },
  reclamo: {
    label: "Reclamo",
    patterns: [
      /\breclamo\b/i,
      /\bqueja\b/i,
      /\bproblema\b/i,
      /\bmal\b/i,
      /\berror\b/i,
      /no lleg[oó]/i,
      /no funciona/i
    ]
  },
  no_entendio: {
    label: "No entendió",
    patterns: [
      /no entend[eé]s/i,
      /no me entendiste/i,
      /no entendiste/i,
      /no es lo que pregunt[eé]/i,
      /est[aá]s equivocado/i,
      /respuesta incorrecta/i
    ]
  },
  no_sabe: {
    label: "El agente no supo responder",
    patterns: []
  }
};

const LLAMA_NO_SABE_MARKER = "NO Sé RESPONDER";

function isHumanHandoffEnabled(agentConfig = {}) {
  const features = agentConfig.features || {};
  return features.human_handoff === true || features.humanHandoff === true;
}

function detectHandoffIntent(texto) {
  const text = String(texto || "").trim();
  if (!text) return null;

  for (const [reason, config] of Object.entries(HANDOFF_REASONS)) {
    if (config.patterns.some(pattern => pattern.test(text))) {
      return {
        reason,
        label: config.label
      };
    }
  }

  return null;
}

function isLLMResponseUncertain(respuesta) {
  if (!respuesta) return false;
  return respuesta.toUpperCase().startsWith(LLAMA_NO_SABE_MARKER);
}

function cleanLLMResponse(respuesta) {
  if (!respuesta) return "";
  const marker = LLAMA_NO_SABE_MARKER;
  const upper = respuesta.toUpperCase();
  const idx = upper.indexOf(marker);
  if (idx === 0) {
    let rest = respuesta.slice(marker.length).replace(/^[:\s]+/, "").trim();
    if (rest.length < 10) rest = "";
    return { uncertain: true, detail: rest };
  }
  return { uncertain: false, detail: respuesta };
}

module.exports = {
  HANDOFF_REASONS,
  LLAMA_NO_SABE_MARKER,
  detectHandoffIntent,
  isHumanHandoffEnabled,
  isLLMResponseUncertain,
  cleanLLMResponse
};
