// ====== НАСТРОЙКИ ДОСТУПА ======
const OWNER_TG_ID = 123456789; // 👈 Вставь свой Telegram ID

const STAFF_TG_IDS = [
  123456789,
  987654321,
  112233445
];

const ADMIN_SECRET_KEY = "limcash2026"; // Ключ для входа с ПК через браузер

const EMPLOYEES = [
  {
    id: 1,
    tgId: 987654321,
    username: "@John_Deyvy_Harris",
    phone: "+375 29 232 1077",
    name: "John Deyvy Harris",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=John",
    rating: 4.9,
    reviewsCount: 18,
    status: "ready",
    queueLength: 2
  },
  {
    id: 2,
    tgId: 112233445,
    username: null,
    phone: "+375 29 504 2673",
    name: "Сотрудник #2",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Worker2",
    rating: 5.0,
    reviewsCount: 10,
    status: "ready",
    queueLength: 0
  }
];

const RATES = { USD: 1, EUR: 0.92, RUB: 90.0, BYN: 3.25 };
let selectedEmployeeId = 1;
let isAuthorizedUser = false;

window.addEventListener('DOMContentLoaded', () => {
  renderEmployeeSelect();
  calculate();

  // 1. Проверка входа по SECRET KEY в URL адресе
  const urlParams = new URLSearchParams(window.location.search);
  const secretKey = urlParams.get('key');

  if (secretKey === ADMIN_SECRET_KEY) {
    isAuthorizedUser = true;
    document.getElementById('ownerPanelCard').classList.remove('hidden');
    openAdminOnlyView("👑 Владелец (ПК)");
    return;
  }

  // 2. Проверка входа через Telegram Mini App
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.expand();

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const user = tg.initDataUnsafe.user;

      if (user.id === OWNER_TG_ID) {
        isAuthorizedUser = true;
        document.getElementById('ownerPanelCard').classList.remove('hidden');
        openAdminOnlyView("👑 Владелец");
        return;
      }

      if (STAFF_TG_IDS.includes(user.id)) {
        isAuthorizedUser = true;
        openAdminOnlyView("⚙️ Сотрудник");
        return;
      }
    }
  }

  // Обычный гость: Админка остается скрытой
  document.getElementById('tab-calc').classList.add('active');
  document.getElementById('tab-admin').classList.remove('active');
});

function openAdminOnlyView(roleTitle) {
  document.getElementById('userRoleBadge').innerText = roleTitle;
  document.getElementById('tab-calc').classList.remove('active');
  document.getElementById('tab-admin').classList.add('active');
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
        <strong>${emp.name} (${emp.username || emp.phone})</strong>
        <span>⭐ ${emp.rating} (${emp.reviewsCount} отзывов) | ⏳ Очередь: ${emp.queueLength}</span>
      </div>
    `;
    item.onclick = (e) => {
      e.stopPropagation();
      selectEmployee(emp);
    };
    listContainer.appendChild(item);
  });

  selectEmployee(EMPLOYEES[0]);
}

function selectEmployee(emp) {
  selectedEmployeeId = emp.id;
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
  if (list) {
    list.classList.toggle('select-hide', forceState !== undefined ? !forceState : undefined);
  }
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

  const totalBaseUSD = (amount * count) / RATES[curr];

  document.getElementById('conversionBox').innerText = 
    `Конвертация заказа: $${(totalBaseUSD * RATES.USD).toFixed(2)} / ${(totalBaseUSD * RATES.BYN).toFixed(2)} Br / ${(totalBaseUSD * RATES.RUB).toFixed(2)} ₽`;
}

function executeCalculation() {
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const count = parseInt(document.getElementById('itemCount').value) || 1;
  const curr = document.getElementById('currencySelect').value;

  document.getElementById('finalPriceDisplay').innerText = `${(amount * count).toFixed(2)} ${curr}`;
  document.getElementById('resultBox').classList.remove('hidden');
}

// ====== МОДАЛКИ И АДМИНКА ======
function openAdminModal(type) {
  if (!isAuthorizedUser) {
    alert("Ошибка: Доступ запрещен.");
    return;
  }

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  overlay.classList.remove('hidden');

  if (type === 'orders') {
    body.innerHTML = `
      <h3>📦 Очередь заказов</h3>
      <div style="background:#0f172a; padding:12px; border-radius:10px; margin-top:10px;">
        <strong>Заказ #104 (Селлер: @crypto_seller)</strong><br>
        <small style="color:#94a3b8">Товар: Ключи активации (3 шт)</small>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="secondary-btn" onclick="alert('Право отзыва выдано!')">⭐️ Выдать отзыв</button>
          <button class="secondary-btn" onclick="alert('Товар передан!')">📦 Выдать товар</button>
        </div>
      </div>
    `;
  } else if (type === 'chats') {
    body.innerHTML = `
      <h3>💬 Чаты</h3>
      <div style="margin-top:10px;">
        <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">💬 Диалог с @seller_alex (Активен)</div>
      </div>
    `;
  } else if (type === 'my-reviews') {
    body.innerHTML = `
      <h3>⭐ Мои Отзывы</h3>
      <div style="background:#0f172a; padding:10px; border-radius:8px; margin-top:10px;">
        <strong>⭐ 5.0 — @alex_top</strong>
        <p style="font-size:0.85rem; color:#94a3b8;">Отличная работа, всё быстро!</p>
      </div>
    `;
  } else if (type === 'owner-moderation') {
    body.innerHTML = `
      <h3 style="color:#f59e0b;">👑 Модерация Чатов и Отзывов</h3>
      
      <h4 style="margin-top:12px;">🔴 Удаление отзывов:</h4>
      <div style="background:#0f172a; padding:10px; border-radius:8px; margin-top:6px;">
        <span>Отзыв #42 от @fake_user (1 звезда)</span>
        <button style="background:#ef4444; color:#fff; border:none; padding:5px 10px; border-radius:6px; margin-top:6px; cursor:pointer;" onclick="this.parentElement.remove()">Удалить отзыв</button>
      </div>

      <h4 style="margin-top:15px;">👁️ Доступ к чатам сотрудников:</h4>
      <div style="background:#0f172a; padding:10px; border-radius:8px; margin-top:6px;">
        <span>Чат #12: John ↔ @buyer</span>
        <button class="secondary-btn" style="margin-top:6px;" onclick="alert('Логи чата открыты')">Войти в диалог</button>
      </div>
    `;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function updateWorkStatus(val) {
  if (!isAuthorizedUser) return;
  alert(`Ваш рабочий статус изменен на: ${val}`);
}
