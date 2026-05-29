const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../../..");
const AGENTS_CONFIG_PATH = path.join(REPO_ROOT, "multi-tenant", "clients", "demo-launcher", "agents.json");
const DASHBOARD_CWD = path.join(REPO_ROOT, "dashboard-humano-v2");

module.exports = {
  apps: [
    {
      name: "bot-demo-launcher",
      cwd: REPO_ROOT,
      script: "orchestrator.js",
      args: "start demo-launcher",
      env: {
        NODE_ENV: "production",
        AGENTS_CONFIG_PATH,
        ORCHESTRATOR_START_DASHBOARDS: "false",
        WWEBJS_AUTH_PATH: path.join(REPO_ROOT, ".wwebjs_auth"),
        LLM_PROVIDER: "openrouter",
        OPENROUTER_MODEL: "openrouter/owl-alpha",
        LLM_ENABLE_GEMINI_FALLBACK: "false",
        LOG_FILE_PATH: path.join(REPO_ROOT, "logs", "demo-launcher", "bot.log"),
        SECURITY_LOG_PATH: path.join(REPO_ROOT, "logs", "demo-launcher", "security.log")
      }
    },
    {
      name: "dashboard-humano-demo-launcher",
      cwd: DASHBOARD_CWD,
      script: "server.js",
      env: {
        NODE_ENV: "production",
        AGENTS_CONFIG_PATH,
        DASHBOARD_AGENT_ID: "demo-launcher",
        CONFIG_AGENT_ID: "demo-launcher",
        DASHBOARD_HUMANO_PORT: "5051"
      }
    }
  ]
};
