const OWNER_TG_ID = 6860406379;
const STAFF_TG_IDS = [6860406379, 6546478411, 6527279937];
const ADMIN_SECRET_KEY = "limcash2026";

// Данные о пользователях ТГ
let currentUser = {
  username: "@Guest",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"
};

// Сотрудники с живыми статусами
let EMPLOYEES = [
  { id: 1, name: "John Deyvy Harris", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=John", status: "ready", tgOnly: false, queue: 2, earnings: 1450 },
  { id: 2, name: "Петя (Сотрудник #2)", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker2", status: "rest", tgOnly: false, queue: 0, earnings: 0 },
  { id: 3, name: "Сотрудник #3", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker3", status: "inactive", tgOnly: true, queue: 1, earnings: 0 }
];

let selectedEmployeeId = 1;

// Отзывы
let PUBLIC_REVIEWS = [
  { id: 1, empId: 1, author: "@crypto_king", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", rating: 5, text: "Всё сделано быстро и без проблем! Покупал 3 карточки.", status: "approved" },
  { id: 2, empId: 2, author: "@minsk_user", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Minsk", rating: 5, text: "Отличный сервис, советую всем селлерам!", status: "approved" }
];

let PENDING_REVIEWS = [];

// Очередь заказов на бирже (Старые всегда выше)
let ORDERS_QUEUE = [
  { id: 101, client: "@dmitry_m", amount: "1200 RUB", items: "1 товар, 2 карточки", time: "10:15" },
  { id: 102, client: "@alex_game", amount: "50 BYN", items: "2 товара, 1 карточка", time: "11:30" }
];

let activeUserChats = [];
let currentChatId = null;
let isAuthorizedUser = false;
let isOwnerUser = false;
let isAdminViewOpen = false;

window.addEventListener('DOMContentLoaded', () => {
  initTelegramData();
  renderDropdown();
  renderPublicReviews();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('key') === ADMIN_SECRET_KEY) {
    enableStaffFeatures("👑 Владелец (ПК)", true);
  }
});

function initTelegramData() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
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

function switchMainTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.getElementById(`btn-tab-${tabName}`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Защита от наслоения при открытии Админки
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
        alert("Сотрудник находится на отдыхе или неактивен! Выберите другого.");
        return;
      }
      selectedEmployeeId = emp.id;
      renderDropdown();
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
    <img src="${emp.avatar}" class="emp-avatar">
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
}

function openCalcModal() {
  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId);
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;

  if (amount <= 0) {
    alert("Введите корректную сумму сделки!");
    return;
  }

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  body.innerHTML = `
    <h3>🧮 Расчёт стоимости</h3>
    <p style="margin-top:10px; font-size:0.85rem; color:#c4b5fd;">Выберите валюту для расчёта:</p>
    <div style="display:flex; gap:10px; margin-top:15px;">
      <button class="primary-btn" onclick="confirmCalc('BYN')">BYN (Фиксировано)</button>
      <button class="primary-btn" style="background:#3b82f6" onclick="confirmCalc('RUB')">RUB (₽)</button>
    </div>
  `;
}

function confirmCalc(currency) {
  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId);
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const itemCount = document.getElementById('itemCount').value;
  const cardCount = document.getElementById('cardCount').value;

  emp.queue += 1; // Увеличиваем живой счётчик очереди
  renderDropdown();

  // Добавляем заказ в биржу
  ORDERS_QUEUE.unshift({
    id: Date.now().toString().slice(-3),
    client: currentUser.username,
    amount: `${amount} ${currency}`,
    items: `${itemCount} тов., ${cardCount} карт.`,
    time: "Только что"
  });

  closeModal();

  // Создаём диалог
  let chat = activeUserChats.find(c => c.id === emp.id);
  if (!chat) {
    chat = { id: emp.id, name: emp.name, avatar: emp.avatar, messages: [] };
    activeUserChats.push(chat);
  }

  chat.messages.push({
    sender: 'bot',
    text: `📦 Заказ оформлен! Товаров: ${itemCount}, Карточек: ${cardCount}. Сумма: ${amount} ${currency}. Сотрудник свяжется с вами.`
  });

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
      <img src="${c.avatar}" class="chat-avatar">
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

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  if (currentChatId === 'support') {
    window.supportMsgs.push({ sender: 'user', text });
  } else {
    const chat = activeUserChats.find(c => c.id === currentChatId);
    if (chat) chat.messages.push({ sender: 'user', text });
  }

  input.value = '';
  renderMessages();
}

function handleChatKeyPress(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function markOrderPaid() {
  alert("Сумма заказа отправлена в кассу и зачислена на ваш счёт!");
  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId);
  if (emp) emp.earnings += 1450;
}

// ====== АДМИН МОДАЛКИ ======
function openAdminModal(type) {
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  if (type === 'orders') {
    let list = ORDERS_QUEUE.map(o => `
      <div style="background:#090412; border:1px solid #2e1b4e; padding:10px; border-radius:10px; margin-top:8px;">
        <strong>Заказ #${o.id} (${o.client}) — ${o.time}</strong><br>
        <small style="color:#c4b5fd">${o.items} | ${o.amount}</small><br>
        <button class="primary-btn" style="padding:6px; margin-top:6px; font-size:0.8rem;" onclick="takeOrder(${o.id})">Принять заказ</button>
      </div>
    `).join('');
    body.innerHTML = `<h3>📦 Биржа заказов (Старые выше)</h3>${list}`;
  }

  if (type === 'status') {
    body.innerHTML = `
      <h3>🟢 Состояние работы</h3>
      <div style="margin-top:12px;">
        <label style="font-size:0.8rem; color:#c4b5fd;">Статус работы:</label>
        <select id="statusSelect" class="custom-input" style="margin-top:4px;">
          <option value="ready">🟢 Готов к работе</option>
          <option value="rest">🟡 Отдых</option>
          <option value="inactive">🔴 Неактивен</option>
        </select>
      </div>
      <div style="margin-top:12px; display:flex; align-items:center; gap:10px;">
        <input type="checkbox" id="tgOnlyCheck">
        <label for="tgOnlyCheck" style="font-size:0.85rem;">Принимать только лично в ТГ</label>
      </div>
      <button class="primary-btn" style="margin-top:15px;" onclick="saveStatusSettings()">Сохранить</button>
    `;
  }

  if (type === 'my-reviews') {
    body.innerHTML = `
      <h3>⭐ Мои отзывы</h3>
      <p style="font-size:0.8rem; color:#c4b5fd; margin-top:8px;">Отображаются отзывы только для вашего аккаунта:</p>
      <div style="margin-top:10px;">
        <div class="review-card">
          <div class="review-author">@crypto_king (⭐ 5)</div>
          <div class="review-text">Отличный селлер, сделку провели за 2 минуты!</div>
        </div>
      </div>
    `;
  }

  if (type === 'finance') {
    let ownerBtn = isOwnerUser ? `<button class="primary-btn" style="background:#f59e0b; color:#000; margin-top:12px;" onclick="openSecretOwnerAccounts()">👑 Просмотр всех счетов (Владелец)</button>` : '';
    body.innerHTML = `
      <h3>💰 Финансы & Касса</h3>
      <div style="background:#090412; padding:12px; border-radius:12px; margin-top:10px; border:1px solid #2e1b4e;">
        <div>Заработано: <strong>+1450 RUB</strong></div>
        <small style="color:#c4b5fd;">Сданных заказов: 1</small>
      </div>
      ${ownerBtn}
    `;
  }

  if (type === 'moderation') {
    body.innerHTML = `
      <h3>🛡️ Модерация Отзывов</h3>
      <div style="margin-top:10px;">
        <div class="review-card">
          <div class="review-author">@test_user (⭐ 5)</div>
          <div class="review-text">Быстрая доставка товара, спасибо!</div>
          <div style="display:flex; gap:4px; margin-top:8px;">
            <button class="sm-btn success" onclick="approveReview(1)">Отправить</button>
            <button class="sm-btn" style="background:#f59e0b" onclick="reworkReview(1)">Переделка</button>
            <button class="sm-btn" style="background:#ef4444" onclick="rejectReview(1)">Отклонить</button>
          </div>
        </div>
      </div>
    `;
  }
}

function saveStatusSettings() {
  const status = document.getElementById('statusSelect').value;
  const tgOnly = document.getElementById('tgOnlyCheck').checked;

  const emp = EMPLOYEES.find(e => e.id === selectedEmployeeId);
  if (emp) {
    emp.status = status;
    emp.tgOnly = tgOnly;
  }
  renderDropdown();
  closeModal();
  alert("Настройки состояния успешно обновлены!");
}

function openSecretOwnerAccounts() {
  const body = document.getElementById('modalBody');
  let list = EMPLOYEES.map(e => `
    <div style="background:#090412; padding:8px; border-radius:8px; margin-top:6px; border:1px solid #2e1b4e; font-size:0.82rem;">
      <strong>${e.name}</strong>: ${e.earnings} RUB (Заказов в очереди: ${e.queue})
    </div>
  `).join('');

  body.innerHTML = `<h3>👑 Секретные счета всех сотрудников</h3>${list}`;
}

function takeOrder(orderId) {
  alert(`Заказ #${orderId} успешно взят в работу!`);
  closeModal();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ====== ОТЗЫВЫ ======
function renderPublicReviews() {
  const container = document.getElementById('publicReviewsList');
  container.innerHTML = '';

  PUBLIC_REVIEWS.forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-header">
        <div class="review-author">
          <img src="${r.avatar}" class="chat-avatar-small">
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
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  body.innerHTML = `
    <h3>⭐ Написать отзыв</h3>
    <textarea id="reviewText" class="custom-input" style="height:80px; margin-top:10px;" placeholder="Ваш отзыв..."></placeholder>
    <button class="primary-btn" style="margin-top:10px;" onclick="submitReview()">Отправить на модерацию</button>
  `;
}

function submitReview() {
  const text = document.getElementById('reviewText').value;
  if (!text) return;

  alert("Спасибо! Ваш отзыв отправлен на модерацию.");
  closeModal();
}

function approveReview(id) {
  alert("Отзыв одобрен и опубликован!");
  closeModal();
}

function reworkReview(id) {
  alert("Запрос на редактирование отправлен клиенту от имени поддержки.");
  closeModal();
}

function rejectReview(id) {
  alert("Отзыв отклонён. Селлеру отправлено автоматическое уведомление.");
  closeModal();
}
