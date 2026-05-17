const socket = io();

const agentsBody = document.getElementById('agentsBody');
const agentCounter = document.getElementById('agentCounter');
const lastRefresh = document.getElementById('lastRefresh');
const refreshButton = document.getElementById('refreshButton');
const actionsStatus = document.getElementById('actionsStatus');
const auditList = document.getElementById('auditList');
const backupNowButton = document.getElementById('backupNowButton');
const alertsList = document.getElementById('alertsList');
const metricTodayReceived = document.getElementById('metricTodayReceived');
const metricTodaySent = document.getElementById('metricTodaySent');
const metricTodayHandoffs = document.getElementById('metricTodayHandoffs');
const metricAiCost = document.getElementById('metricAiCost');
const showActiveOnly = document.getElementById('showActiveOnly');

let actionsConfig = {
  enabled: false,
  environment: 'local'
};
let backupConfig = {
  enabled: false
};
let mutedAgents = new Set();
let lastAgentsPayload = null;

function renderAgents(payload) {
  lastAgentsPayload = payload;
  const agents = payload.agents || [];
  const visibleAgents = showActiveOnly && showActiveOnly.checked
    ? agents.filter(agent => agent.enabled)
    : agents;
  const enabledCount = payload.enabledCount || agents.filter(agent => agent.enabled).length;
  const disabledCount = payload.disabledCount || agents.filter(agent => !agent.enabled).length;

  agentCounter.textContent = `${enabledCount} activos · ${disabledCount} off`;
  lastRefresh.textContent = `Última actualización: ${new Date(payload.loadedAt).toLocaleString()} · Fuente: ${payload.source}`;
  renderGlobalStatus(payload.health);
  renderAlerts(payload.alerts);
  renderMetricsSummary(payload.metrics);
  renderActionsStatus();

  if (visibleAgents.length === 0) {
    agentsBody.innerHTML = '<tr><td colspan="13">No hay agentes configurados.</td></tr>';
    return;
  }

  agentsBody.innerHTML = visibleAgents.map(agent => `
    <tr class="${agent.enabled ? '' : 'agent-disabled'}">
      <td><strong>${escapeHtml(agent.id)}</strong></td>
      <td>
        ${escapeHtml(agent.clientId || 'actual')}<br>
        <span class="env-badge ${escapeHtml(agent.environment || 'testing')}">${escapeHtml(agent.environment || 'testing')}</span>
        ${agent.readOnly ? '<span class="env-badge readonly">read-only</span>' : ''}
      </td>
      <td>
        <strong>${escapeHtml(agent.name)}</strong><br>
        <span>${escapeHtml(agent.info.telefono || 'Sin teléfono')}</span>
      </td>
      <td>
        <span class="badge ${agent.enabled ? 'enabled' : 'disabled'}">
          ${agent.enabled ? 'Sí' : (agent._overrideInfo?.enabledOverridden ? 'Off en testing' : 'No')}
        </span>
      </td>
      <td>${renderHealth(agent.health && agent.health.botApi)}</td>
      <td>${renderHealth(agent.health && agent.health.humanDashboard)}</td>
      <td>${renderWhatsapp(agent.health && agent.health.whatsapp)}</td>
      <td>${renderAgentMetrics(agent.metrics)}</td>
      <td>${renderHandoffs(agent.handoffs)}</td>
      <td>${agent.ports.api || '-'}</td>
      <td>${agent.ports.dashboard || '-'}</td>
      <td>
        <div class="paths">
          <span>data: ${escapeHtml(agent.paths.data || '-')}</span>
          <span>logs: ${escapeHtml(agent.paths.logs || '-')}</span>
          <span>catalog: ${escapeHtml(agent.paths.catalog || '-')}</span>
        </div>
      </td>
      <td>${renderAgentActions(agent)}</td>
    </tr>
  `).join('');
}

function renderError(message) {
  agentsBody.innerHTML = `<tr><td colspan="13" class="error">${escapeHtml(message)}</td></tr>`;
}

function renderGlobalStatus(health) {
  const globalStatus = document.getElementById('globalStatus');
  const statusDot = document.querySelector('.status-dot');
  if (!globalStatus || !health) return;

  const labels = {
    ok: 'Operativo',
    warning: 'Con advertencias',
    critical: 'Crítico'
  };

  globalStatus.textContent = `${labels[health.overall] || 'Desconocido'} · check ${new Date(health.checkedAt).toLocaleTimeString()}`;

  if (statusDot) {
    statusDot.className = `status-dot ${health.overall === 'ok' ? 'ok' : health.overall === 'critical' ? 'critical' : 'pending'}`;
  }
}

