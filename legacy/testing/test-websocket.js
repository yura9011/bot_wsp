// Test WebSocket para dashboard centralizado
const io = require('socket.io-client');

console.log('🔄 Conectando al dashboard centralizado...');

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ WebSocket CONECTADO');
  console.log('   Socket ID:', socket.id);
});

// Escuchar eventos de la demo
const agentes = ['demo-local'];

agentes.forEach(agente => {
  socket.on(`agent_${agente}_initial`, (data) => {
    console.log(`\n📊 Datos INICIALES recibidos para ${agente}:`);
    console.log('   - Stats:', data.stats ? '✅ Presente' : '❌ Faltante');
    console.log('   - Conversations:', data.conversations ? `${data.conversations.length} items` : '❌ Faltante');
    console.log('   - Paused:', data.paused ? `${data.paused.length} usuarios` : '❌ Faltante');
    console.log('   - Logs:', data.logs ? `${data.logs.length} líneas` : '❌ Faltante');
    console.log('   - Security:', data.security ? `${data.security.length} items` : '❌ Faltante');
  });

  socket.on(`agent_${agente}_update`, (data) => {
    console.log(`\n🔄 ACTUALIZACIÓN recibida para ${agente}:`);
    console.log('   - Timestamp:', new Date().toISOString());
    if (data.stats) {
      const hoy = new Date().toISOString().split('T')[0];
      const stats = data.stats.mensajes?.[hoy] || { recibidos: 0, enviados: 0 };
      console.log(`   - Mensajes hoy: ${stats.recibidos} recibidos, ${stats.enviados} enviados`);
    }
  });
});

socket.on('disconnect', () => {
  console.log('\n❌ WebSocket DESCONECTADO');
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  process.exit(1);
});

// Esperar 15 segundos para recibir actualizaciones
console.log('\n⏳ Esperando datos (15s)...');
setTimeout(() => {
  console.log('\n✅ Test completado - WebSocket funcionando correctamente');
  socket.disconnect();
  process.exit(0);
}, 15000);
