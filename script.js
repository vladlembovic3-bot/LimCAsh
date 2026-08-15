// ====== НАСТРОЙКИ ДОСТУПА ======
const OWNER_TG_ID = 6860406379; // John (Владелец)

const STAFF_TG_IDS = [
  6860406379, // John (Владелец)
  6546478411, // Сотрудник #2
  6527279937  // Сотрудник #3
];

const ADMIN_SECRET_KEY = "limcash2026"; // Ключ для ПК

const EMPLOYEES = [
  {
    id: 1,
    name: "John Deyvy Harris",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=John",
    rating: 4.9,
    reviewsCount: 18,
    queueLength: 2
  },
  {
    id: 2,
    name: "Сотрудник #2",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker2",
    rating: 5.0,
    reviewsCount: 10,
    queueLength: 0
  },
  {
    id: 3,
    name: "Сотрудник #3",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker3",
    rating: 5.0,
    reviewsCount: 5,
    queueLength: 0
  }
];

// ОТЗЫВЫ В СТИЛЕ 1-Й ВЕРСИИ
const V1_REVIEWS = [
  { author: "@crypto_man", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", rating: 5, text: "Всё супер! Быстро оформили и выдали товар.", date: "Вчера" },
  { author: "@minsk_buyer", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Minsk", rating: 5, text: "Лучший курс и мгновенный ответ от John.", date: "12 авг" },
  { author: "@vlad_88", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vlad", rating: 4.8, text: "Хороший сервис, рекомендую к сотрудничеству.", date: "10 авг" }
];

// Фиксированный курс RUB/BYN для расчёта (можно менять при желании)
let EXCHANGE_RATE_BYN_TO_RUB = 29.2; 
let isAuthorizedUser = false;
let isAdminViewOpen = false;

window.addEventListener('DOMContentLoaded', () => {
  renderEmployeeSelectOptions();
  renderV1Reviews();
  calculate();

  // 1. Вход через ПК по ключу ?key=limcash2026
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('key') === ADMIN_SECRET_KEY) {
    enableStaffFeatures("👑 Владелец (ПК)", true);
    return;
  }

  // 2. Вход через Telegram Mini App
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const user = tg.initDataUnsafe.user;
      if (user.id === OWNER_TG_ID) {
        enableStaffFeatures("👑 Владелец", true);
        return;
      }
      if (STAFF_TG_IDS.includes(user.id)) {
        enableStaffFeatures("⚙️ Сотрудник", false);
        return;
      }
    }
  }
});

function enableStaffFeatures(roleTitle, isOwner) {
  isAuthorizedUser = true;
  document.getElementById('userRoleBadge').innerText = roleTitle;
  document.getElementById('adminFooterBtn').classList.remove('hidden');

  if (isOwner) {
    document.getElementById('ownerPanelCard').classList.remove('hidden');
  }
}

// ПЕРЕКЛЮЧЕНИЕ 3-Х ГЛАВНЫХ ПАНЕЛЕЙ
function switchMainTab(tabName) {
  isAdminViewOpen = false;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.getElementById(`btn-tab-${tabName}`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ВХОД И ВЫХОД ИЗ АДМИНКИ (Нижняя кнопка)
function toggleAdminPanel() {
  if (!isAuthorizedUser) return;

  const adminTab = document.getElementById('tab-admin');
  const btn = document.querySelector('.admin-toggle-btn');

  if (!isAdminViewOpen) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    adminTab.classList.add('active');
    btn.innerText = "⬅️ Вернуться на Главную";
    isAdminViewOpen = true;
  } else {
    switchMainTab('calc');
    btn.innerText = "⚙️ Панель Управления";
  }
}

// ====== КАЛЬКУЛЯТОР ======
function renderEmployeeSelectOptions() {
  const select = document.getElementById('employeeSelect');
  if (!select) return;
  select.innerHTML = '';

  EMPLOYEES.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.innerText = `${emp.name} (⭐ ${emp.rating} | Очередь: ${emp.queueLength})`;
    select.appendChild(opt);
  });
}

function onEmployeeSelectChange(val) {
  calculate();
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
    const inRub = total * EXCHANGE_RATE_BYN_TO_RUB;
    rubElem.innerText = `≈ ${inRub.toFixed(2)} ₽`;
  } else {
    const inByn = total / EXCHANGE_RATE_BYN_TO_RUB;
    rubElem.innerText = `≈ ${inByn.toFixed(2)} Br`;
  }
}

function executeCalculation() {
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const count = parseInt(document.getElementById('itemCount').value) || 1;
  const curr = document.getElementById('currencySelect').value;

  document.getElementById('finalPriceDisplay').innerText = `${(amount * count).toFixed(2)} ${curr}`;
  document.getElementById('resultBox').classList.remove('hidden');
}

// ====== РЕНДЕР ОТЗЫВОВ V1 ======
function renderV1Reviews() {
  const container = document.getElementById('publicReviewsList');
  if (!container) return;
  container.innerHTML = '';

  V1_REVIEWS.forEach(rev => {
    const card = document.createElement('div');
    card.className = 'v1-review-card';
    card.innerHTML = `
      <div class="v1-review-top">
        <img src="${rev.avatar}" class="v1-avatar">
        <div class="v1-author-info">
          <strong>${rev.author}</strong>
          <span>${"⭐".repeat(Math.floor(rev.rating))} (${rev.date})</span>
        </div>
      </div>
      <p class="v1-review-text">${rev.text}</p>
    `;
    container.appendChild(card);
  });
}

// ====== ЧАТ ПОДДЕРЖКИ ======
function handleChatKeyPress(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const msgBox = document.getElementById('chatMessages');

  // Сообщение пользователя
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.innerText = text;
  msgBox.appendChild(userMsg);

  input.value = '';
  msgBox.scrollTop = msgBox.scrollHeight;

  // Авто-ответ бота через секунду
  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'msg bot';
    botMsg.innerText = "Спасибо! Ваше сообщение отправлено оператору. Ожидайте ответа.";
    msgBox.appendChild(botMsg);
    msgBox.scrollTop = msgBox.scrollHeight;
  }, 1000);
}

// ====== МОДАЛКИ ======
function openAdminModal(type) {
  if (!isAuthorizedUser) return;
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  if (type === 'orders') {
    body.innerHTML = `<h3>📦 Очередь заказов</h3><p style="margin-top:10px; color:#d8b4fe;">Заказ #104 — Ключи активации (3 шт)</p>`;
  } else if (type === 'chats') {
    body.innerHTML = `<h3>💬 Активные чаты</h3><p style="margin-top:10px; color:#d8b4fe;">Диалог с @seller_alex</p>`;
  } else if (type === 'my-reviews') {
    body.innerHTML = `<h3>⭐ Мои Отзывы</h3><p style="margin-top:10px; color:#d8b4fe;">⭐ 5.0 — @alex_top</p>`;
  } else if (type === 'owner-moderation') {
    body.innerHTML = `<h3 style="color:#f59e0b;">👑 Панель Модерации</h3><p style="margin-top:10px; color:#d8b4fe;">Управление всеми отзывами и чатами</p>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function updateWorkStatus(val) {
  if (!isAuthorizedUser) return;
  alert(`Статус изменен на: ${val}`);
}
