// ВАЖНО: Вставьте сюда ссылку, которую выдаст Render.com!
const SERVER_URL = "https://limcash-backend.onrender.com"; 
const socket = io(SERVER_URL);

const OWNER_TG_ID = 6860406379;
const STAFF_TG_IDS = [6860406379, 6546478411, 6527279937];
const ADMIN_SECRET_KEY = "limcash2026";

// Фиксированная стоимость 1 карточки в BYN
const BASE_BYN_PER_CARD = 5; 

let currentUser = {
  id: "user_" + Math.random().toString(36).substr(2, 7),
  username: "Пользователь",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"
};

let serverState = {
  currencyRates: { BYN_RUB: 28.5 },
  employees: [],
  ordersQueue: [],
  publicReviews: [],
  pendingReviews: [],
  chats: {},
  allowedToReview: {}
};

let selectedEmployeeId = 1;
let currentChatId = null;
let isAuthorizedUser = false;
let isAdminViewOpen = false;

// Подключение WebSockets
socket.on('init_state', (state) => { serverState = state; updateUI(); });
socket.on('state_update', (state) => { serverState = state; updateUI(); });

window.addEventListener('DOMContentLoaded', () => {
  initTelegramData();
  recalculateTotal();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('key') === ADMIN_SECRET_KEY) {
    enableStaffFeatures("👑 Владелец (ПК)");
  }
});

function initTelegramData() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      currentUser.id = u.id;
      currentUser.username = u.username ? `@${u.username}` : (u.first_name || "Пользователь");
      currentUser.avatar = u.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`;

      if (STAFF_TG_IDS.includes(u.id)) enableStaffFeatures("⚙️ Сотрудник");
    }
  }
}

function enableStaffFeatures(title) {
  isAuthorizedUser = true;
  document.getElementById('userRoleBadge').innerText = title;
  document.getElementById('adminFooterBtn').classList.remove('hidden');
}

function updateUI() {
  renderDropdown();
  renderPublicReviews();
  recalculateTotal();
  renderChatsList();
  if (currentChatId) renderMessages();

  const rateElem = document.getElementById('rateDisplay');
  if (rateElem && serverState.currencyRates) {
    rateElem.innerText = `1 BYN = ${serverState.currencyRates.BYN_RUB} ₽`;
  }
}

function switchMainTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.getElementById(`btn-tab-${tabName}`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

function toggleAdminPanel() {
  const mainViews = document.getElementById('mainViewsContainer');
  const mainNav = document.getElementById('mainNav');
  const adminView = document.getElementById('adminView');
  const btn = document.getElementById('adminToggleBtn');

  if (!isAdminViewOpen) {
    mainViews.classList.add('hidden');
    mainNav.classList.add('hidden');
    adminView.classList.remove('hidden');
    btn.innerText = "⬅️ Вернуться в Приложение";
    isAdminViewOpen = true;
  } else {
    adminView.classList.add('hidden');
    mainViews.classList.remove('hidden');
    mainNav.classList.remove('hidden');
    btn.innerText = "⚙️ Панель Управления";
    isAdminViewOpen = false;
  }
}

// Расчет суммы (BYN фиксировано, RUB от ежедневного курса)
function changeCount(id, delta, min, max) {
  const input = document.getElementById(id);
  let val = (parseInt(input.value) || min) + delta;
  if (val < min) val = min;
  if (val > max) val = max;
  input.value = val;
  recalculateTotal();
}

function recalculateTotal() {
  const cardCount = parseInt(document.getElementById('cardCount').value) || 1;
  const totalBYN = cardCount * BASE_BYN_PER_CARD;
  const rate = serverState.currencyRates ? parseFloat(serverState.currencyRates.BYN_RUB) : 28.5;
  const totalRUB = Math.round(totalBYN * rate);

  document.getElementById('totalAmountDisplayBYN').innerText = `${totalBYN} BYN`;
  document.getElementById('totalAmountDisplayRUB').innerText = `~ ${totalRUB.toLocaleString('ru-RU')} ₽`;
}

function openCalcModal() {
  const emp = serverState.employees.find(e => e.id === selectedEmployeeId);
  const cardCount = parseInt(document.getElementById('cardCount').value) || 1;
  const totalBYN = cardCount * BASE_BYN_PER_CARD;
  const rate = serverState.currencyRates ? parseFloat(serverState.currencyRates.BYN_RUB) : 28.5;
  const totalRUB = Math.round(totalBYN * rate);

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  body.innerHTML = `
    <h3>🧮 Оформление заказа</h3>
    <div style="margin-top:12px; font-size:0.9rem; color:#c4b5fd;">
      <div>Исполнитель: <strong>${emp ? emp.name : 'Не выбран'}</strong></div>
      <div>Количество карточек: <strong>${cardCount} шт.</strong></div>
      <div style="margin-top:10px; font-size:1.1rem; color:#fff;">К оплате: <strong>${totalBYN} BYN (${totalRUB} ₽)</strong></div>
    </div>
    <button class="primary-btn" style="margin-top:15px;" onclick="confirmOrder(${totalBYN}, ${totalRUB})">Подтвердить заказ</button>
  `;
}

function confirmOrder(totalBYN, totalRUB) {
  const cardCount = parseInt(document.getElementById('cardCount').value) || 1;
  const orderData = {
    id: Date.now().toString().slice(-4),
    empId: selectedEmployeeId,
    clientId: currentUser.id,
    clientName: currentUser.username,
    cardCount: cardCount,
    totalBYN: totalBYN,
    totalRUB: totalRUB
  };

  socket.emit('create_order', orderData);
  closeModal();

  switchMainTab('chat');
  const chatId = `chat_${selectedEmployeeId}_${currentUser.id}`;
  const emp = serverState.employees.find(e => e.id === selectedEmployeeId);
  openSpecificChat(chatId, emp ? emp.name : 'Сотрудник', emp ? emp.avatar : '');
}

// Управление Чатами
function renderChatsList() {
  const container = document.getElementById('dynamicChatsContainer');
  if (!container) return;
  container.innerHTML = '';

  const chats = serverState.chats || {};
  Object.keys(chats).forEach(chatId => {
    const c = chats[chatId];
    if (c.clientId === currentUser.id || isAuthorizedUser) {
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.onclick = () => openSpecificChat(c.id, c.clientName || 'Чат по заказу', `https://api.dicebear.com/7.x/bottts/svg?seed=${c.id}`);
      item.innerHTML = `
        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${c.id}" class="chat-avatar" alt="Avatar">
        <div class="chat-info">
          <strong>${c.clientName || 'Заказчик'}</strong>
          <span>Заказ #${c.id.slice(-4)}</span>
        </div>
      `;
      container.appendChild(item);
    }
  });
}

