function renderChats(chats) {
  const container = document.getElementById('chatListContainer');
  const chatCount = document.getElementById('chatCount');
  if (!container) return;
  if (chatCount) chatCount.textContent = chats.length;
  window.currentChatsByUserId = Object.fromEntries(chats.map(chat => [chat.userId, chat]));
  
  if (chats.length === 0) {
    container.innerHTML = '<p class="no-chats">No hay chats activos</p>';
    if (window.updateConversationStatus) window.updateConversationStatus('bot');
    return;
  }
  
  container.innerHTML = chats.map(chat => {
    const statusEmoji = chat.estado === 'waiting_human' ? '🔴' : 
                       chat.estado === 'active_human' ? '🟢' : '⚪';
    const statusText = chat.estado === 'waiting_human' ? 'Esperando humano' :
                       chat.estado === 'active_human' ? 'Atendido por humano' : 'Bot activo';
    const time = new Date(chat.timestamp).toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `
      <div class="chat-item ${chat.estado}${chat.userId === currentUserId ? ' active' : ''}" data-user-id="${chat.userId}">
        <div class="chat-status">${statusEmoji}</div>
        <div class="chat-info">
          <div class="chat-name">${chat.nombre}</div>
          <div class="chat-preview">${chat.ultimoMensaje}</div>
          <div class="chat-state-label">${statusText}</div>
        </div>
        <div class="chat-meta">
          <div class="chat-time">${time}</div>
          ${chat.noLeidos > 0 ? `<span class="chat-badge">${chat.noLeidos}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
      const userId = item.dataset.userId;
      selectChat(userId);
    });
  });

  if (currentUserId && window.currentChatsByUserId[currentUserId] && window.updateConversationStatus) {
    window.updateConversationStatus(window.currentChatsByUserId[currentUserId].estado);
  }
}

function selectChat(userId) {
  currentUserId = userId;
  const chat = window.currentChatsByUserId?.[userId];
  window.currentChatState = chat?.estado || 'bot';
  document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`[data-user-id="${userId}"]`)?.classList.add('active');

  document.querySelector('.no-chat-selected').style.display = 'none';
  document.getElementById('conversationContainer').style.display = 'flex';

  loadMessages(userId);
  if (window.updateConversationStatus) window.updateConversationStatus(window.currentChatState);
  document.dispatchEvent(new CustomEvent('chatSelected', { detail: { userId, estado: window.currentChatState } }));
}

// Búsqueda de chats en el sidebar
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const items = document.querySelectorAll('.chat-item');
  items.forEach(item => {
    const nombre = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
    const preview = item.querySelector('.chat-preview')?.textContent.toLowerCase() || '';
    item.style.display = (nombre.includes(query) || preview.includes(query)) ? 'flex' : 'none';
  });
});
