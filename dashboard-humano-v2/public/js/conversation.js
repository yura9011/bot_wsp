async function loadMessages(userId) {
  try {
    const response = await fetch(`/api/chats/${userId}/messages`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const messages = await response.json();
      renderMessages(messages);
      document.getElementById('chatName').textContent = userId.split('@')[0];
      updateConversationStatus(window.currentChatState || 'bot');
    }
  } catch (error) {
    console.error('Error cargando mensajes:', error);
  }
}

function updateConversationStatus(estado = 'bot') {
  window.currentChatState = estado;

  const status = document.getElementById('chatStatus');
  const takeBtn = document.getElementById('takeBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const finishBtn = document.getElementById('finishBtn');
  const chat = window.currentChatsByUserId?.[currentUserId];

  if (status) {
    status.className = 'status-badge';
    if (estado === 'active_human') {
      status.textContent = 'Atención humana';
      status.classList.add('active');
    } else if (estado === 'waiting_human') {
      status.textContent = 'Pausado';
      status.classList.add('waiting');
    } else {
      status.textContent = 'IA activa';
      status.classList.add('bot');
    }
  }

  renderHandoffReason(chat);

  if (takeBtn) takeBtn.disabled = !currentUserId || estado === 'active_human';
  if (resumeBtn) resumeBtn.disabled = !currentUserId || estado === 'bot';
  if (finishBtn) finishBtn.disabled = !currentUserId;
}

function renderHandoffReason(chat) {
  const actions = document.querySelector('.conversation-header-actions');
  if (!actions) return;

  let reason = document.getElementById('handoffReasonBadge');
  if (!chat?.handoffReasonLabel) {
    if (reason) reason.remove();
    return;
  }

  if (!reason) {
    reason = document.createElement('span');
    reason.id = 'handoffReasonBadge';
    reason.className = 'handoff-reason-badge';
    actions.insertBefore(reason, actions.firstChild);
  }

  reason.textContent = 'Motivo: ' + chat.handoffReasonLabel;
}

window.updateConversationStatus = updateConversationStatus;

function renderMessages(messages) {
  const container = document.getElementById('messagesContainer');
  
  container.innerHTML = messages.map(msg => {
    const time = new Date(msg.timestamp).toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Obtener el texto del mensaje (soporta diferentes formatos)
    let messageText = msg.text || msg.texto || msg.parts?.[0]?.text || '';
    
    // Procesar formato de WhatsApp
    // Convertir *texto* a <strong>texto</strong>
    messageText = messageText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    
    // Convertir saltos de línea a <br>
    messageText = messageText.replace(/\n/g, '<br>');
    
    // Determinar la clase según el rol
    let messageClass = 'message';
    if (msg.role === 'user') {
      messageClass += ' message-user';
    } else if (msg.role === 'human' || msg.role === 'manual') {
      messageClass += ' message-human';
    } else {
      messageClass += ' message-bot';
    }
    
    return `
      <div class="${messageClass}">
        <div class="message-text">${messageText}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
  }).join('');
  
  container.scrollTop = container.scrollHeight;
}

document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
document.getElementById('takeBtn')?.addEventListener('click', takeConversation);
document.getElementById('resumeBtn')?.addEventListener('click', resumeConversation);
document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  if (!currentUserId) return;
  
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  try {
    const response = await fetch(`/api/chats/${currentUserId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ message })
    });
    
    if (response.ok) {
      input.value = '';
      loadMessages(currentUserId);
    }
  } catch (error) {
    console.error('Error enviando mensaje:', error);
  }
}

async function takeConversation() {
  if (!currentUserId) return;

  try {
    const response = await fetch(`/api/chats/${currentUserId}/take`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No se pudo tomar la conversación');
    }

    updateConversationStatus('active_human');
    await loadChats();
    await loadMessages(currentUserId);
  } catch (error) {
    console.error('Error tomando conversación:', error);
    alert(error.message);
  }
}

async function resumeConversation() {
  if (!currentUserId) return;

  try {
    const response = await fetch(`/api/chats/${currentUserId}/resume`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No se pudo devolver la conversación al bot');
    }

    updateConversationStatus('bot');
    await loadChats();
    await loadMessages(currentUserId);
  } catch (error) {
    console.error('Error devolviendo conversación:', error);
    alert(error.message);
  }
}

document.getElementById('finishBtn')?.addEventListener('click', async () => {
  if (!currentUserId) return;
  
  if (!confirm('¿Finalizar conversación y reactivar bot?')) return;
  
  try {
    const response = await fetch(`/api/chats/${currentUserId}/finish`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      alert('Conversación finalizada. Bot reactivado.');
      updateConversationStatus('bot');
      await loadMessages(currentUserId);
      await loadChats();
    }
  } catch (error) {
    console.error('Error finalizando conversación:', error);
  }
});

updateConversationStatus();
