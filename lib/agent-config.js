const fs = require("fs");
const path = require("path");
const { APP_ROOT, resolveRuntimePath } = require("./runtime-paths");

const DEFAULT_CONFIG_PATH = path.join(APP_ROOT, "config", "agents.json");

function getAgentsConfigPath() {
  return resolveRuntimePath(process.env.AGENTS_CONFIG_PATH || DEFAULT_CONFIG_PATH);
}

function getAgentsOverridePath(configPath = getAgentsConfigPath()) {
  if (process.env.AGENTS_OVERRIDE_PATH) {
    return resolveRuntimePath(process.env.AGENTS_OVERRIDE_PATH);
  }

  return path.join(path.dirname(configPath), "agents.override.json");
}

function loadAgentsConfig(options = {}) {
  const configPath = options.configPath
    ? resolveRuntimePath(options.configPath)
    : getAgentsConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(`Archivo de agentes no encontrado: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const overridePath = options.overridePath
    ? resolveRuntimePath(options.overridePath)
    : getAgentsOverridePath(configPath);

  applyRuntimeOverrides(config, overridePath, options.logger);

  return {
    config,
    configPath,
    overridePath: fs.existsSync(overridePath) ? overridePath : null
  };
}

function findAgentConfig(agentId, options = {}) {
  const { config, configPath, overridePath } = loadAgentsConfig(options);
  const agent = (config.agents || []).find(item => item.id === agentId);
  return {
    agent,
    config,
    configPath,
    overridePath
  };
}

function applyRuntimeOverrides(config, overridePath, logger = null) {
  if (!overridePath || !fs.existsSync(overridePath)) return;

  const override = JSON.parse(fs.readFileSync(overridePath, "utf8"));
  if (!override.portOverrides) return;

  for (const agent of config.agents || []) {
    if (!override.portOverrides[agent.id]) continue;
    agent.ports = { ...(agent.ports || {}), ...override.portOverrides[agent.id] };
    if (logger) {
      logger(`Override de puertos para ${agent.id}: API=${agent.ports.api}, Dashboard=${agent.ports.dashboard}`);
    }
  }
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  findAgentConfig,
  getAgentsConfigPath,
  getAgentsOverridePath,
  loadAgentsConfig
};
