function createBotApiClient(options = {}) {
  const agentId = options.agentId;
  const getAgentConfig = options.getAgentConfig || (() => options.agentConfig || null);
  const fetchImpl = options.fetchImpl || fetch;
  const host = options.host || "127.0.0.1";
  const fallbackPort = options.fallbackPort || 3011;

  function getBotApiPort() {
    const agent = getAgentConfig();
    if (agent && agent.ports && agent.ports.api) {
      return agent.ports.api;
    }
    return fallbackPort;
  }

  async function callBotApi(pathname, requestOptions = {}) {
    const botPort = getBotApiPort();
    const response = await fetchImpl(`http://${host}:${botPort}${pathname}`, requestOptions);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Bot API error: ${err}`);
    }

    return response;
  }

  async function sendHumanMessage(userId, message) {
    return callBotApi(`/message/sendMessage/${agentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: userId, message })
    });
  }

  async function takeConversation(userId) {
    return callBotApi(`/pause/${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "atendido_desde_dashboard" })
    });
  }

  async function resumeConversation(userId) {
    return callBotApi(`/resume/${encodeURIComponent(userId)}`, {
      method: "POST"
    });
  }

  async function finishConversation(userId) {
    await sendHumanMessage(userId, "MUCHAS GRACIAS");
    return resumeConversation(userId);
  }

  return {
    getBotApiPort,
    callBotApi,
    sendHumanMessage,
    takeConversation,
    resumeConversation,
    finishConversation
  };
}

module.exports = {
  createBotApiClient
};
