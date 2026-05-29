let cachedStats = null;

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function initDatePickers() {
  const fromInput = document.getElementById('statsDateFrom');
  const toInput = document.getElementById('statsDateTo');
  const today = getToday();
  if (fromInput && !fromInput.value) fromInput.value = today;
  if (toInput && !toInput.value) toInput.value = today;
}

async function loadStats() {
  const panel = document.getElementById('statsPanel');
  panel.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Cargando estadísticas...</span></div>';

  const fromInput = document.getElementById('statsDateFrom');
  const toInput = document.getElementById('statsDateTo');
  const from = fromInput ? fromInput.value : getToday();
  const to = toInput ? toInput.value : getToday();

  try {
    const isRange = from !== to;
    const url = isRange
      ? `/api/stats/daily?from=${from}&to=${to}`
      : '/api/stats/daily';
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      panel.innerHTML = '<p class="no-chats">Error al obtener datos</p>';
      return;
    }

    const data = await response.json();

    if (isRange && Array.isArray(data)) {
      renderRangeStats(data, from, to);
    } else {
      renderDayStats(data);
    }
  } catch (error) {
    panel.innerHTML = '<p class="no-chats">Error de conexión</p>';
  }
}

function renderDayStats(s) {
  const panel = document.getElementById('statsPanel');
  const totalMensajes = (s.mensajes?.recibidos || 0) + (s.mensajes?.enviados || 0);
  const handoffsTotal = s.handoffs?.total || 0;
  const iaTotal = s.aiRespondidas?.total || 0;
  const erroresTotal = s.errores?.total || 0;
  const convHoy = s.conversacionesHoy || 0;

  panel.innerHTML = `
    <div class="stats-header">
      <h2>Estadísticas del Día</h2>
      <p class="stats-date">${formatDateDisplay(s.fecha)}</p>
    </div>
    <div class="stats-kpi-grid">
      <div class="stat-card stat-messages">
        <div class="stat-value">${totalMensajes}</div>
        <div class="stat-label">Mensajes</div>
        <div class="stat-detail">${s.mensajes?.recibidos || 0} recibidos / ${s.mensajes?.enviados || 0} enviados</div>
      </div>
      <div class="stat-card stat-conversations">
        <div class="stat-value">${convHoy}</div>
        <div class="stat-label">Conversaciones</div>
        <div class="stat-detail">${s.usuariosUnicos || 0} usuarios únicos</div>
      </div>
      <div class="stat-card stat-handoffs">
        <div class="stat-value">${handoffsTotal}</div>
        <div class="stat-label">Handoffs</div>
        <div class="stat-detail">${s.handoffs?.automaticos || 0} automáticos / ${s.handoffs?.manuales || 0} manuales</div>
      </div>
      <div class="stat-card stat-ai">
        <div class="stat-value">${iaTotal}</div>
        <div class="stat-label">IA Respondidas</div>
        <div class="stat-detail">completadas sin handoff</div>
      </div>
      <div class="stat-card stat-errors">
        <div class="stat-value">${erroresTotal}</div>
        <div class="stat-label">Errores</div>
        <div class="stat-detail">${erroresTotal === 0 ? 'sin errores' : buildErrorDetail(s.errores)}</div>
      </div>
    </div>
    <div class="stats-detail">
      <h3>Detalle del día</h3>
      <div class="stats-detail-row">
        <span>Mensajes recibidos</span>
        <strong>${s.mensajes?.recibidos || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Mensajes enviados</span>
        <strong>${s.mensajes?.enviados || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Conversaciones activas</span>
        <strong>${convHoy}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Handoffs automáticos</span>
        <strong class="stat-badge-warning">${s.handoffs?.automaticos || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Handoffs manuales</span>
        <strong>${s.handoffs?.manuales || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>IA respondidas</span>
        <strong class="stat-badge-success">${iaTotal}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Hijacking bloqueado</span>
        <strong class="stat-badge-error">${s.errores?.hijacking || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Tema prohibido</span>
        <strong>${s.errores?.prohibido || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Fallos LLM</span>
        <strong>${s.errores?.llm_fallo || 0}</strong>
      </div>
      <div class="stats-detail-row">
        <span>Mensajes muy largos</span>
        <strong>${s.errores?.mensaje_largo || 0}</strong>
      </div>
    </div>
  `;
}

