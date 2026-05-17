const { execFile } = require('child_process');

const ALLOWED_ACTIONS = new Set(['start', 'stop', 'restart']);
const ALLOWED_TARGETS = new Set(['bot', 'dashboard']);
const PROCESS_NAME_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const DEFAULT_TIMEOUT_MS = parseInt(process.env.DASHBOARD_MAESTRO_PM2_TIMEOUT_MS, 10) || 15000;

function isControlEnabled() {
  return process.env.DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL === 'true';
}

function getPm2Config() {
  return {
    enabled: isControlEnabled(),
    pm2Bin: process.env.DASHBOARD_MAESTRO_PM2_BIN || 'pm2',
    environment: process.env.DASHBOARD_MAESTRO_PM2_ENV || 'local',
    allowedActions: Array.from(ALLOWED_ACTIONS),
    allowedTargets: Array.from(ALLOWED_TARGETS)
  };
}

function resolveProcessName(agent, target) {
  const configured = agent.pm2?.[target] || agent.processes?.[target];
  if (configured) return configured;

  const suffix = getPm2Config().environment === 'testing' ? '-testing' : '';

  if (target === 'dashboard') {
    return `dashboard-humano-${agent.id}${suffix}`;
  }

  return `bot-${agent.id}${suffix}`;
}

function validateActionInput(agent, target, action) {
  if (!agent) {
    return 'Agente no encontrado';
  }

  if (agent.readOnly) {
    return 'Agente read-only: acciones PM2 deshabilitadas';
  }

  if (!ALLOWED_TARGETS.has(target)) {
    return 'Target no permitido';
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    return 'Acción no permitida';
  }

  const processName = resolveProcessName(agent, target);
  if (!PROCESS_NAME_PATTERN.test(processName)) {
    return 'Nombre de proceso PM2 inválido';
  }

  return null;
}

function runPm2Action(agent, target, action) {
  const validationError = validateActionInput(agent, target, action);
  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  const processName = resolveProcessName(agent, target);

  if (!isControlEnabled()) {
    const error = new Error('PM2 control deshabilitado');
    error.code = 'PM2_CONTROL_DISABLED';
    error.processName = processName;
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    execFile(getPm2Config().pm2Bin, [action, processName], { timeout: DEFAULT_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        error.processName = processName;
        error.stderr = stderr;
        return reject(error);
      }

      resolve({
        processName,
        stdout,
        stderr
      });
    });
  });
}

module.exports = {
  getPm2Config,
  resolveProcessName,
  runPm2Action,
  validateActionInput
};
