require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config", "agents.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

console.log("🚀 Iniciando todo el sistema...\n");

// Iniciar agentes
(async () => {
  for (const agentConfig of config.agents) {
    if (agentConfig.enabled) {
      console.log(`🚀 Iniciando agente: ${agentConfig.name}`);
      const agentProcess = spawn("node", ["bot.js", agentConfig.id], {
        cwd: __dirname,
        stdio: "inherit"
      });
    }
  }

  // Iniciar dashboard central
  console.log("\n📊 Iniciando dashboard central...");
  const dashboard = spawn("node", ["dashboard-central.js"], {
    cwd: __dirname,
    stdio: "inherit"
  });

  console.log("\n✅ Todo el sistema iniciado");
})();
