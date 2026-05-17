const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'config', 'agents.json');
const DEFAULT_OVERRIDE_PATH = path.resolve(__dirname, '..', '..', '..', 'config', 'agents.override.json');
const DEFAULT_CLIENTS_DIR = path.resolve(__dirname, '..', '..', 'clients');

function normalizeAgent(agent, source) {
  return {
    id: agent.id,
    clientId: agent.clientId || source.clientId || null,
    name: agent.name || agent.info?.nombre || agent.id,
    enabled: Boolean(agent.enabled),
    environment: agent.environment || agent.entorno || 'testing',
    readOnly: Boolean(agent.readOnly),
    whatsappSession: agent.whatsappSession || null,
    ports: {
      api: agent.ports?.api || null,
      dashboard: agent.ports?.dashboard || null
    },
    paths: {
      data: agent.paths?.data || null,
      logs: agent.paths?.logs || null,
      catalog: agent.paths?.catalog || null
    },
    info: {
      telefono: agent.info?.telefono || null,
      direccion: agent.info?.direccion || null,
      horario: agent.info?.horario || null
    },
    pm2: agent.pm2 || null,
    links: {
      dashboard: agent.links?.dashboard || null
    },
    source,
    _overrideInfo: agent._overrideInfo || null
  };
}

function readAgents(configPath = process.env.AGENTS_CONFIG_PATH || DEFAULT_CONFIG_PATH) {
  const overridePath = process.env.AGENTS_OVERRIDE_PATH || getDefaultOverridePath(configPath);
  const overrides = readOverrides(overridePath);
  const rootSource = {
    type: 'root-config',
    path: relativeToRepo(configPath),
    clientId: null,
    overridePath: overrides ? relativeToRepo(overridePath) : null
  };
  const rootAgents = readAgentsFromFile(configPath, rootSource, overrides);
  const additionalAgents = readAdditionalAgents(overrides);
  const clientSources = readClientSources(process.env.CLIENTS_DIR || DEFAULT_CLIENTS_DIR);
  const agents = [
    ...rootAgents,
    ...additionalAgents,
    ...clientSources.flatMap(source => readAgentsFromFile(source.fullPath, source))
  ];

  return {
    source: relativeToRepo(configPath),
    sources: [
      rootSource,
      ...clientSources.map(({ fullPath, ...source }) => source)
    ],
    agents,
    count: agents.length,
    enabledCount: agents.filter(agent => agent.enabled).length,
    disabledCount: agents.filter(agent => !agent.enabled).length,
    loadedAt: new Date().toISOString()
  };
}

function readAgentsFromFile(configPath, source, overrides = null) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  return Array.isArray(config.agents)
    ? config.agents.map(agent => normalizeAgent(applyAgentOverride(agent, overrides), withoutFullPath(source)))
    : [];
}

function applyAgentOverride(agent, overrides) {
  const portOverride = overrides?.portOverrides?.[agent.id];
  const processOverride = overrides?.processOverrides?.[agent.id];
  const enabledOverride = overrides?.enabledOverrides?.[agent.id];
  if (!portOverride && !processOverride && typeof enabledOverride !== 'boolean') return agent;

  return {
    ...agent,
    enabled: typeof enabledOverride === 'boolean' ? enabledOverride : agent.enabled,
    ports: {
      ...(agent.ports || {}),
      ...(portOverride || {})
    },
    pm2: processOverride
      ? {
          ...(agent.pm2 || {}),
          ...processOverride
        }
      : agent.pm2,
    _overrideInfo: {
      enabledOverridden: typeof enabledOverride === 'boolean',
      portsOverridden: !!portOverride,
      processOverridden: !!processOverride
    }
  };
}

function readOverrides(overridePath) {
  if (!overridePath || !fs.existsSync(overridePath)) return null;

  const raw = fs.readFileSync(overridePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    enabledOverrides: parsed.enabledOverrides || null,
    portOverrides: parsed.portOverrides || null,
    processOverrides: parsed.processOverrides || null,
    additionalAgents: Array.isArray(parsed.additionalAgents) ? parsed.additionalAgents : []
  };
}

function readAdditionalAgents(overrides) {
  if (!overrides?.additionalAgents?.length) return [];

  const source = {
    type: 'override-additional',
    path: 'config/agents.override.json',
    clientId: null
  };

  return overrides.additionalAgents.map(agent => normalizeAgent(agent, source));
}

function getDefaultOverridePath(configPath) {
  if (path.resolve(configPath) === DEFAULT_CONFIG_PATH) {
    return DEFAULT_OVERRIDE_PATH;
  }

  return path.join(path.dirname(configPath), 'agents.override.json');
}

function readClientSources(clientsDir) {
  if (!fs.existsSync(clientsDir)) return [];

  return fs.readdirSync(clientsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const fullPath = path.join(clientsDir, entry.name, 'agents.json');
      return {
        type: 'client-config',
        path: relativeToRepo(fullPath),
        fullPath,
        clientId: entry.name
      };
    })
    .filter(source => fs.existsSync(source.fullPath));
}

function withoutFullPath(source) {
  const { fullPath, ...publicSource } = source;
  return publicSource;
}

function relativeToRepo(filePath) {
  return path.relative(REPO_ROOT, filePath);
}

module.exports = {
  applyAgentOverride,
  applyPortOverride: applyAgentOverride,
  readAgents
};