function openSpecificChat(id, name, avatar) {
  currentChatId = id;
  document.getElementById('tgChatList').classList.add('hidden');
  document.getElementById('tgChatRoom').classList.remove('hidden');

  document.getElementById('chatRoomAvatar').src = avatar;
  document.getElementById('chatRoomName').innerText = name;

  if (isAuthorizedUser) {
    document.getElementById('chatPaidBtn').classList.remove('hidden');
  }

  renderMessages();
}

function backToChatsList() {
  document.getElementById('tgChatRoom').classList.add('hidden');
  document.getElementById('tgChatList').classList.remove('hidden');
}

function renderMessages() {
  const box = document.getElementById('chatMessagesBox');
  box.innerHTML = '';

  const chat = (serverState.chats || {})[currentChatId];
  const messages = chat ? chat.messages : [];

  messages.forEach(m => {
    const wrap = document.createElement('div');
    wrap.className = `msg-wrapper ${m.sender === currentUser.username ? 'user' : 'bot'}`;
    wrap.innerHTML = `<div class="msg"><strong>${m.sender}:</strong> ${m.text}</div>`;
    box.appendChild(wrap);
  });
  box.scrollTop = box.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentChatId) return;

  socket.emit('send_message', { chatId: currentChatId, text, sender: currentUser.username });
  input.value = '';
}

function handleChatKeyPress(e) { if (e.key === 'Enter') sendChatMessage(); }

// Кнопка сотрудника «Разрешить отзыв / Оплачено»
function markOrderPaid() {
  const chat = (serverState.chats || {})[currentChatId];
  if (chat) {
    socket.emit('allow_review', { chatId: currentChatId, clientId: chat.clientId, empId: chat.empId });
    alert("Заказ оплачен! Клиенту разрешено оставить отзыв.");
  }
}

// Отзывы и Модерация
function openAddReviewModal() {
  if (!serverState.allowedToReview || !serverState.allowedToReview[currentUser.id]) {
    alert("🔒 Вы сможете оставить отзыв только после выполнения заказа сотрудником!");
    return;
  }

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  body.innerHTML = `
    <h3>⭐ Написать отзыв</h3>
    <textarea id="reviewText" class="custom-input" style="height:80px; margin-top:10px;" placeholder="Ваш отзыв..."></textarea>
    <button class="primary-btn" style="margin-top:10px;" onclick="sendReview()">Отправить на проверку</button>
  `;
}

