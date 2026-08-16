const OWNER_TG_ID = 6860406379;
const STAFF_TG_IDS = [6860406379, 6546478411, 6527279937];
const ADMIN_SECRET_KEY = "limcash2026";
const CLOUD_KEY = "limcash_app_state_v5";

let currentUser = {
  id: null,
  username: "@Guest",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"
};

let EMPLOYEES = [
  { 
    id: 1, 
    name: "John Deyvy Harris", 
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=John", 
    status: "ready", 
    tgOnly: false, 
    queue: 0, 
    cardsDone: 0, 
    ratePerCard: 100,
    schedule: { shift: "Смена (09:00 - 21:00)", days: "ПН-ПТ" }
  },
  { 
    id: 2, 
    name: "Петя (Сотрудник #2)", 
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker2", 
    status: "rest", 
    tgOnly: false, 
    queue: 0, 
    cardsDone: 0, 
    ratePerCard: 100,
    schedule: { shift: "Выходной", days: "СБ-ВС" }
  },
  { 
    id: 3, 
    name: "Сотрудник #3", 
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker3", 
    status: "inactive", 
    tgOnly: true, 
    queue: 0, 
    cardsDone: 0, 
    ratePerCard: 100,
    schedule: { shift: "Ночная смена (21:00 - 09:00)", days: "Гибкий" }
  }
];

let selectedEmployeeId = 1;
let PUBLIC_REVIEWS = [];
let PENDING_REVIEWS = [];
let ORDERS_QUEUE = [];

let activeUserChats = [];
let currentChatId = null;
let isAuthorizedUser = false;
let isOwnerUser = false;
let isAdminViewOpen = false;
let hasPaidOrders = false;

window.addEventListener('DOMContentLoaded', async () => {
  initTelegramData();
  await loadState();
  renderDropdown();
  renderPublicReviews();
  recalculateTotal();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('key') === ADMIN_SECRET_KEY) {
    enableStaffFeatures("👑 Владелец (ПК)", true);
  }

  // Синхронизация между вкладками браузера
  window.addEventListener('storage', (event) => {
    if (event.key === CLOUD_KEY && event.newValue) {
      applyStateFromJSON(event.newValue);
    }
  });

  // Периодическая облачная синхронизация каждые 5 секунд для разных устройств
  setInterval(async () => {
    await syncFromCloud();
  }, 5000);
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

      if (u.id === OWNER_TG_ID) enableStaffFeatures("👑 Владелец", true);
      else if (STAFF_TG_IDS.includes(u.id)) enableStaffFeatures("⚙️ Сотрудник", false);
    }
  }
}

function enableStaffFeatures(title, isOwner) {
  isAuthorizedUser = true;
  isOwnerUser = isOwner;
  document.getElementById('userRoleBadge').innerText = title;
  document.getElementById('adminFooterBtn').classList.remove('hidden');
}

// ====== СИНХРОНИЗАЦИЯ И ОБЛАЧНОЕ ХРАНИЛИЩЕ ======
function getAppStateJSON() {
  return JSON.stringify({
    EMPLOYEES,
    PUBLIC_REVIEWS,
    PENDING_REVIEWS,
    ORDERS_QUEUE,
    activeUserChats,
    hasPaidOrders,
    updatedAt: Date.now()
  });
}

async function saveState() {
  const jsonStr = getAppStateJSON();
  localStorage.setItem(CLOUD_KEY, jsonStr);

  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
    try {
      window.Telegram.WebApp.CloudStorage.setItem(CLOUD_KEY, jsonStr);
    } catch (e) {
      console.warn("CloudStorage save error:", e);
    }
  }
}

async function loadState() {
  let jsonStr = null;

  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
    try {
      jsonStr = await new Promise((resolve) => {
        window.Telegram.WebApp.CloudStorage.getItem(CLOUD_KEY, (err, value) => {
          if (!err && value) resolve(value);
          else resolve(null);
        });
      });
    } catch (e) {
      console.warn("CloudStorage load error:", e);
    }
  }

  if (!jsonStr) {
    jsonStr = localStorage.getItem(CLOUD_KEY);
  }

  if (jsonStr) {
    applyStateFromJSON(jsonStr);
  }
}

