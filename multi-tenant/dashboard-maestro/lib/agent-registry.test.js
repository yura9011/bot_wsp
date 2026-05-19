const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { readAgents } = require('./agent-registry');

function withTempRegistry(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-registry-'));
  try {
    const configPath = path.join(tmpDir, 'agents.json');
    const clientsDir = path.join(tmpDir, 'clients');
    const overridePath = path.join(tmpDir, 'agents.override.json');

    fs.mkdirSync(path.join(clientsDir, 'dolce-party'), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({
      agents: [
        {
          id: 'root-agent',
          name: 'Root Agent',
          enabled: true,
          ports: { api: 1111, dashboard: 2222 },
          paths: { data: 'data/root-agent' }
        }
      ]
    }));
    fs.writeFileSync(path.join(clientsDir, 'dolce-party', 'client.json'), JSON.stringify({
      clientId: 'dolce-party',
      clientName: 'Dolce Party'
    }));
    fs.writeFileSync(path.join(clientsDir, 'dolce-party', 'agents.json'), JSON.stringify({
      agents: [
        {
          id: 'santa-ana',
          name: 'Dolce Party - Santa Ana',
          enabled: true,
          status: 'active',
          environment: 'production',
          readOnly: true,
          ports: { api: 3011, dashboard: 3001 },
          paths: {
            data: '/home/forma/bot_dolce/data/santa-ana',
            logs: '/home/forma/bot_dolce/logs/santa-ana',
            stats: '/home/forma/bot_dolce/data/estadisticas.json',
            pauses: '/home/forma/bot_dolce/data/pausas.json'
          }
        },
        {
          id: 'asturias',
          enabled: false,
          status: 'pending-qr',
          readOnly: true,
          ports: { api: 3012, dashboard: 3002 }
        }
      ]
    }));
    fs.writeFileSync(overridePath, JSON.stringify({
      enabledOverrides: {
        'santa-ana': false
      },
      portOverrides: {
        'santa-ana': { api: 4011, dashboard: 4001 }
      }
    }));

    return fn({ configPath, clientsDir, overridePath });
  } finally {
    if (tmpDir.startsWith(os.tmpdir())) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

test('root source mode reads root config only', () => withTempRegistry(({ configPath, clientsDir, overridePath }) => {
  const registry = readAgents({ configPath, clientsDir, overridePath, sourceMode: 'root' });

  assert.equal(registry.sourceMode, 'root');
  assert.deepEqual(registry.agents.map(agent => agent.id), ['root-agent']);
  assert.equal(registry.agents[0].clientName, null);
}));

test('clients source mode reads active client configs only', () => withTempRegistry(({ configPath, clientsDir, overridePath }) => {
  const registry = readAgents({ configPath, clientsDir, overridePath, sourceMode: 'clients' });

  assert.equal(registry.sourceMode, 'clients');
  assert.deepEqual(registry.agents.map(agent => agent.id), ['santa-ana', 'asturias']);
  assert.equal(registry.agents[0].clientId, 'dolce-party');
  assert.equal(registry.agents[0].clientName, 'Dolce Party');
  assert.equal(registry.agents[0].enabled, true);
  assert.deepEqual(registry.agents[0].ports, { api: 3011, dashboard: 3001 });
  assert.equal(registry.sources[0].clientName, 'Dolce Party');
}));

test('merged source mode reads root config and client configs', () => withTempRegistry(({ configPath, clientsDir, overridePath }) => {
  const registry = readAgents({ configPath, clientsDir, overridePath, sourceMode: 'merged' });

  assert.equal(registry.sourceMode, 'merged');
  assert.deepEqual(registry.agents.map(agent => agent.id), ['root-agent', 'santa-ana', 'asturias']);
}));

test('client normalization preserves read-only production and pending QR states', () => withTempRegistry(({ configPath, clientsDir, overridePath }) => {
  const registry = readAgents({ configPath, clientsDir, overridePath, sourceMode: 'clients' });
  const santaAna = registry.agents.find(agent => agent.id === 'santa-ana');
  const asturias = registry.agents.find(agent => agent.id === 'asturias');

  assert.equal(santaAna.environment, 'production');
  assert.equal(santaAna.readOnly, true);
  assert.equal(santaAna.paths.data, '/home/forma/bot_dolce/data/santa-ana');
  assert.equal(santaAna.paths.stats, '/home/forma/bot_dolce/data/estadisticas.json');
  assert.equal(santaAna.paths.pauses, '/home/forma/bot_dolce/data/pausas.json');
  assert.equal(asturias.status, 'pending-qr');
  assert.equal(asturias.enabled, false);
  assert.equal(asturias.readOnly, true);
}));
