// ====== НАСТРОЙКИ ДОСТУПА ======
const OWNER_TG_ID = 6860406379; // John (Владелец)

const STAFF_TG_IDS = [
  6860406379, // John (Владелец)
  6546478411, // Сотрудник #2
  6527279937  // Сотрудник #3
];

const ADMIN_SECRET_KEY = "limcash2026"; // Ключ входа через ПК

const EMPLOYEES = [
  {
    id: 1,
    tgId: 6860406379,
    username: "@John_Deyvy_Harris",
    name: "John Deyvy Harris",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=John",
    rating: 4.9,
    reviewsCount: 18,
    queueLength: 2
  },
  {
    id: 2,
    tgId: 6546478411,
    username: null,
    name: "Сотрудник #2",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker2",
    rating: 5.0,
    reviewsCount: 10,
    queueLength: 0
  },
  {
    id: 3,
    tgId: 6527279937,
    username: null,
    name: "Сотрудник #3",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker3",
    rating: 5.0,
    reviewsCount: 5,
    queueLength: 0
  }
];

// ПРИМЕР ОТЗЫВОВ (1 Панель)
const PUBLIC_REVIEWS = [
  { author: "@crypto_man", rating: 5, text: "Всё супер! Быстро оформили и выдали.", date: "Вчера" },
  { author: "@minsk_buyer", rating: 5, text: "Лучший курс и мгновенный ответ от John.", date: "12 авг" },
  { author: "@vlad_88", rating: 4.8, text: "Хороший сервис, рекомендую.", date: "10 авг" }
];

let RATES = { USD: 1.0, EUR: 0.92, BYN: 3.25, RUB: 95.0 };
let isAuthorizedUser = false;
let isAdminViewOpen = false;

// АВТО-КУРС
async function fetchExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.rates) {
      RATES.USD = 1.0;
      RATES.EUR = data.rates.EUR || RATES.EUR;
      RATES.BYN = data.rates.BYN || RATES.BYN;
      RATES.RUB = data.rates.RUB || RATES.RUB;
    }
  } catch (e) {
    console.warn("Ошибка подгрузки курсов, используем резервные.");
  } finally {
    calculate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  renderEmployeeSelect();
  renderPublicReviews();
  fetchExchangeRates();

  // Проверка на секретный ключ ПК
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('key') === ADMIN_SECRET_KEY) {
    enableStaffFeatures("👑 Владелец (ПК)", true);
    return;
  }

  // Проверка на Telegram Mini App
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

// Активация кнопки управления внизу для админов
function enableStaffFeatures(roleTitle, isOwner) {
  isAuthorizedUser = true;
  document.getElementById('userRoleBadge').innerText = roleTitle;
  document.getElementById('adminFooterBtn').classList.remove('hidden');

  if (isOwner) {
    document.getElementById('ownerPanelCard').classList.remove('hidden');
  }
}

// ПЕРЕКЛЮЧЕНИЕ МЕЖДУ 3 ОСНОВНЫМИ ПАНЕЛЯМИ
function switchMainTab(tabName) {
  isAdminViewOpen = false;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.getElementById(`btn-tab-${tabName}`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// КНОПКА ВНИЗУ: Переключение в Админку и обратно
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
    btn.innerText = "⚙️ Войти в Панель Управления";
  }
}

// ====== КАЛЬКУЛЯТОР ======
function renderEmployeeSelect() {
  const listContainer = document.getElementById('employeeList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  EMPLOYEES.forEach(emp => {
    const item = document.createElement('div');
    item.className = 'employee-item';
    item.innerHTML = `
      <img src="${emp.avatar}" class="emp-avatar">
      <div class="emp-info">
        <strong>${emp.name}</strong>
        <span>⭐ ${emp.rating} (${emp.reviewsCount} отзывов) | Очередь: ${emp.queueLength}</span>
      </div>
    `;
    item.onclick = (e) => { e.stopPropagation(); selectEmployee(emp); };
    listContainer.appendChild(item);
  });

  selectEmployee(EMPLOYEES[0]);
}

function selectEmployee(emp) {
  document.getElementById('selectedEmployee').innerHTML = `
    <div class="employee-item" style="padding:0;">
      <img src="${emp.avatar}" class="emp-avatar">
      <div class="emp-info">
        <strong>${emp.name}</strong>
        <span>⭐ ${emp.rating} | Очередь: ${emp.queueLength} заказов</span>
      </div>
    </div>
  `;
  toggleEmployeeDropdown(false);
}

function toggleEmployeeDropdown(forceState) {
  const list = document.getElementById('employeeList');
  if (list) list.classList.toggle('select-hide', forceState !== undefined ? !forceState : undefined);
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

  const totalInput = amount * count;
  const totalUSD = totalInput / RATES[curr];
  const totalRUB = totalUSD * RATES.RUB;

  const rubElem = document.getElementById('rubConversion');
  if (rubElem) rubElem.innerText = `≈ ${totalRUB.toFixed(2)} ₽ (По рыночному курсу)`;
}

function executeCalculation() {
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const count = parseInt(document.getElementById('itemCount').value) || 1;
  const curr = document.getElementById('currencySelect').value;

  document.getElementById('finalPriceDisplay').innerText = `${(amount * count).toFixed(2)} ${curr}`;
  document.getElementById('resultBox').classList.remove('hidden');
}

// ====== РЕНДЕР ОТЗЫВОВ ======
function renderPublicReviews() {
  const container = document.getElementById('publicReviewsList');
  if (!container) return;
  container.innerHTML = '';

  PUBLIC_REVIEWS.forEach(rev => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-top">
        <strong>${rev.author}</strong>
        <span class="stars">{"⭐".repeat(Math.floor(rev.rating))}</span>
      </div>
      <p class="review-text">${rev.text}</p>
      <small class="review-date">${rev.date}</small>
    `;
    container.appendChild(card);
  });
}

// ====== МОДАЛКИ И АДМИНКА ======
function openAdminModal(type) {
  if (!isAuthorizedUser) return;
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  if (type === 'orders') {
    body.innerHTML = `<h3>📦 Очередь заказов</h3><p style="margin-top:10px; color:#94a3b8;">Заказ #104 — Ключи активации (3 шт)</p>`;
  } else if (type === 'chats') {
    body.innerHTML = `<h3>💬 Активные чаты</h3><p style="margin-top:10px; color:#94a3b8;">Диалог с @seller_alex</p>`;
  } else if (type === 'my-reviews') {
    body.innerHTML = `<h3>⭐ Мои Отзывы</h3><p style="margin-top:10px; color:#94a3b8;">⭐ 5.0 — @alex_top</p>`;
  } else if (type === 'owner-moderation') {
    body.innerHTML = `<h3 style="color:#f59e0b;">👑 Панель Модерации</h3><p style="margin-top:10px; color:#94a3b8;">Управление чатами и отзывами сотрудников</p>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function updateWorkStatus(val) {
  if (!isAuthorizedUser) return;
  alert(`Статус изменен на: ${val}`);
}
