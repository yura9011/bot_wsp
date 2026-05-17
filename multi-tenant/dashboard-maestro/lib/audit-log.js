const fs = require('fs');
const path = require('path');

const MAX_EVENTS = 200;
const DATA_FILE = path.resolve(__dirname, '..', '..', '..', 'data', 'dashboard-maestro', 'audit-events.json');
let events = [];

function loadEvents() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        events = parsed.slice(0, MAX_EVENTS);
        return;
      }
    }
  } catch (err) {
    console.warn('audit-log: error loading persisted events, starting fresh:', err.message);
  }
  events = [];
}

function saveEvents() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), 'utf8');
  } catch (err) {
    console.warn('audit-log: error persisting events:', err.message);
  }
}

loadEvents();

function recordAuditEvent(event) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    user: event.user || 'unknown',
    ip: event.ip || null,
    action: event.action,
    target: event.target,
    agentId: event.agentId || null,
    processName: event.processName || null,
    result: event.result,
    message: event.message || null,
    error: event.error || null
  };

  events.unshift(entry);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  saveEvents();

  return entry;
}

function listAuditEvents(limit = 50) {
  return events.slice(0, limit);
}

module.exports = {
  listAuditEvents,
  recordAuditEvent
};
