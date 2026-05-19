const AGENTS_CONFIG_PATH = "/home/forma/multi-tenant/clients/dolce-party/agents.json";
const BOT_CWD = "/home/forma/bot_dolce";
const DASHBOARD_CWD = "/home/forma/bot_dolce/dashboard-humano-v2";

module.exports = {
  apps: [
    {
      name: "bot-dolce-mt-prd",
      cwd: BOT_CWD,
      script: "orchestrator.js",
      args: "start santa-ana",
      env: {
        NODE_ENV: "production",
        AGENTS_CONFIG_PATH,
        ORCHESTRATOR_START_DASHBOARDS: "false",
        WWEBJS_AUTH_PATH: "/home/forma/bot_dolce/.wwebjs_auth",
        LOG_FILE_PATH: "/home/forma/bot_dolce/logs/santa-ana/bot.log",
        SECURITY_LOG_PATH: "/home/forma/bot_dolce/logs/santa-ana/security.log"
      }
    },
    {
      name: "dashboard-humano-santa-ana-mt",
      cwd: DASHBOARD_CWD,
      script: "server.js",
      env: {
        NODE_ENV: "production",
        AGENTS_CONFIG_PATH,
        DASHBOARD_AGENT_ID: "santa-ana",
        CONFIG_AGENT_ID: "santa-ana",
        DASHBOARD_HUMANO_PORT: "3001"
      }
    }
  ]
};
