const OWNER_TG_ID = 6860406379;
const STAFF_TG_IDS = [6860406379, 6546478411, 6527279937];
const ADMIN_SECRET_KEY = "limcash2026";

const EMPLOYEES = [
  { id: 1, name: "John Deyvy Harris", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=John", rating: 4.9, queueLength: 2 },
  { id: 2, name: "Сотрудник #2", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker2", rating: 5.0, queueLength: 0 },
  { id: 3, name: "Сотрудник #3", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker3", rating: 5.0, queueLength: 0 }
];

const V1_REVIEWS = [
  { author: "@crypto_man", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", rating: 5, text: "Всё супер! Быстро оформили.", date: "Вчера" },
  { author: "@minsk_buyer", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Minsk", rating: 5, text: "Лучший курс и быстро зачислили.", date: "12 авг" }
];

// Активные заказы на бирже для селлеров
let ORDERS_QUEUE = [
  { id: 101, client: "@alex_game", amount: "50.00 BYN", item: "3 Ключа активации", status: "Свободен" },
  { id: 102, client: "@dmitry_m", amount: "1200.00 RUB", item: "Игровая валюта", status: "Свободен" }
];

let activeUserChats = [];
let currentActiveChatId = null;
let isAuthorizedUser = false;
let isAdminViewOpen = false;

window.addEventListener('DOMContentLoaded', () => {
  renderEmployeesSelect();
  renderReviews();
  calculate();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('key') === ADMIN_SECRET_KEY) {
    enableStaffFeatures("👑 Владелец (ПК)", true);
    return;
  }

  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      if (u.id === OWNER_TG_ID) enableStaffFeatures("👑 Владелец", true);
      else if (STAFF_TG_IDS.includes(u.id)) enableStaffFeatures("⚙️ Сотрудник", false);
    }
  }
});

function enableStaffFeatures(title, isOwner) {
  isAuthorizedUser = true;
  document.getElementById('userRoleBadge').innerText = title;
  document.getElementById('adminFooterBtn').classList.remove('hidden');
  if (isOwner) document.getElementById('ownerPanelCard').classList.remove('hidden');
}

function switchMainTab(tabName) {
  isAdminViewOpen = false;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.getElementById(`btn-tab-${tabName}`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

function toggleAdminPanel() {
  if (!isAuthorizedUser) return;
  const adminTab = document.getElementById('tab-admin');
  const btn = document.querySelector('.admin-toggle-btn');

  if (!isAdminViewOpen) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    adminTab.classList.add('active');
    btn.innerText = "⬅️ На Главную";
    isAdminViewOpen = true;
  } else {
    switchMainTab('calc');
    btn.innerText = "⚙️ Панель Управления";
  }
}

// ====== КАЛЬКУЛЯТОР ======
function renderEmployeesSelect() {
  const select = document.getElementById('employeeSelect');
  select.innerHTML = '';
  EMPLOYEES.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.innerText = `${e.name} (⭐ ${e.rating} | В очереди: ${e.queueLength})`;
    select.appendChild(opt);
  });
}

function changeItemCount(delta) {
  const input = document.getElementById('itemCount');
  input.value = Math.max(1, (parseInt(input.value) || 1) + delta);
  calculate();
}

function calculate() {
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const count = parseInt(document.getElementById('itemCount').value) || 1;
  const curr = document.getElementById('currencySelect').value;
  const total = amount * count;

  const rubElem = document.getElementById('rubConversion');
  if (curr === 'BYN') {
    rubElem.innerText = `≈ ${(total * 29.2).toFixed(2)} ₽`;
  } else {
    rubElem.innerText = `≈ ${(total / 29.2).toFixed(2)} Br`;
  }
}

function executeCalculationAndOpenChat() {
  const empId = parseInt(document.getElementById('employeeSelect').value);
  const emp = EMPLOYEES.find(e => e.id === empId);
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const count = parseInt(document.getElementById('itemCount').value) || 1;
  const curr = document.getElementById('currencySelect').value;

  if (amount <= 0) {
    alert("Введите сумму сделки!");
    return;
  }

  // Создаём или находим чат с сотрудником
  let chat = activeUserChats.find(c => c.id === emp.id);
  if (!chat) {
    chat = { id: emp.id, name: emp.name, avatar: emp.avatar, queue: emp.queueLength, messages: [] };
    activeUserChats.push(chat);
  }

  chat.messages.push({
    sender: 'bot',
    text: `📦 Заказ сформирован: ${count} шт. на сумму ${(amount * count).toFixed(2)} ${curr}. Ожидайте ответа сотрудника.`
  });

  renderUserChatsList();
  switchMainTab('chats');
  openChatRoom(chat.id, chat.name, chat.avatar, chat.queue);
}

// ====== ЧАТЫ ======
function renderUserChatsList() {
  const container = document.getElementById('dynamicChatsList');
  container.innerHTML = '';

  activeUserChats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.onclick = () => openChatRoom(c.id, c.name, c.avatar, c.queue);
    item.innerHTML = `
      <img src="${c.avatar}" class="chat-avatar">
      <div class="chat-info">
        <strong>${c.name}</strong>
        <span>Очередь: ${c.queue} чел.</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function openChatRoom(id, name, avatar, queue = 0) {
  currentActiveChatId = id;
  document.getElementById('chatsListSection').classList.add('hidden');
  document.getElementById('chatRoomSection').classList.remove('hidden');

  document.getElementById('chatHeaderAvatar').src = avatar;
  document.getElementById('chatHeaderName').innerText = name;
  document.getElementById('chatHeaderSub').innerText = id === 'support' ? 'Онлайн-администратор' : `В очереди: ${queue} чел.`;

  renderChatMessages();
}

function closeChatRoom() {
  document.getElementById('chatRoomSection').classList.add('hidden');
  document.getElementById('chatsListSection').classList.remove('hidden');
}

function renderChatMessages() {
  const box = document.getElementById('chatMessagesBox');
  box.innerHTML = '';

  let messages = [];
  if (currentActiveChatId === 'support') {
    if (!window.supportMessages) window.supportMessages = [{ sender: 'bot', text: 'Здравствуйте! Чем можем помочь?' }];
    messages = window.supportMessages;
  } else {
    const chat = activeUserChats.find(c => c.id === currentActiveChatId);
    if (chat) messages = chat.messages;
  }

  messages.forEach((m, index) => {
    const wrap = document.createElement('div');
    wrap.className = `msg-wrapper ${m.sender === 'user' ? 'user' : 'bot'}`;

    let delBtnHtml = isAuthorizedUser ? `<button class="msg-delete-btn" onclick="deleteMessage(${index})">Удалить</button>` : '';

    wrap.innerHTML = `
      <div class="msg">${m.text}</div>
      ${delBtnHtml}
    `;
    box.appendChild(wrap);
  });

  box.scrollTop = box.scrollHeight;
}

function handleChatKeyPress(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  if (currentActiveChatId === 'support') {
    window.supportMessages.push({ sender: 'user', text });
  } else {
    const chat = activeUserChats.find(c => c.id === currentActiveChatId);
    if (chat) chat.messages.push({ sender: 'user', text });
  }

  input.value = '';
  renderChatMessages();
}

function deleteMessage(index) {
  if (currentActiveChatId === 'support') {
    window.supportMessages.splice(index, 1);
  } else {
    const chat = activeUserChats.find(c => c.id === currentActiveChatId);
    if (chat) chat.messages.splice(index, 1);
  }
  renderChatMessages();
}

// ====== ОЧЕРЕДЬ ЗАКАЗОВ (БИРЖА) ======
function openOrdersQueueModal() {
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  let listHtml = ORDERS_QUEUE.map(o => `
    <div style="background:#090412; border:1px solid #2e1b4e; padding:10px; border-radius:10px; margin-top:8px;">
      <strong>Заказ #${o.id} (${o.client})</strong><br>
      <small style="color:#c4b5fd">${o.item} — ${o.amount}</small><br>
      <button class="primary-btn" style="padding:6px; margin-top:6px; font-size:0.8rem;" onclick="takeOrder(${o.id})">Принять заказ в работу</button>
    </div>
  `).join('');

  body.innerHTML = `<h3>📦 Биржа заказов</h3>${listHtml || '<p style="margin-top:10px;">Нет свободных заказов</p>'}`;
}

function takeOrder(orderId) {
  alert(`Вы успешно взяли заказ #${orderId}! Диалог создан.`);
  closeModal();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function renderReviews() {
  const container = document.getElementById('publicReviewsList');
  container.innerHTML = '';
  V1_REVIEWS.forEach(r => {
    const card = document.createElement('div');
    card.className = 'v1-review-card';
    card.innerHTML = `
      <div class="v1-review-top">
        <img src="${r.avatar}" class="v1-avatar">
        <div>
          <strong>${r.author}</strong>
          <span style="color:#f59e0b; font-size:0.75rem;">${"⭐".repeat(r.rating)} (${r.date})</span>
        </div>
      </div>
      <p style="font-size:0.85rem; color:#c4b5fd;">${r.text}</p>
    `;
    container.appendChild(card);
  });
}

function updateWorkStatus(val) {
  alert(`Статус изменён на: ${val}`);
}