async function syncFromCloud() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
    window.Telegram.WebApp.CloudStorage.getItem(CLOUD_KEY, (err, value) => {
      if (!err && value) {
        applyStateFromJSON(value);
      }
    });
  }
}

function applyStateFromJSON(jsonStr) {
  try {
    const state = JSON.parse(jsonStr);
    if (state.EMPLOYEES) EMPLOYEES = state.EMPLOYEES;
    if (state.PUBLIC_REVIEWS) PUBLIC_REVIEWS = state.PUBLIC_REVIEWS;
    if (state.PENDING_REVIEWS) PENDING_REVIEWS = state.PENDING_REVIEWS;
    if (state.ORDERS_QUEUE) ORDERS_QUEUE = state.ORDERS_QUEUE;
    if (state.activeUserChats) activeUserChats = state.activeUserChats;
    if (typeof state.hasPaidOrders === 'boolean') hasPaidOrders = state.hasPaidOrders;

    renderDropdown();
    renderPublicReviews();
    recalculateTotal();
    if (currentChatId) renderMessages();
  } catch (e) {
    console.error("Error applying state:", e);
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
    btn.innerText = "⬅️ Вернуться в Главное Меню";
    isAdminViewOpen = true;
  } else {
    adminView.classList.add('hidden');
    mainViews.classList.remove('hidden');
    mainNav.classList.remove('hidden');
    btn.innerText = "⚙️ Панель Управления";
    isAdminViewOpen = false;
  }
}

// ====== КАЛЬКУЛЯТОР & ДРОПДАУН ======
function renderDropdown() {
  const menu = document.getElementById('dropdownMenu');
  const selectedBox = document.getElementById('dropdownSelected');
  
  menu.innerHTML = '';
  const activeEmp = EMPLOYEES.find(e => e.id === selectedEmployeeId) || EMPLOYEES[0];

  selectedBox.innerHTML = getEmployeeHtml(activeEmp);

  EMPLOYEES.forEach(emp => {
    const item = document.createElement('div');
    const isAvailable = emp.status === 'ready';
    item.className = `dropdown-item ${!isAvailable ? 'disabled' : ''}`;
    item.innerHTML = getEmployeeHtml(emp);
    item.onclick = (e) => {
      e.stopPropagation();
      if (!isAvailable) {
        alert("Сотрудник находится на отдыхе или неактивен!");
        return;
      }
      selectedEmployeeId = emp.id;
      renderDropdown();
      recalculateTotal();
      toggleDropdown();
    };
    menu.appendChild(item);
  });
}

function getEmployeeHtml(emp) {
  let statusText = "🟢 В сети";
  if (emp.status === 'rest') statusText = "🟡 Отдых";
  if (emp.status === 'inactive') statusText = "🔴 Неактивен";
  if (emp.tgOnly) statusText += " (📱 ТГ)";

  return `
    <img src="${emp.avatar}" class="emp-avatar" alt="Employee Avatar">
    <div class="emp-details">
      <div class="emp-name-row">
        <span class="emp-name">${emp.name}</span>
        <span class="emp-status">${statusText}</span>
      </div>
      <div class="emp-sub-row">
        <span class="stars-gray">★★★★★</span>
        <span class="emp-queue">Очередь: ${emp.queue} чел.</span>
      </div>
    </div>
  `;
}

function toggleDropdown() {
  document.getElementById('dropdownMenu').classList.toggle('hidden');
}

function changeCount(elementId, delta, min, max) {
  const input = document.getElementById(elementId);
  let val = (parseInt(input.value) || min) + delta;
  if (val < min) val = min;
  if (val > max) val = max;
  input.value = val;
  recalculateTotal();
}

function recalculateTotal() {
  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId) || EMPLOYEES[0];
  const cardCount = parseInt(document.getElementById('cardCount').value) || 1;
  const total = cardCount * (emp.ratePerCard || 100);
  
  const display = document.getElementById('totalAmountDisplay');
  if (display) {
    display.innerText = `${total.toLocaleString('ru-RU')} ₽`;
  }
}

