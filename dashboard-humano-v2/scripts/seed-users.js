const bcrypt = require('bcrypt');

async function generateHash(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Contraseña: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('');
}

async function main() {
  console.log('=== Generador de Hashes para Usuarios ===\n');
  
  // Generar hashes para usuarios de ejemplo
  await generateHash('change-me');
  await generateHash('maria123');
  
  console.log('Copia estos hashes a config/agents.json en la sección dashboardUsers');
}

main();
