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
          id: "demo-local",
          enabled: true,
          ports: { api: 5010, dashboard: 5011 },
          paths: {
            data: "data/demo-local",
            logs: "logs/demo-local",
            auth: ".wwebjs_auth"
          }
        }
      ]
    }));

    fs.writeFileSync(overridePath, JSON.stringify({
      portOverrides: {
        "demo-local": { api: 6010, dashboard: 6011 }
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
    const demo = config.agents.find(agent => agent.id === "demo-local");

    assert.equal(path.basename(overridePath), "agents.override.json");
    assert.equal(demo.ports.api, 6010);
    assert.equal(demo.ports.dashboard, 6011);
  });
});

test("resolveRuntimePath preserves absolute paths and resolves relative paths from a base", () => {
  const base = path.join(os.tmpdir(), "runtime-base");
  const relative = resolveRuntimePath("data/demo-local", base);
  const absoluteInput = path.join(base, "logs", "demo-local");
  const absolute = resolveRuntimePath(absoluteInput, base);

  assert.equal(relative, path.join(base, "data", "demo-local"));
  assert.equal(absolute, path.normalize(absoluteInput));
});