function openCalcModal() {
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId);
  const itemCount = parseInt(document.getElementById('itemCount').value) || 1;
  const cardCount = parseInt(document.getElementById('cardCount').value) || 1;
  const total = cardCount * (emp.ratePerCard || 100);

  body.innerHTML = `
    <h3>🧮 Подтверждение заказа</h3>
    <div style="margin-top:12px; font-size:0.85rem; color:#c4b5fd; line-height:1.5;">
      <div><strong>Исполнитель:</strong> ${emp.name}</div>
      <div><strong>Товаров:</strong> ${itemCount} шт.</div>
      <div><strong>Карточек:</strong> ${cardCount} шт.</div>
      <div style="margin-top:8px; font-size:1rem; color:#fff;"><strong>Итого к оплате:</strong> <span style="color:#a78bfa;">${total} ₽</span></div>
    </div>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="primary-btn" onclick="confirmCalc()">Подтвердить</button>
      <button class="primary-btn" style="background:#ef4444" onclick="closeModal()">Отмена</button>
    </div>
  `;
}

async function confirmCalc() {
  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId);
  const itemCount = parseInt(document.getElementById('itemCount').value) || 1;
  const cardCount = parseInt(document.getElementById('cardCount').value) || 1;
  const total = cardCount * (emp.ratePerCard || 100);

  emp.queue += 1;
  renderDropdown();

  const newOrder = {
    id: Date.now().toString().slice(-4),
    client: currentUser.username,
    items: `${itemCount} тов., ${cardCount} карт.`,
    cardCount: cardCount,
    totalAmount: total,
    empId: emp.id,
    time: new Date().toLocaleTimeString().slice(0, 5)
  };

  ORDERS_QUEUE.push(newOrder);

  let chat = activeUserChats.find(c => c.id === emp.id);
  if (!chat) {
    chat = { id: emp.id, name: emp.name, avatar: emp.avatar, messages: [], cardCount: cardCount };
    activeUserChats.push(chat);
  }

  chat.messages.push({
    sender: 'bot',
    text: `📦 Новый заказ #${newOrder.id}! Товаров: ${itemCount}, Карточек: ${cardCount}. Сумма: ${total} ₽.`
  });

  await saveState();
  closeModal();

  openTelegramChatOverlay();
  openSpecificChat(chat.id, chat.name, chat.avatar);
}

// ====== ТЕЛЕГРАМ-ЧАТ ОВЕРЛЕЙ ======
function openTelegramChatOverlay() {
  document.getElementById('tgChatOverlay').classList.remove('hidden');
  renderChatsList();
}

function closeTelegramChatOverlay() {
  document.getElementById('tgChatOverlay').classList.add('hidden');
  backToChatsList();
}

function renderChatsList() {
  const container = document.getElementById('dynamicChatsContainer');
  container.innerHTML = '';

  activeUserChats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.onclick = () => openSpecificChat(c.id, c.name, c.avatar);
    item.innerHTML = `
      <img src="${c.avatar}" class="chat-avatar" alt="Chat Avatar">
      <div class="chat-info">
        <strong>${c.name}</strong>
        <span>Заказ активен</span>
      </div>
    `;
    container.appendChild(item);
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

  let messages = [];
  if (currentChatId === 'support') {
    if (!window.supportMsgs) window.supportMsgs = [{ sender: 'bot', text: 'Здравствуйте! Напишите ваш вопрос.' }];
    messages = window.supportMsgs;
  } else {
    const chat = activeUserChats.find(c => c.id === currentChatId);
    if (chat) messages = chat.messages;
  }

  messages.forEach(m => {
    const wrap = document.createElement('div');
    wrap.className = `msg-wrapper ${m.sender === 'user' ? 'user' : 'bot'}`;
    wrap.innerHTML = `<div class="msg">${m.text}</div>`;
    box.appendChild(wrap);
  });
  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  if (currentChatId === 'support') {
    if (!window.supportMsgs) window.supportMsgs = [];
    window.supportMsgs.push({ sender: 'user', text });
  } else {
    const chat = activeUserChats.find(c => c.id === currentChatId);
    if (chat) chat.messages.push({ sender: 'user', text });
  }

  input.value = '';
  renderMessages();
  await saveState();
}

