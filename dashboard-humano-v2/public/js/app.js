let currentUserId = null;
let currentTab = 'chats';

async function init() {
  const isAuth = await checkAuth();
  if (!isAuth) return;

  try {
    const envRes = await fetch('/api/env');
    const env = await envRes.json();
    if (env.isTesting) {
      document.querySelector('.dashboard').classList.add('is-testing');
      document.getElementById('testingBanner').style.display = 'block';
    }
  } catch(e) {}

  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('tabChats').addEventListener('click', () => switchTab('chats'));
  document.getElementById('tabConfig').addEventListener('click', () => switchTab('config'));
  document.getElementById('tabStats').addEventListener('click', () => switchTab('stats'));

  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);

  const statsApply = document.getElementById('statsDateApply');
  if (statsApply) {
    statsApply.addEventListener('click', () => {
      initDatePickers();
      loadStats();
    });
  }

  loadChats();
  setInterval(loadChats, 5000);
  requestNotificationPermission();

  // Auto-close sidebar on chat select (mobile)
  document.addEventListener('chatSelected', () => {
    if (window.innerWidth < 768) closeSidebar();
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const chatListContainer = document.getElementById('chatListContainer');
  const configContainer = document.getElementById('configContainer');
  const statsContainer = document.getElementById('statsContainer');
  const noChatSelected = document.querySelector('.no-chat-selected');
  const conversationContainer = document.getElementById('conversationContainer');
  const configPanel = document.getElementById('configPanel');
  const statsPanel = document.getElementById('statsPanel');
  const searchInput = document.getElementById('searchInput');

  // Hide all
  chatListContainer.style.display = 'none';
  configContainer.style.display = 'none';
  statsContainer.style.display = 'none';
  noChatSelected.style.display = 'none';
  conversationContainer.style.display = 'none';
  configPanel.style.display = 'none';
  statsPanel.style.display = 'none';
  searchInput.style.display = 'none';

  if (tab === 'chats') {
    document.getElementById('tabChats').classList.add('active');
    chatListContainer.style.display = 'block';
    noChatSelected.style.display = 'flex';
    searchInput.style.display = 'block';
  } else if (tab === 'config') {
    document.getElementById('tabConfig').classList.add('active');
    configContainer.style.display = 'block';
    configPanel.style.display = 'flex';
    loadAdminNumbers();
  } else if (tab === 'stats') {
    document.getElementById('tabStats').classList.add('active');
    statsContainer.style.display = 'block';
    statsPanel.style.display = 'flex';
    initDatePickers();
    loadStats();
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.chat-list');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.toggle('open');
  backdrop.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.querySelector('.chat-list');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.remove('open');
  backdrop.classList.remove('open');
}

async function loadChats() {
  if (currentTab !== 'chats') return;
  try {
    const response = await fetch('/api/chats', { credentials: 'include' });
    if (response.ok) {
      const chats = await response.json();
      renderChats(chats);
    }
  } catch (error) {
    console.error('Error cargando chats:', error);
  }
}

document.addEventListener('DOMContentLoaded', init);
