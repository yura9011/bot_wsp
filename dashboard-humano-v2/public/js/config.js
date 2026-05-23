let adminNumbers = [];

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content confirm-dialog">
        <p class="confirm-message">${message}</p>
        <div class="modal-actions">
          <button class="btn-cancel" id="confirmCancel">Cancelar</button>
          <button class="btn-danger" id="confirmOk">Eliminar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmCancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); resolve(true); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

async function loadAdminNumbers() {
  const container = document.getElementById('adminNumbersList');
  if (container) container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Cargando números...</span></div>';

  try {
    const response = await fetch('/api/admin-numbers', { credentials: 'include' });
    if (response.ok) {
      adminNumbers = await response.json();
      renderAdminNumbers();
    } else {
      if (container) container.innerHTML = '<p class="no-chats">Error al cargar números</p>';
    }
  } catch (error) {
    console.error('Error cargando números admin:', error);
    if (container) container.innerHTML = '<p class="no-chats">Error de conexión</p>';
  }
}

function renderAdminNumbers() {
  const container = document.getElementById('adminNumbersList');
  if (!container) return;

  let phoneMap = {};
  fetch('/api/phone-map', { credentials: 'include' })
    .then(r => r.ok ? r.json() : {})
    .then(m => { phoneMap = m; render(); })
    .catch(() => render());

  function render() {
    const isAdmin = currentUser?.role === 'admin' ||
                    document.getElementById('userName')?.dataset?.role === 'admin';

    if (adminNumbers.length === 0) {
      container.innerHTML = '<p class="no-chats">No hay números configurados</p>';
      const addBtn = document.getElementById('addNumberBtn');
      if (addBtn) addBtn.style.display = isAdmin ? 'block' : 'none';
      return;
    }

    container.innerHTML = adminNumbers.map(item => {
      const badgeClass = item.rol === 'admin' ? 'badge-admin' : 'badge-ignorado';
      const badgeText = item.rol === 'admin' ? 'Admin' : 'Ignorado';
      const displayPhone = phoneMap[item.id] ? `+${phoneMap[item.id]}` : item.id;
      return `
        <div class="admin-number-item" data-id="${item.id}">
          <div class="admin-number-info">
            <div class="admin-number-name" data-editable="${item.id}">${item.nombre}</div>
            <div class="admin-number-id">📱 ${displayPhone}</div>
            <div class="admin-number-role">
              <span class="role-badge ${badgeClass}">${badgeText}</span>
              <span class="admin-number-date">${new Date(item.fechaAgregado).toLocaleDateString('es-AR')}</span>
            </div>
          </div>
          <div class="admin-number-actions">
            ${isAdmin ? `
              <button class="btn-role-toggle" data-action="toggle" data-id="${item.id}" title="Cambiar rol">🔄</button>
              <button class="btn-delete" data-action="delete" data-id="${item.id}" title="Eliminar">❌</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const addBtn = document.getElementById('addNumberBtn');
    if (addBtn) {
      if (isAdmin) {
        addBtn.onclick = showAddModal;
        addBtn.style.display = 'block';
      } else {
        addBtn.style.display = 'none';
      }
    }

    document.querySelectorAll('[data-editable]').forEach(el => {
      el.style.cursor = 'pointer';
      el.title = 'Click para editar nombre';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        startInlineEdit(el);
      });
    });
  }
}

function startInlineEdit(element) {
  const id = element.dataset.editable;
  const currentName = element.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-input';
  input.value = currentName;

  element.textContent = '';
  element.appendChild(input);
  input.focus();
  input.select();

  function save() {
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      fetch(`/api/admin-numbers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre: newName })
      }).then(res => {
        if (res.ok) {
          const item = adminNumbers.find(a => a.id === id);
          if (item) item.nombre = newName;
          showToast('Nombre actualizado');
        } else {
          showToast('Error al actualizar nombre', 'error');
        }
        renderAdminNumbers();
      }).catch(() => {
        showToast('Error de conexión', 'error');
        renderAdminNumbers();
      });
    } else {
      renderAdminNumbers();
    }
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { renderAdminNumbers(); }
  });
}

async function toggleRole(id) {
  const item = adminNumbers.find(a => a.id === id);
  if (!item) return;

  const newRol = item.rol === 'admin' ? 'ignorado' : 'admin';
  const oldRol = item.rol;

  item.rol = newRol;
  renderAdminNumbers();

  try {
    const response = await fetch(`/api/admin-numbers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rol: newRol })
    });
    if (response.ok) {
      showToast(`Rol cambiado a ${newRol === 'admin' ? 'Admin' : 'Ignorado'}`);
    } else {
      item.rol = oldRol;
      renderAdminNumbers();
      const err = await response.text();
      showToast(`Error: ${err}`, 'error');
    }
  } catch (error) {
    item.rol = oldRol;
    renderAdminNumbers();
    showToast('Error de conexión', 'error');
  }
}