function sendReview() {
  const text = document.getElementById('reviewText').value.trim();
  if (!text) return;
  socket.emit('submit_review', { author: currentUser.username, text, clientId: currentUser.id });
  closeModal();
  alert("Отзыв отправлен на модерацию!");
}

function openAdminModal(type) {
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  if (type === 'status') {
    let empOptions = serverState.employees.map(e => `<option value="${e.id}">${e.name} (${e.status})</option>`).join('');
    body.innerHTML = `
      <h3>🟢 Статусы сотрудников</h3>
      <select id="adminEmpSelect" class="custom-input" style="margin-top:10px;">${empOptions}</select>
      <select id="statusSelect" class="custom-input" style="margin-top:10px;">
        <option value="ready">🟢 Готов к работе</option>
        <option value="rest">🟡 Отдых</option>
        <option value="inactive">🔴 Неактивен</option>
      </select>
      <button class="primary-btn" style="margin-top:15px;" onclick="saveStatus()">Сохранить</button>
    `;
  } else if (type === 'moderation') {
    const list = serverState.pendingReviews || [];
    let html = `<h3>🛡️ Модерация отзывов (${list.length})</h3>`;
    list.forEach(r => {
      html += `
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-top:8px;">
          <strong>${r.author}:</strong> ${r.text}
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="sm-btn success" onclick="moderateReview(${r.id}, 'approve')">Одобрить</button>
            <button class="sm-btn danger" onclick="moderateReview(${r.id}, 'reject')">Отклонить</button>
          </div>
        </div>
      `;
    });
    body.innerHTML = html || '<h3>🛡️ Нет отзывов на проверку</h3>';
  } else if (type === 'finance') {
    let html = '<h3>💰 Выполненные карточки</h3>';
    serverState.employees.forEach(e => {
      html += `<div style="margin-top:8px;">${e.name}: <strong>${e.cardsDone || 0} карточек</strong></div>`;
    });
    body.innerHTML = html;
  }
}

function saveStatus() {
  const empId = parseInt(document.getElementById('adminEmpSelect').value);
  const status = document.getElementById('statusSelect').value;
  socket.emit('update_employee_status', { empId, status });
  closeModal();
}

function moderateReview(reviewId, action) {
  socket.emit('moderate_review', { reviewId, action });
  closeModal();
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function renderDropdown() {
  const menu = document.getElementById('dropdownMenu');
  const selectedBox = document.getElementById('dropdownSelected');
  if (!menu || !selectedBox) return;

  menu.innerHTML = '';
  const emps = serverState.employees || [];
  const activeEmp = emps.find(e => e.id === selectedEmployeeId) || emps[0];

  if (activeEmp) selectedBox.innerHTML = getEmployeeHtml(activeEmp);

  emps.forEach(emp => {
    const item = document.createElement('div');
    item.className = `dropdown-item ${emp.status !== 'ready' ? 'disabled' : ''}`;
    item.innerHTML = getEmployeeHtml(emp);
    item.onclick = (e) => {
      e.stopPropagation();
      if (emp.status !== 'ready') return alert("Сотрудник не готов к работе!");
      selectedEmployeeId = emp.id;
      renderDropdown(); recalculateTotal(); toggleDropdown();
    };
    menu.appendChild(item);
  });
}

function getEmployeeHtml(emp) {
  let st = "🟢 В сети";
  if (emp.status === 'rest') st = "🟡 Отдых";
  if (emp.status === 'inactive') st = "🔴 Неактивен";

  return `
    <img src="${emp.avatar}" class="emp-avatar" alt="Avatar">
    <div class="emp-details">
      <div class="emp-name-row"><span class="emp-name">${emp.name}</span><span class="emp-status">${st}</span></div>
      <div class="emp-sub-row"><span class="emp-queue">Очередь: ${emp.queue || 0} чел.</span></div>
    </div>
  `;
}

function toggleDropdown() { document.getElementById('dropdownMenu').classList.toggle('hidden'); }

function renderPublicReviews() {
  const container = document.getElementById('publicReviewsList');
  if (!container) return;
  container.innerHTML = '';
  (serverState.publicReviews || []).forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `<div class="review-header"><strong>${r.author}</strong></div><div class="review-text">${r.text}</div>`;
    container.appendChild(card);
  });
}
