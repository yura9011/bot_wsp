require("dotenv").config();
const path = require("path");
const { spawn } = require("child_process");
const AgentManager = require("./lib/agent-manager");
const { loadAgentsConfig } = require("./lib/agent-config");

function shouldStartDashboards() {
  return process.env.ORCHESTRATOR_START_DASHBOARDS !== "false";
}

class BotOrchestrator {
  constructor() {
    this.agents = new Map();
    this.dashboards = new Map();
    this.startDashboards = shouldStartDashboards();
    this.config = this.loadConfig();
  }

  loadConfig() {
    const { config, configPath, overridePath } = loadAgentsConfig({
      logger: message => console.log(`⚙️  ${message}`)
    });
    console.log(`📄 Config de agentes: ${configPath}`);
    if (overridePath) console.log(`📄 Overrides de agentes: ${overridePath}`);
    return config;
  }

  async startAgent(agentId) {
    const agentConfig = this.config.agents.find(a => a.id === agentId);
    
    if (!agentConfig) {
      throw new Error(`Agente ${agentId} no encontrado en configuración`);
    }

    if (!agentConfig.enabled) {
      console.log(`⚠️ Agente ${agentId} está deshabilitado en la configuración`);
      return;
    }

    if (this.agents.has(agentId)) {
      console.log(`⚠️ Agente ${agentId} ya está corriendo`);
      return;
    }

    console.log(`🚀 Iniciando agente: ${agentConfig.name}`);
    
    const agent = new AgentManager(agentConfig);
    await agent.start();
    
    this.agents.set(agentId, agent);
    console.log(`✅ Agente ${agentId} iniciado correctamente`);

    if (this.startDashboards) {
      this.startDashboard(agentConfig);
    } else {
      console.log(`📊 Dashboard de ${agentId} no iniciado por ORCHESTRATOR_START_DASHBOARDS=false`);
    }
  }

  async stopAgent(agentId) {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      console.log(`⚠️ Agente ${agentId} no está corriendo`);
      return;
    }

    console.log(`🛑 Deteniendo agente: ${agentId}`);

    if (this.startDashboards) {
      this.stopDashboard(agentId);
    }

    await agent.stop();
    this.agents.delete(agentId);
    console.log(`✅ Agente ${agentId} detenido`);
  }

  async startAll() {
    console.log("🚀 Iniciando todos los agentes habilitados...\n");
    
    for (const agentConfig of this.config.agents) {
      if (agentConfig.enabled) {
        try {
          await this.startAgent(agentConfig.id);
        } catch (error) {
          console.error(`❌ Error iniciando ${agentConfig.id}:`, error.message);
        }
      }
    }
    
    console.log("\n✅ Proceso de inicio de agentes completado");
  }

  async stopAll() {
    console.log("🛑 Deteniendo todos los agentes...\n");
    
    for (const [agentId] of this.agents) {
      await this.stopAgent(agentId);
    }
    
    for (const [agentId, child] of this.dashboards) {
      console.log(`🛑 Deteniendo dashboard ${agentId}...`);
      child.kill('SIGTERM');
    }
    this.dashboards.clear();
    
    console.log("\n✅ Todos los agentes detenidos");
  }

  startDashboard(agentConfig) {
    const dashboardPort = agentConfig.ports.dashboard;
    const botApiPort = agentConfig.ports.api;
    const agentId = agentConfig.id;

    if (this.dashboards.has(agentId)) {
      console.log(`⚠️ Dashboard de ${agentId} ya está corriendo en puerto ${dashboardPort}`);
      return;
    }

    const env = {
      ...process.env,
      DASHBOARD_HUMANO_PORT: String(dashboardPort),
      DASHBOARD_AGENT_ID: agentId,
      NODE_ENV: process.env.NODE_ENV || 'production'
    };

    const dashboardPath = path.join(__dirname, "dashboard-humano-v2", "server.js");
    const child = spawn("node", [dashboardPath], {
      env,
      stdio: "inherit",
      detached: false
    });

    child.on("error", (error) => {
      console.error(`❌ Error iniciando dashboard de ${agentId}: ${error.message}`);
      this.dashboards.delete(agentId);
    });

    child.on("exit", (code) => {
      console.log(`🛑 Dashboard de ${agentId} finalizado (código: ${code})`);
      this.dashboards.delete(agentId);
    });

    this.dashboards.set(agentId, child);
    console.log(`📊 Dashboard de ${agentId} iniciado en puerto ${dashboardPort}`);
  }

  stopDashboard(agentId) {
    const child = this.dashboards.get(agentId);
    if (child) {
      console.log(`🛑 Deteniendo dashboard de ${agentId}...`);
      child.kill('SIGTERM');
      this.dashboards.delete(agentId);
    }
  }

  listAgents() {
    console.log("\n📋 Agentes configurados:\n");
    
    for (const agentConfig of this.config.agents) {
      const isRunning = this.agents.has(agentConfig.id);
      const status = isRunning ? "🟢 Corriendo" : (agentConfig.enabled ? "⚪ Detenido" : "🔴 Deshabilitado");
      
      const dashboardStatus = this.startDashboards
        ? (this.dashboards.has(agentConfig.id) ? "📊 Dashboard activo" : "📭 Sin dashboard")
        : "📭 Dashboard externo";
      console.log(`${status} ${agentConfig.id} - ${agentConfig.name}`);
      console.log(`   API: http://localhost:${agentConfig.ports.api} | ${dashboardStatus}`);
      console.log(`   Dashboard: http://localhost:${agentConfig.ports.dashboard}`);
      console.log(`   Data: ${agentConfig.paths.data}`);
      console.log("");
    }
  }
}

// CLI
const orchestrator = new BotOrchestrator();
const command = process.argv[2];
const agentId = process.argv[3];

(async () => {
  try {
    switch (command) {
      case "start":
        if (agentId) {
          await orchestrator.startAgent(agentId);
        } else {
          await orchestrator.startAll();
        }
        break;
       
      case "stop":
        if (agentId) {
          await orchestrator.stopAgent(agentId);
        } else {
          await orchestrator.stopAll();
        }
        process.exit(0);
        break;
       
      case "list":
        orchestrator.listAgents();
        process.exit(0);
        break;
       
      default:
        console.log("Uso:");
        console.log("  node orchestrator.js start [agent-id]  - Iniciar agente(s)");
        console.log("  node orchestrator.js stop [agent-id]   - Detener agente(s)");
        console.log("  node orchestrator.js list              - Listar agentes");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