async function deleteNumber(id) {
  const confirmed = await showConfirmDialog(`¿Eliminar el número <strong>${id}</strong>? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  const oldList = [...adminNumbers];
  adminNumbers = adminNumbers.filter(a => a.id !== id);
  renderAdminNumbers();

  try {
    const response = await fetch(`/api/admin-numbers/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (response.ok) {
      showToast('Número eliminado');
    } else {
      adminNumbers = oldList;
      renderAdminNumbers();
      showToast('Error al eliminar', 'error');
    }
  } catch (error) {
    adminNumbers = oldList;
    renderAdminNumbers();
    showToast('Error de conexión', 'error');
  }
}

function showAddModal() {
  const existing = document.getElementById('addNumberModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'addNumberModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>➕ Agregar Número</h3>
      <div id="addNumberFeedback"></div>
      <div class="modal-form">
        <div class="form-group">
          <label>Número de WhatsApp:</label>
          <input type="text" id="newNumberId" placeholder="country-code-number" class="form-input" autocomplete="off">
          <small class="form-hint">Solo dígitos, sin espacios ni símbolos</small>
        </div>
        <div class="form-group">
          <label>Rol:</label>
          <select id="newNumberRol" class="form-input">
            <option value="admin">Admin (ejecuta comandos)</option>
            <option value="ignorado" selected>Ignorado (bot no responde)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nombre (opcional):</label>
          <input type="text" id="newNumberName" placeholder="Nombre del empleado" class="form-input" autocomplete="off">
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="modalCancel">Cancelar</button>
          <button class="btn-confirm" id="addNumberSubmit">Agregar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('addNumberSubmit').onclick = addNumber;
  document.getElementById('modalCancel').onclick = closeAddModal;
  modal.onclick = (e) => { if (e.target === modal) closeAddModal(); };

  modal.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addNumber(); }
    });
  });

  document.getElementById('newNumberId').focus();
}

function closeAddModal() {
  const modal = document.getElementById('addNumberModal');
  if (modal) modal.remove();
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'toggle') {
    await toggleRole(id);
  } else if (action === 'delete') {
    await deleteNumber(id);
  }
});

async function addNumber() {
  const id = document.getElementById('newNumberId').value.trim();
  const rol = document.getElementById('newNumberRol').value;
  const nombre = document.getElementById('newNumberName').value.trim();
  const feedback = document.getElementById('addNumberFeedback');
  const submitBtn = document.getElementById('addNumberSubmit');

  if (!id) {
    feedback.innerHTML = '<p class="form-feedback form-error">Ingresa un número de WhatsApp</p>';
    return;
  }

  if (!/^\d+$/.test(id)) {
    feedback.innerHTML = '<p class="form-feedback form-error">El número debe contener solo dígitos</p>';
    return;
  }

  feedback.innerHTML = '<p class="form-feedback form-loading"><span class="spinner-small"></span> Agregando número...</p>';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/admin-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, rol, nombre: nombre || undefined })
    });

    const data = await response.json();
    if (response.ok) {
      closeAddModal();
      await loadAdminNumbers();
      showToast('Número agregado correctamente');
    } else {
      feedback.innerHTML = `<p class="form-feedback form-error">${data.error || 'Error al agregar número'}</p>`;
      submitBtn.disabled = false;
    }
  } catch (error) {
    feedback.innerHTML = '<p class="form-feedback form-error">Error de conexión</p>';
    submitBtn.disabled = false;
  }
}
