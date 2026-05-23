const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');

const AGENTS_CONFIG_PATH = path.join(__dirname, '../config/agents.json');
const ROOT = path.join(__dirname, '..');

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

function pregunta(rl, texto) {
  return new Promise(resolve => rl.question(texto, resolve));
}

function getUsedPorts(agents) {
  const ports = new Set();
  agents.forEach(a => {
    if (a.ports) {
      ports.add(a.ports.api);
      ports.add(a.ports.dashboard);
    }
  });
  return ports;
}

function nextAvailablePort(usedPorts, startFrom) {
  let port = startFrom;
  while (usedPorts.has(port)) port++;
  return port;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n===== AGREGAR NUEVO CLIENTE =====\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // Leer config actual
    const config = JSON.parse(fs.readFileSync(AGENTS_CONFIG_PATH, 'utf8'));
    const usedPorts = getUsedPorts(config.agents);

    // Calcular próximos puertos disponibles
    const nextApiPort = nextAvailablePort(usedPorts, 3011);
    const nextDashPort = nextAvailablePort(new Set([...usedPorts, nextApiPort]), 3001);

    // Pedir datos
    console.log('Completá los datos del nuevo cliente:\n');
    
    const nombre = await pregunta(rl, 'Nombre del local o demo: ');
    const direccion = await pregunta(rl, '📍 Dirección: ');
    const telefono = await pregunta(rl, '📞 Teléfono: ');
    const horario = await pregunta(rl, `⏰ Horario [Lunes a Sábado: 9:00 a 20:00hs | Domingo: Cerrado]: `) || 'Lunes a Sábado: 9:00 a 20:00hs | Domingo: Cerrado';
    const dashUser = await pregunta(rl, `👤 Usuario del dashboard [admin]: `) || 'admin';
    const dashPass = await pregunta(rl, `Contraseña del dashboard [change-me]: `) || 'change-me';

    rl.close();

    // Generar ID
    const id = slugify(nombre);
    
    // Verificar que no existe
    if (config.agents.find(a => a.id === id)) {
      console.error(`\n❌ Ya existe un agente con ID "${id}". Elegí un nombre diferente.`);
      process.exit(1);
    }

    console.log('\n⏳ Procesando...\n');

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(dashPass, 10);

    // Nuevo agente
    const newAgent = {
      id,
      name: nombre,
      enabled: false,
      whatsappSession: `${id}-session`,
      ports: {
        api: nextApiPort,
        dashboard: nextDashPort
      },
      paths: {
        data: `data/${id}`,
        logs: `logs/${id}`,
        catalog: 'catalogs/catalogo-demo.js'
      },
      info: {
        nombre,
        telefono,
        horario,
        direccion
      },
      adminNumbers: [],
      dashboardUsers: [
        {
          username: dashUser,
          password: passwordHash,
          role: 'admin',
          name: 'Administrador'
        }
      ]
    };

    // Crear directorios
    const dirs = [
      path.join(ROOT, `data/${id}`),
      path.join(ROOT, `logs/${id}`)
    ];
    dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

    // Crear archivos de datos vacíos
    fs.writeFileSync(path.join(ROOT, `data/${id}/historial.json`), '{}');
    fs.writeFileSync(path.join(ROOT, `data/${id}/pausas.json`), '{}');
    fs.writeFileSync(path.join(ROOT, `logs/${id}/.gitkeep`), '');

    // Agregar a config
    config.agents.push(newAgent);
    fs.writeFileSync(AGENTS_CONFIG_PATH, JSON.stringify(config, null, 2));

    // Resumen
    console.log('✅ Cliente creado exitosamente!\n');
    console.log('─────────────────────────────────────');
    console.log(`📋 ID:          ${id}`);
    console.log(`🏪 Nombre:      ${nombre}`);
    console.log(`🔌 Puerto API:  ${nextApiPort}`);
    console.log(`📊 Dashboard:   ${nextDashPort}`);
    console.log(`👤 Usuario:     ${dashUser}`);
    console.log(`📁 Datos:       data/${id}/`);
    console.log('─────────────────────────────────────');
    console.log('\n⚠️  El agente está DESHABILITADO por defecto.');
    console.log('Para activarlo cuando tengas el número de WhatsApp:');
    console.log(`  1. Editar config/agents.json → "${id}" → "enabled": true`);
    console.log('  2. Deployar el cambio en el entorno correspondiente');
    console.log('  3. Iniciar el proceso PM2 del agente');
    console.log(`  4. Abrir dashboard en el puerto ${nextDashPort}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