function renderHealth(check) {
  if (!check) return '<span class="health unknown">Sin check</span>';

  const label = {
    up: 'Up',
    degraded: 'Degraded',
    down: 'Down',
    unknown: 'Unknown',
    disabled: 'Off'
  }[check.status] || check.status;

  const detail = check.error
    ? escapeHtml(check.error)
    : `${check.httpStatus} · ${check.responseTimeMs}ms`;
  const lastSuccess = check.lastSuccessfulCheck
    ? new Date(check.lastSuccessfulCheck).toLocaleTimeString()
    : 'sin éxito';

  return `
    <div class="health-cell">
      <span class="health ${escapeHtml(check.status)}">${label}</span>
      <small>${detail}</small>
      <small>último ok: ${escapeHtml(lastSuccess)}</small>
    </div>
  `;
}

function renderAlerts(alerts) {
  if (!alertsList) return;
  if (!alerts || alerts.length === 0) {
    alertsList.textContent = 'Sin alertas activas.';
    return;
  }

  alertsList.innerHTML = alerts.map(alert => `
    <div class="alert-item ${escapeHtml(alert.severity)} ${alert.muted ? 'muted-alert' : ''}">
      <strong>${escapeHtml(alert.agentName)}</strong>
      <span>${escapeHtml(alert.message)}${alert.muted ? ' · mute' : ''}</span>
      <small>${escapeHtml(alert.detail || '')}</small>
    </div>
  `).join('');
}

function renderWhatsapp(whatsapp) {
  if (!whatsapp) return '<span class="health unknown">Unknown</span>';
  const statusClass = whatsapp.status === 'connected'
    ? 'up'
    : ['disconnected', 'auth_failure'].includes(whatsapp.status)
      ? 'down'
      : whatsapp.status === 'running'
        ? 'up'
        : whatsapp.status === 'disabled'
        ? 'disabled'
        : 'unknown';
  return `
    <div class="health-cell">
      <span class="health ${statusClass}">${escapeHtml(whatsapp.status)}</span>
      <small>${escapeHtml(whatsapp.detail || '')}</small>
    </div>
  `;
}

function renderMetricsSummary(metrics) {
  if (!metrics) return;
  if (metricTodayReceived) metricTodayReceived.textContent = metrics.today.received;
  if (metricTodaySent) metricTodaySent.textContent = metrics.today.sent;
  if (metricTodayHandoffs) metricTodayHandoffs.textContent = metrics.today.handoffs;
  if (metricAiCost) metricAiCost.textContent = metrics.ai.estimatedCost === null ? 'Sin datos' : `${metrics.ai.estimatedCost} ${metrics.ai.currency || 'USD'}`;
}

function renderAgentMetrics(metrics) {
  if (!metrics) return '<span class="muted">Sin métricas</span>';
  return `
    <div class="metrics-cell">
      <span>rec: ${metrics.today.received}</span>
      <span>env: ${metrics.today.sent}</span>
      <span>handoffs: ${metrics.today.handoffs}</span>
      <small>${escapeHtml(metrics.error || metrics.ai.note || '')}</small>
    </div>
  `;
}

function renderHandoffs(handoffs) {
  if (!handoffs) return '<span class="muted">Sin datos</span>';
  const oldestMinutes = Math.floor((handoffs.oldestWaitMs || 0) / 60000);
  return `
    <div class="metrics-cell">
      <span>pendientes: ${handoffs.pendingCount}</span>
      <span>críticos: ${handoffs.criticalCount}</span>
      <small>mayor espera: ${oldestMinutes} min</small>
      <small>${escapeHtml(handoffs.error || '')}</small>
    </div>
  `;
}

function renderActionsStatus() {
  if (!actionsStatus) return;
  actionsStatus.textContent = actionsConfig.enabled
    ? `Controles PM2 habilitados · ${actionsConfig.environment}`
    : 'Controles PM2 deshabilitados';

  if (backupNowButton) {
    backupNowButton.disabled = !backupConfig.enabled;
  }
}

function renderAgentActions(agent) {
  if (!agent.enabled) {
    return '<span class="muted">Deshabilitado en este entorno</span>';
  }

  if (agent.readOnly) {
    const dashboardLink = agent.links?.dashboard
      ? `<a class="panel-link" href="${escapeHtml(agent.links.dashboard)}" target="_blank" rel="noopener">Abrir panel</a>`
      : '';
    return `<span class="muted">Read-only</span>${dashboardLink}`;
  }

  const disabled = actionsConfig.enabled ? '' : 'disabled';
  const muted = mutedAgents.has(agent.id);
  return `
    <div class="actions-cell">
      <button class="action-btn" data-agent-id="${escapeHtml(agent.id)}" data-target="bot" data-action="start" ${disabled}>Start bot</button>
      <button class="action-btn" data-agent-id="${escapeHtml(agent.id)}" data-target="bot" data-action="restart" ${disabled}>Restart bot</button>
      <button class="action-btn" data-agent-id="${escapeHtml(agent.id)}" data-target="bot" data-action="stop" ${disabled}>Stop bot</button>
      <button class="action-btn" data-agent-id="${escapeHtml(agent.id)}" data-target="dashboard" data-action="restart" ${disabled}>Restart dash</button>
      <button class="action-btn" data-agent-id="${escapeHtml(agent.id)}" data-mute-action="${muted ? 'unmute' : 'mute'}">${muted ? 'Unmute alerts' : 'Mute alerts'}</button>
    </div>
  `;
}

