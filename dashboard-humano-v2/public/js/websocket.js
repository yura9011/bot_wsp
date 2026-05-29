const socket = io();

socket.on('connect', () => {
  console.log('WebSocket conectado');
  socket.emit('join_dashboard', { agentId: window.AGENT_ID || 'demo-local' });
});

socket.on('chats_updated', (chats) => {
  if (currentTab === 'chats') renderChats(chats);
});

socket.on('handoff_requested', (payload) => {
  const { userId, handoffReasonLabel } = payload;
  if (userId === currentUserId) {
    loadMessages(userId);
  }
  playNotification();
  showHandoffToast(payload);
  showDesktopNotification('Nuevo handoff', `${userId.split('@')[0]} - ${handoffReasonLabel || 'Atención humana'}`);
  loadChats();
});

socket.on('new_message', ({ userId, handoffReason }) => {
  if (handoffReason) return;
  if (userId === currentUserId) {
    loadMessages(userId);
  }
  playNotification();
  showDesktopNotification('Nuevo mensaje', `Chat: ${userId.split('@')[0]}`);
  loadChats();
});
