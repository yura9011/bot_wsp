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
  }
};

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

module.exports = {
  HANDOFF_REASONS,
  detectHandoffIntent,
  isHumanHandoffEnabled
};