function renderAudit(events) {
  if (!auditList) return;
  if (!events || events.length === 0) {
    auditList.textContent = 'Sin eventos registrados.';
    return;
  }

  auditList.innerHTML = events.map(event => `
    <div class="audit-item">
      <strong>${escapeHtml(event.result)}</strong>
      <span>${escapeHtml(event.action || '-')} ${escapeHtml(event.target || '-')} · ${escapeHtml(event.agentId || '-')}</span>
      <small>${new Date(event.timestamp).toLocaleString()} · ${escapeHtml(event.error || event.message || '')}</small>
    </div>
  `).join('');
}

async function loadActionsConfig() {
  const [actionsResponse, backupResponse] = await Promise.all([
    fetch('/api/actions/config'),
    fetch('/api/backups/config')
  ]);
  actionsConfig = await actionsResponse.json();
  backupConfig = await backupResponse.json();
  renderActionsStatus();
}

async function loadMutes() {
  const response = await fetch('/api/maintenance-mutes');
  const payload = await response.json();
  mutedAgents = new Set((payload.mutes || []).map(item => item.agentId));
}

async function loadAudit() {
  const response = await fetch('/api/audit-events?limit=10');
  const payload = await response.json();
  renderAudit(payload.events);
}

async function runAction(button) {
  const agentId = button.dataset.agentId;
  const target = button.dataset.target;
  const action = button.dataset.action;

  if (!window.confirm(`Confirmar ${action} ${target} para ${agentId}`)) return;

  button.disabled = true;
  try {
    const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, action })
    });
    const payload = await response.json();
    if (!response.ok) {
      window.alert(payload.error || 'Acción rechazada');
    }
    await loadAudit();
  } catch (error) {
    window.alert(error.message);
  } finally {
    button.disabled = !actionsConfig.enabled;
  }
}

async function toggleMute(button) {
  const agentId = button.dataset.agentId;
  const muted = button.dataset.muteAction === 'mute';

  const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/maintenance-mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muted, reason: 'maintenance' })
  });
  const payload = await response.json();
  if (!response.ok) {
    window.alert(payload.error || 'No se pudo actualizar mute');
  }
  await loadMutes();
  await loadAudit();
  await refreshAgents();
}

async function runBackupNow() {
  if (!window.confirm('Confirmar backup now')) return;

  backupNowButton.disabled = true;
  try {
    const response = await fetch('/api/backups/now', { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) {
      window.alert(payload.error || 'Backup rechazado');
    }
    await loadAudit();
  } catch (error) {
    window.alert(error.message);
  } finally {
    backupNowButton.disabled = !backupConfig.enabled;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

refreshButton.addEventListener('click', () => {
  refreshButton.disabled = true;
  refreshButton.textContent = 'Actualizando...';
  refreshAgents();

  setTimeout(() => {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Actualizar ahora';
  }, 500);
});

agentsBody.addEventListener('click', (event) => {
  const muteButton = event.target.closest('[data-mute-action]');
  if (muteButton) {
    toggleMute(muteButton);
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  runAction(button);
});

if (backupNowButton) {
  backupNowButton.addEventListener('click', runBackupNow);
}

if (showActiveOnly) {
  showActiveOnly.addEventListener('change', () => {
    if (lastAgentsPayload) renderAgents(lastAgentsPayload);
  });
}

socket.on('agents:update', renderAgents);
socket.on('agents:error', error => renderError(error.message || 'Error cargando agentes'));

function refreshAgents() {
  return fetch('/api/agents')
  .then(response => response.json())
  .then(payload => {
    if (payload.error) {
      renderError(payload.message || payload.error);
      return;
    }
    renderAgents(payload);
  })
  .catch(error => renderError(error.message));
}

refreshAgents();

loadActionsConfig().catch(error => {
  if (actionsStatus) actionsStatus.textContent = error.message;
});
loadMutes().catch(() => {});
loadAudit().catch(error => {
  if (auditList) auditList.textContent = error.message;
});