function renderRangeStats(data, from, to) {
  const panel = document.getElementById('statsPanel');

  const totals = data.reduce((acc, day) => {
    acc.mensajes += (day.mensajes?.recibidos || 0) + (day.mensajes?.enviados || 0);
    acc.conversaciones += day.usuariosUnicos || 0;
    acc.handoffs += day.handoffs?.total || 0;
    acc.ia += day.aiRespondidas?.total || 0;
    acc.errores += day.errores?.total || 0;
    return acc;
  }, { mensajes: 0, conversaciones: 0, handoffs: 0, ia: 0, errores: 0 });

  const days = data.length;
  const rows = data.map(day => `
    <div class="stats-range-row">
      <span>${formatDateShort(day.fecha)}</span>
      <span>${(day.mensajes?.recibidos || 0) + (day.mensajes?.enviados || 0)}</span>
      <span>${day.usuariosUnicos || 0}</span>
      <span>${day.handoffs?.total || 0}</span>
      <span>${day.aiRespondidas?.total || 0}</span>
      <span>${day.errores?.total || 0}</span>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="stats-header">
      <h2>Estadísticas por Rango</h2>
      <p class="stats-date">${formatDateShort(from)} — ${formatDateShort(to)} (${days} días)</p>
    </div>
    <div class="stats-kpi-grid">
      <div class="stat-card stat-messages">
        <div class="stat-value">${totals.mensajes}</div>
        <div class="stat-label">Mensajes totales</div>
        <div class="stat-detail">promedio ${Math.round(totals.mensajes / days)}/día</div>
      </div>
      <div class="stat-card stat-conversations">
        <div class="stat-value">${totals.conversaciones}</div>
        <div class="stat-label">Conversaciones</div>
        <div class="stat-detail">promedio ${Math.round(totals.conversaciones / days)}/día</div>
      </div>
      <div class="stat-card stat-handoffs">
        <div class="stat-value">${totals.handoffs}</div>
        <div class="stat-label">Handoffs</div>
        <div class="stat-detail">promedio ${Math.round(totals.handoffs / days)}/día</div>
      </div>
      <div class="stat-card stat-ai">
        <div class="stat-value">${totals.ia}</div>
        <div class="stat-label">IA Respondidas</div>
        <div class="stat-detail">promedio ${Math.round(totals.ia / days)}/día</div>
      </div>
      <div class="stat-card stat-errors">
        <div class="stat-value">${totals.errores}</div>
        <div class="stat-label">Errores</div>
        <div class="stat-detail">promedio ${Math.round(totals.errores / days)}/día</div>
      </div>
    </div>
    <div class="stats-detail">
      <h3>Desglose diario</h3>
      <div class="stats-range-header">
        <span>Fecha</span><span>Mensajes</span><span>Conv.</span><span>Handoffs</span><span>IA</span><span>Errores</span>
      </div>
      ${rows}
    </div>
  `;
}

function buildErrorDetail(errores) {
  if (!errores) return '';
  const parts = [];
  if (errores.hijacking) parts.push(`${errores.hijacking} hijacking`);
  if (errores.prohibido) parts.push(`${errores.prohibido} prohibido`);
  if (errores.llm_fallo) parts.push(`${errores.llm_fallo} LLM`);
  if (errores.mensaje_largo) parts.push(`${errores.mensaje_largo} largos`);
  return parts.join(', ') || 'sin errores';
}

function formatDateDisplay(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