function handleChatKeyPress(e) {
  if (e.key === 'Enter') sendChatMessage();
}

async function markOrderPaid() {
  hasPaidOrders = true;
  const chat = activeUserChats.find(c => c.id === currentChatId);
  const emp = EMPLOYEES.find(e => e.id === currentChatId);

  if (emp && chat) {
    emp.cardsDone += (chat.cardCount || 1);
    if (emp.queue > 0) emp.queue -= 1;
  }

  renderDropdown();
  await saveState();
  alert("Заказ отмечен как «Оплачено»! Клиенту разблокирована возможность оставить отзыв.");
}

// ====== АДМИН МОДАЛКИ ======
function openAdminModal(type) {
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  if (type === 'orders') {
    if (ORDERS_QUEUE.length === 0) {
      body.innerHTML = `<h3>📦 Биржа заказов</h3><p style="margin-top:10px; color:#c4b5fd;">Активных заказов нет</p>`;
      return;
    }
    let list = ORDERS_QUEUE.map(o => `
      <div style="background:#090412; border:1px solid #2e1b4e; padding:10px; border-radius:10px; margin-top:8px;">
        <strong>Заказ #${o.id} (${o.client}) — ${o.time}</strong><br>
        <small style="color:#c4b5fd">${o.items} | <strong style="color:#a78bfa;">${o.totalAmount || 0} ₽</strong></small><br>
        <button class="primary-btn" style="padding:6px; margin-top:6px; font-size:0.8rem;" onclick="takeOrder('${o.id}')">Принять заказ</button>
      </div>
    `).join('');
    body.innerHTML = `<h3>📦 Биржа заказов (Старые выше)</h3>${list}`;
  }

  if (type === 'status') {
    let empOptions = EMPLOYEES.map(e => `
      <option value="${e.id}" ${e.id === selectedEmployeeId ? 'selected' : ''}>${e.name}</option>
    `).join('');

    const targetEmp = EMPLOYEES.find(e => e.id === selectedEmployeeId) || EMPLOYEES[0];

    body.innerHTML = `
      <h3>🟢 Состояние работы</h3>
      <div style="margin-top:12px;">
        <label style="font-size:0.8rem; color:#c4b5fd;">Выберите сотрудника:</label>
        <select id="adminEmpSelect" class="custom-input" style="margin-top:4px;" onchange="updateStatusModalFields()">
          ${empOptions}
        </select>
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:0.8rem; color:#c4b5fd;">Статус работы:</label>
        <select id="statusSelect" class="custom-input" style="margin-top:4px;">
          <option value="ready" ${targetEmp.status === 'ready' ? 'selected' : ''}>🟢 Готов к работе</option>
          <option value="rest" ${targetEmp.status === 'rest' ? 'selected' : ''}>🟡 Отдых</option>
          <option value="inactive" ${targetEmp.status === 'inactive' ? 'selected' : ''}>🔴 Неактивен</option>
        </select>
      </div>
      <div style="margin-top:12px; display:flex; align-items:center; gap:10px;">
        <input type="checkbox" id="tgOnlyCheck" ${targetEmp.tgOnly ? 'checked' : ''}>
        <label for="tgOnlyCheck" style="font-size:0.85rem;">Принимать только лично в ТГ</label>
      </div>
      <button class="primary-btn" style="margin-top:15px;" onclick="saveStatusSettings()">Сохранить изменения</button>
    `;
  }

  if (type === 'schedule') {
    let empScheduleCards = EMPLOYEES.map(e => `
      <div style="background:#090412; border:1px solid #2e1b4e; padding:10px; border-radius:12px; margin-top:8px;">
        <strong>${e.name}</strong>
        <div style="font-size:0.8rem; color:#c4b5fd; margin-top:4px;">Смена: ${e.schedule ? e.schedule.shift : 'Не задано'}</div>
        <div style="font-size:0.8rem; color:#c4b5fd;">Дни: ${e.schedule ? e.schedule.days : 'Не задано'}</div>
        <button class="sm-btn" style="margin-top:6px;" onclick="editEmpSchedule(${e.id})">✏️ Изменить график</button>
      </div>
    `).join('');

    body.innerHTML = `
      <h3>📅 График работы сотрудников</h3>
      <div style="margin-top:10px;">${empScheduleCards}</div>
    `;
  }

  if (type === 'my-reviews') {
    const myReviews = PUBLIC_REVIEWS.filter(r => r.empId === selectedEmployeeId);
    let listHtml = myReviews.length > 0 
      ? myReviews.map(r => `
          <div class="review-card">
            <div class="review-author">${r.author} (⭐ ${r.rating})</div>
            <div class="review-text">${r.text}</div>
          </div>`).join('')
      : '<p style="font-size:0.8rem; color:#c4b5fd; margin-top:8px;">У вас пока нет отзывов.</p>';

    body.innerHTML = `
      <h3>⭐ Мои отзывы</h3>
      <div style="margin-top:10px;">${listHtml}</div>
    `;
  }

  if (type === 'finance') {
    let rows = EMPLOYEES.map(e => `
      <tr style="border-bottom:1px solid #2e1b4e;">
        <td style="padding:8px;">${e.name}</td>
        <td style="padding:8px; text-align:center;">${e.cardsDone}</td>
        <td style="padding:8px; text-align:center;">
          ${isOwnerUser 
            ? `<input type="number" value="${e.ratePerCard}" onchange="updateRate(${e.id}, this.value)" style="width:60px; background:#090412; border:1px solid #2e1b4e; color:#fff; text-align:center; border-radius:6px;">`
            : `${e.ratePerCard} ₽`}
        </td>
        <td style="padding:8px; text-align:right;"><strong>${e.cardsDone * e.ratePerCard} ₽</strong></td>
      </tr>
    `).join('');

    body.innerHTML = `
      <h3>💰 Финансы & Касса</h3>
      <div style="overflow-x:auto; margin-top:10px;">
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
          <thead>
            <tr style="background:#1f1138; color:#c4b5fd;">
              <th style="padding:8px; text-align:left;">Сотрудник</th>
              <th style="padding:8px;">Карточки</th>
              <th style="padding:8px;">Ставка</th>
              <th style="padding:8px; text-align:right;">Итого</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  if (type === 'moderation') {
    if (PENDING_REVIEWS.length === 0) {
      body.innerHTML = `<h3>🛡️ Модерация</h3><p style="margin-top:10px; color:#c4b5fd;">На модерации нет отзывов</p>`;
      return;
    }
    let list = PENDING_REVIEWS.map(r => `
      <div class="review-card">
        <div class="review-author">${r.author} (⭐ ${r.rating})</div>
        <div class="review-text">${r.text}</div>
        <div style="display:flex; gap:4px; margin-top:8px;">
          <button class="sm-btn success" onclick="approveReview(${r.id})">Одобрить</button>
          <button class="sm-btn" style="background:#ef4444" onclick="rejectReview(${r.id})">Отклонить</button>
        </div>
      </div>
    `).join('');

    body.innerHTML = `<h3>🛡️ Модерация Отзывов</h3><div style="margin-top:10px;">${list}</div>`;
  }
}

function updateStatusModalFields() {
  const targetId = parseInt(document.getElementById('adminEmpSelect').value);
  const emp = EMPLOYEES.find(e => e.id === targetId);
  if (emp) {
    document.getElementById('statusSelect').value = emp.status;
    document.getElementById('tgOnlyCheck').checked = emp.tgOnly;
  }
}

async function saveStatusSettings() {
  const targetId = parseInt(document.getElementById('adminEmpSelect').value);
  const status = document.getElementById('statusSelect').value;
  const tgOnly = document.getElementById('tgOnlyCheck').checked;

  const emp = EMPLOYEES.find(e => e.id === targetId);
  if (emp) {
    emp.status = status;
    emp.tgOnly = tgOnly;
  }
  renderDropdown();
  await saveState();
  closeModal();
  alert(`Настройки для сотрудника "${emp.name}" обновлены!`);
}

function editEmpSchedule(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return;

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <h3>📅 Изменить график: ${emp.name}</h3>
    <div style="margin-top:12px;">
      <label style="font-size:0.8rem; color:#c4b5fd;">Смена / Часы:</label>
      <input type="text" id="schedShiftInput" class="custom-input" style="margin-top:4px;" value="${emp.schedule ? emp.schedule.shift : ''}" placeholder="Например: Смена (09:00 - 21:00)">
    </div>
    <div style="margin-top:12px;">
      <label style="font-size:0.8rem; color:#c4b5fd;">Рабочие дни:</label>
      <input type="text" id="schedDaysInput" class="custom-input" style="margin-top:4px;" value="${emp.schedule ? emp.schedule.days : ''}" placeholder="Например: ПН, ВТ, СР, ПТ">
    </div>
    <button class="primary-btn" style="margin-top:15px;" onclick="saveEmpSchedule(${emp.id})">Сохранить график</button>
  `;
}

async function saveEmpSchedule(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (emp) {
    const shift = document.getElementById('schedShiftInput').value.trim();
    const days = document.getElementById('schedDaysInput').value.trim();
    emp.schedule = { shift, days };
    await saveState();
    alert(`График сотрудника ${emp.name} обновлен!`);
    openAdminModal('schedule');
  }
}

async function updateRate(empId, rate) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (emp) {
    emp.ratePerCard = parseFloat(rate) || 0;
    await saveState();
  }
}

