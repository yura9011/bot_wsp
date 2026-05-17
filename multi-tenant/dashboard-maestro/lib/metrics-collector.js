const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function collectAgentMetrics(agent) {
  const statsPath = resolveStatsPath(agent);

  if (!statsPath || !fs.existsSync(statsPath)) {
    return emptyMetrics('estadisticas.json no encontrado');
  }

  try {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    return summarizeStats(stats);
  } catch (error) {
    return emptyMetrics(error.message);
  }
}

function resolveStatsPath(agent) {
  if (agent.paths?.stats) {
    return path.resolve(REPO_ROOT, agent.paths.stats);
  }

  if (agent.paths?.data) {
    return path.resolve(REPO_ROOT, agent.paths.data, 'estadisticas.json');
  }

  return null;
}

function collectAgentsMetrics(agents) {
  return agents.map(agent => ({
    ...agent,
    metrics: collectAgentMetrics(agent)
  }));
}

function summarizeStats(stats) {
  const today = new Date().toISOString().split('T')[0];
  const last7Days = getLastDays(7);
  const todayMessages = stats.mensajes?.[today] || {};
  const todayHandoffs = stats.handoffs?.[today] || {};

  const week = last7Days.reduce((acc, date) => {
    const messages = stats.mensajes?.[date] || {};
    const handoffs = stats.handoffs?.[date] || {};
    acc.received += Number(messages.recibidos || 0);
    acc.sent += Number(messages.enviados || 0);
    acc.handoffs += Number(handoffs.total || messages.handoffs || 0);
    return acc;
  }, { received: 0, sent: 0, handoffs: 0 });

  return {
    today: {
      received: Number(todayMessages.recibidos || 0),
      sent: Number(todayMessages.enviados || 0),
      handoffs: Number(todayHandoffs.total || todayMessages.handoffs || 0)
    },
    week,
    ai: {
      calls: null,
      errors: null,
      estimatedCost: null,
      currency: 'USD',
      note: 'Sin instrumentación de tokens/costo'
    },
    source: 'estadisticas.json',
    error: null
  };
}

function getLastDays(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push(date.toISOString().split('T')[0]);
  }
  return result;
}

function emptyMetrics(error) {
  return {
    today: { received: 0, sent: 0, handoffs: 0 },
    week: { received: 0, sent: 0, handoffs: 0 },
    ai: {
      calls: null,
      errors: null,
      estimatedCost: null,
      currency: 'USD',
      note: 'Sin instrumentación de tokens/costo'
    },
    source: null,
    error
  };
}

module.exports = {
  collectAgentMetrics,
  collectAgentsMetrics
};
