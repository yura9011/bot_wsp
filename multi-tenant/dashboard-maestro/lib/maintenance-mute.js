const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '..', '..', '..', 'data', 'dashboard-maestro', 'maintenance-mutes.json');
let mutedAgents = new Map();

function loadMutes() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        mutedAgents = new Map(parsed.map(item => [item.agentId, item]));
        return;
      }
    }
  } catch (err) {
    console.warn('maintenance-mute: error loading persisted mutes, starting fresh:', err.message);
  }
  mutedAgents = new Map();
}

function saveMutes() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(mutedAgents.entries()).map(([agentId, entry]) => ({
      agentId,
      muted: entry.muted,
      reason: entry.reason,
      since: entry.since,
      until: entry.until
    }));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('maintenance-mute: error persisting mutes:', err.message);
  }
}

loadMutes();

function getMaintenanceMutes() {
  return Array.from(mutedAgents.entries()).map(([agentId, data]) => ({
    agentId,
    ...data
  }));
}

function isAgentMuted(agentId) {
  const data = mutedAgents.get(agentId);
  return Boolean(data && (!data.until || Date.now() < data.until));
}

function setAgentMute(agentId, muted, options = {}) {
  if (!muted) {
    mutedAgents.delete(agentId);
    saveMutes();
    return { agentId, muted: false };
  }

  const entry = {
    muted: true,
    reason: options.reason || 'maintenance',
    since: new Date().toISOString(),
    until: options.until || null
  };
  mutedAgents.set(agentId, entry);
  saveMutes();

  return { agentId, ...entry };
}

module.exports = {
  getMaintenanceMutes,
  isAgentMuted,
  setAgentMute
};
