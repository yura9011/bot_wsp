const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { loadAgentsConfig } = require("./agent-config");
const { resolveRuntimePath } = require("./runtime-paths");

function withTempConfig(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-config-"));
  try {
    const configPath = path.join(tmpDir, "agents.json");
    const overridePath = path.join(tmpDir, "agents.override.json");

    fs.writeFileSync(configPath, JSON.stringify({
      agents: [
        {
          id: "santa-ana",
          enabled: true,
          ports: { api: 3011, dashboard: 3001 },
          paths: {
            data: "data/santa-ana",
            logs: "logs/santa-ana",
            auth: ".wwebjs_auth"
          }
        }
      ]
    }));

    fs.writeFileSync(overridePath, JSON.stringify({
      portOverrides: {
        "santa-ana": { api: 4011, dashboard: 4001 }
      }
    }));

    fn({ tmpDir, configPath, overridePath });
  } finally {
    if (tmpDir.startsWith(os.tmpdir())) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

test("loadAgentsConfig reads explicit config and applies port overrides beside it", () => {
  withTempConfig(({ configPath }) => {
    const { config, overridePath } = loadAgentsConfig({ configPath });
    const santaAna = config.agents.find(agent => agent.id === "santa-ana");

    assert.equal(path.basename(overridePath), "agents.override.json");
    assert.equal(santaAna.ports.api, 4011);
    assert.equal(santaAna.ports.dashboard, 4001);
  });
});

test("resolveRuntimePath preserves absolute paths and resolves relative paths from a base", () => {
  const base = path.join(os.tmpdir(), "runtime-base");
  const relative = resolveRuntimePath("data/santa-ana", base);
  const absoluteInput = path.join(base, "logs", "santa-ana");
  const absolute = resolveRuntimePath(absoluteInput, base);

  assert.equal(relative, path.join(base, "data", "santa-ana"));
  assert.equal(absolute, path.normalize(absoluteInput));
});