async function takeOrder(orderId) {
  ORDERS_QUEUE = ORDERS_QUEUE.filter(o => o.id !== orderId);
  await saveState();
  alert(`Заказ #${orderId} принят!`);
  closeModal();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ====== ОТЗЫВЫ ======
function renderPublicReviews() {
  const container = document.getElementById('publicReviewsList');
  container.innerHTML = '';

  if (PUBLIC_REVIEWS.length === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:#c4b5fd; text-align:center; padding:20px;">Пока нет отзывов. Будьте первыми!</p>`;
    return;
  }

  PUBLIC_REVIEWS.forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-header">
        <div class="review-author">
          <img src="${r.avatar}" class="chat-avatar-small" alt="Author Avatar">
          <span>${r.author}</span>
        </div>
        <span style="color:#f59e0b; font-size:0.75rem;">★★★★★</span>
      </div>
      <div class="review-text">${r.text}</div>
    `;
    container.appendChild(card);
  });
}

function openAddReviewModal() {
  if (!hasPaidOrders) {
    alert("🔒 Оставить отзыв можно только после того, как исполнитель выполнит ваш заказ и отметив его «Оплачено»!");
    return;
  }

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  body.innerHTML = `
    <h3>⭐ Написать отзыв</h3>
    <textarea id="reviewText" class="custom-input" style="height:80px; margin-top:10px;" placeholder="Ваш отзыв..."></textarea>
    <button class="primary-btn" style="margin-top:10px;" onclick="submitReview()">Отправить на модерацию</button>
  `;
}

async function submitReview() {
  const text = document.getElementById('reviewText').value.trim();
  if (!text) return;

  PENDING_REVIEWS.push({
    id: Date.now(),
    empId: selectedEmployeeId,
    author: currentUser.username,
    avatar: currentUser.avatar,
    rating: 5,
    text: text
  });

  await saveState();
  alert("Спасибо! Ваш отзыв отправлен модератору.");
  closeModal();
}

async function approveReview(id) {
  const idx = PENDING_REVIEWS.findIndex(r => r.id === id);
  if (idx !== -1) {
    const rev = PENDING_REVIEWS.splice(idx, 1)[0];
    PUBLIC_REVIEWS.unshift(rev);
    renderPublicReviews();
    await saveState();
  }
  closeModal();
}

async function rejectReview(id) {
  PENDING_REVIEWS = PENDING_REVIEWS.filter(r => r.id !== id);
  await saveState();
  closeModal();
}
