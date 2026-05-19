const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'config', 'agents.json');
const DEFAULT_OVERRIDE_PATH = path.resolve(__dirname, '..', '..', '..', 'config', 'agents.override.json');
const DEFAULT_CLIENTS_DIR = path.resolve(__dirname, '..', '..', 'clients');
const SOURCE_MODES = new Set(['root', 'clients', 'merged']);

function normalizeAgent(agent, source) {
  const status = agent.status || agent.operationalStatus || (agent.enabled ? 'active' : 'disabled');

  return {
    id: agent.id,
    clientId: agent.clientId || source.clientId || null,
    clientName: agent.clientName || agent.client?.name || source.clientName || agent.clientId || source.clientId || null,
    name: agent.name || agent.nombre || agent.info?.nombre || agent.id,
    enabled: Boolean(agent.enabled),
    status,
    environment: agent.environment || agent.entorno || source.environment || 'testing',
    readOnly: Boolean(agent.readOnly),
    whatsappSession: agent.whatsappSession || null,
    ports: {
      api: agent.ports?.api || null,
      dashboard: agent.ports?.dashboard || null
    },
    paths: {
      data: agent.paths?.data || null,
      logs: agent.paths?.logs || null,
      catalog: agent.paths?.catalog || null,
      stats: agent.paths?.stats || null,
      pauses: agent.paths?.pauses || null
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

function readAgents(configPathOrOptions = process.env.AGENTS_CONFIG_PATH || DEFAULT_CONFIG_PATH, maybeOptions = {}) {
  const { configPath, options } = normalizeReadOptions(configPathOrOptions, maybeOptions);
  const sourceMode = normalizeSourceMode(options.sourceMode || process.env.DASHBOARD_MAESTRO_AGENT_SOURCE_MODE || 'root');
  const clientsDir = options.clientsDir || process.env.CLIENTS_DIR || DEFAULT_CLIENTS_DIR;
  const overridePath = options.overridePath || process.env.AGENTS_OVERRIDE_PATH || getDefaultOverridePath(configPath);
  const overrides = readOverrides(overridePath);
  const rootSource = {
    type: 'root-config',
    path: relativeToRepo(configPath),
    clientId: null,
    overridePath: overrides ? relativeToRepo(overridePath) : null
  };
  const rootAgents = sourceMode === 'clients'
    ? []
    : readAgentsFromFile(configPath, rootSource, overrides);
  const additionalAgents = sourceMode === 'clients'
    ? []
    : readAdditionalAgents(overrides);
  const clientSources = sourceMode === 'root'
    ? []
    : readClientSources(clientsDir);
  const clientAgents = clientSources.flatMap(source => readAgentsFromFile(source.fullPath, source, overrides));
  const agents = [...rootAgents, ...additionalAgents, ...clientAgents];

  return {
    source: describeSource(sourceMode, configPath, clientsDir),
    sourceMode,
    sources: [
      ...(sourceMode === 'clients' ? [] : [rootSource]),
      ...clientSources.map(({ fullPath, ...source }) => source)
    ],
    agents,
    count: agents.length,
    enabledCount: agents.filter(agent => agent.enabled).length,
    disabledCount: agents.filter(agent => !agent.enabled).length,
    loadedAt: new Date().toISOString()
  };
}

function normalizeReadOptions(configPathOrOptions, maybeOptions) {
  if (typeof configPathOrOptions === 'object' && configPathOrOptions !== null) {
    return {
      configPath: configPathOrOptions.configPath || process.env.AGENTS_CONFIG_PATH || DEFAULT_CONFIG_PATH,
      options: configPathOrOptions
    };
  }

  return {
    configPath: configPathOrOptions,
    options: maybeOptions || {}
  };
}

function normalizeSourceMode(sourceMode) {
  if (SOURCE_MODES.has(sourceMode)) return sourceMode;
  return 'root';
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
  const statusOverride = overrides?.statusOverrides?.[agent.id];
  if (!portOverride && !processOverride && typeof enabledOverride !== 'boolean' && !statusOverride) return agent;

  return {
    ...agent,
    enabled: typeof enabledOverride === 'boolean' ? enabledOverride : agent.enabled,
    status: statusOverride || agent.status,
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
      processOverridden: !!processOverride,
      statusOverridden: !!statusOverride
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
    statusOverrides: parsed.statusOverrides || null,
    additionalAgents: Array.isArray(parsed.additionalAgents) ? parsed.additionalAgents : []
  };
}

function readAdditionalAgents(overrides) {
  if (!overrides?.additionalAgents?.length) return [];

  const source = {
    type: 'override-additional',
    path: 'config/agents.override.json',
    clientId: null,
    clientName: null
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
      const clientDir = path.join(clientsDir, entry.name);
      const fullPath = path.join(clientDir, 'agents.json');
      return { clientDir, fullPath, fallbackClientId: entry.name };
    })
    .filter(source => fs.existsSync(source.fullPath))
    .map(source => {
      const client = readClientMetadata(source.clientDir, source.fallbackClientId);
      return {
        type: 'client-config',
        path: relativeToRepo(source.fullPath),
        fullPath: source.fullPath,
        clientId: client.clientId,
        clientName: client.clientName,
        environment: client.environment || null,
        clientPath: relativeToRepo(path.join(source.clientDir, 'client.json'))
      };
    });
}

function readClientMetadata(clientDir, fallbackClientId) {
  const clientPath = path.join(clientDir, 'client.json');
  if (!fs.existsSync(clientPath)) {
    return {
      clientId: fallbackClientId,
      clientName: fallbackClientId,
      environment: null
    };
  }

  const raw = fs.readFileSync(clientPath, 'utf8');
  const client = JSON.parse(raw);
  return {
    clientId: client.clientId || client.id || fallbackClientId,
    clientName: client.clientName || client.name || client.nombre || client.clientId || fallbackClientId,
    environment: client.environment || client.entorno || null
  };
}

function describeSource(sourceMode, configPath, clientsDir) {
  if (sourceMode === 'root') return relativeToRepo(configPath);
  if (sourceMode === 'clients') return relativeToRepo(clientsDir);
  return `${relativeToRepo(configPath)} + ${relativeToRepo(clientsDir)}`;
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
