const SERVER_URL = "https://82768f7526f1f5.lhr.life"; // Измените при смене туннеля
const socket = io(SERVER_URL);

let tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// Данные текущего пользователя
let currentUser = tg?.initDataUnsafe?.user || { id: 6860406379, first_name: "Владелец (Тест)" };

let currentRole = 'client';
let currentRate = 28.5;
let staffList = [];
let appState = { orders: [], reviews: [], messages: [] };

let isCalculated = false;
let calculatedData = null;

// Элементы UI
const roleBadge = document.getElementById('role-badge');
const staffSelect = document.getElementById('staff-select');
const cardsCountInput = document.getElementById('cards-count');
const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');
const priceByn = document.getElementById('price-byn');
const priceRub = document.getElementById('price-rub');
const calcActionBtn = document.getElementById('calc-action-btn');
const addReviewBtn = document.getElementById('add-review-btn');
const navAdminBtn = document.getElementById('nav-admin-btn');

// Подключение и авторизация
socket.emit('auth', currentUser);

socket.on('initData', (data) => {
  currentRole = data.role;
  currentRate = data.rubRate;
  staffList = data.staffList;
  appState = data.state;

  renderRoleBadge();
  renderStaffList();
  updatePriceDisplay();
  renderAppState();
});

socket.on('stateUpdate', (newState) => {
  appState = newState;
  renderAppState();
});

socket.on('newMessage', (msg) => {
  appState.messages.push(msg);
  renderMessages();
});

// Переключение вкладок
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    switchTab(targetTab);
  });
});

function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  const activeNav = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  const activeTab = document.getElementById(tabId);

  if (activeNav) activeNav.classList.add('active');
  if (activeTab) activeTab.classList.add('active');
}

// Отображение роли
function renderRoleBadge() {
  if (currentRole === 'owner') {
    roleBadge.textContent = 'Владелец';
    navAdminBtn.style.display = 'flex';
  } else if (currentRole === 'staff') {
    roleBadge.textContent = 'Сотрудник';
    navAdminBtn.style.display = 'flex';
  } else {
    roleBadge.textContent = 'Клиент';
    navAdminBtn.style.display = 'none';
  }
}

// Заполнение списка сотрудников
function renderStaffList() {
  staffSelect.innerHTML = '';
  staffList.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    staffSelect.appendChild(opt);
  });
}

// Управление счетчиком карточек
btnMinus.onclick = () => {
  let val = parseInt(cardsCountInput.value) || 1;
  if (val > 1) {
    cardsCountInput.value = val - 1;
    resetCalculation();
  }
};

btnPlus.onclick = () => {
  let val = parseInt(cardsCountInput.value) || 1;
  cardsCountInput.value = val + 1;
  resetCalculation();
};

staffSelect.onchange = () => resetCalculation();

function resetCalculation() {
  isCalculated = false;
  calculatedData = null;
  calcActionBtn.textContent = 'Рассчитать';
  calcActionBtn.style.background = '#8b5cf6';
  updatePriceDisplay();
}

function updatePriceDisplay() {
  const count = parseInt(cardsCountInput.value) || 1;
  const byn = count * 5;
  const rub = Math.round(byn * currentRate);
  priceByn.textContent = `${byn} BYN`;
  priceRub.textContent = `~ ${rub} ₽`;
}

// Логика кнопки "Рассчитать" / "Перейти к заказу"
calcActionBtn.onclick = () => {
  if (!isCalculated) {
    socket.emit('calculateOrder', {
      count: cardsCountInput.value,
      staffId: staffSelect.value
    });
  } else {
    // Переход к оформлению
    socket.emit('createOrder', {
      clientId: currentUser.id,
      clientName: currentUser.first_name,
      staffId: calculatedData.staffId,
      cardsCount: calculatedData.count,
      priceBYN: calculatedData.priceBYN,
      priceRUB: calculatedData.priceRUB
    });
    switchTab('tab-chat');
  }
};

// Результат расчета от сервера
socket.on('calculationResult', (data) => {
  calculatedData = data;
  document.getElementById('modal-cards-count').textContent = data.count;
  document.getElementById('modal-price-byn').textContent = `${data.priceBYN} BYN`;
  document.getElementById('modal-price-rub').textContent = `~${data.priceRUB} ₽`;
  document.getElementById('calc-modal').classList.remove('style-hidden');
});

document.getElementById('modal-confirm-btn').onclick = () => {
  isCalculated = true;
  calcActionBtn.textContent = 'Перейти к заказу в чат';
  calcActionBtn.style.background = '#10b981';
  document.getElementById('calc-modal').classList.add('style-hidden');
};

document.getElementById('modal-cancel-btn').onclick = () => {
  resetCalculation();
  document.getElementById('calc-modal').classList.add('style-hidden');
};

// Рендер состояний (Заказы, Финансы, Отзывы)
function renderAppState() {
  renderFinance();
  renderOrders();
  renderReviews();
  renderMessages();
  checkReviewAccess();
}

// Финансовый блок в зависимости от роли
function renderFinance() {
  const grid = document.getElementById('finance-grid');
  grid.innerHTML = '';

  if (currentRole === 'owner') {
    // Владелец видит общую сумму и доход по каждому сотруднику
    let totalBYN = 0;
    let staffStats = {};

    staffList.forEach(s => staffStats[s.id] = { name: s.name, total: 0 });

    appState.orders.forEach(o => {
      if (o.status === 'completed') {
        totalBYN += o.priceBYN;
        if (staffStats[o.staffId]) {
          staffStats[o.staffId].total += o.priceBYN;
        }
      }
    });

    grid.innerHTML += `
      <div class="finance-card">
        <div class="title">Общий оборот</div>
        <div class="amount">${totalBYN} BYN</div>
        <div class="title">~${Math.round(totalBYN * currentRate)} ₽</div>
      </div>
    `;

    Object.values(staffStats).forEach(st => {
      grid.innerHTML += `
        <div class="finance-card">
          <div class="title">${st.name}</div>
          <div class="amount">${st.total} BYN</div>
          <div class="title">~${Math.round(st.total * currentRate)} ₽</div>
        </div>
      `;
    });

  } else if (currentRole === 'staff') {
    // Сотрудник видит ТОЛЬКО СВОЙ доход
    let myTotalBYN = 0;
    appState.orders.forEach(o => {
      if (o.staffId === currentUser.id && o.status === 'completed') {
        myTotalBYN += o.priceBYN;
      }
    });

    grid.innerHTML = `
      <div class="finance-card">
        <div class="title">Мой заработок</div>
        <div class="amount">${myTotalBYN} BYN</div>
        <div class="title">~${Math.round(myTotalBYN * currentRate)} ₽</div>
      </div>
    `;
  }
}

// Рендер списка заказов
function renderOrders() {
  const container = document.getElementById('orders-list');
  container.innerHTML = '';

  let filteredOrders = appState.orders;

  // Сотрудник видит только свои заказы
  if (currentRole === 'staff') {
    filteredOrders = appState.orders.filter(o => o.staffId === currentUser.id);
  }

  if (filteredOrders.length === 0) {
    container.innerHTML = '<div style="color: #a0aec0; text-align: center;">Заказов нет</div>';
    return;
  }

  filteredOrders.forEach(o => {
    const div = document.createElement('div');
    div.className = 'order-item';
    div.innerHTML = `
      <div class="order-header">
        <b>Заказ #${o.id} (${o.clientName})</b>
        <span class="order-status status-${o.status}">${getStatusLabel(o.status)}</span>
      </div>
      <div>Карточек: ${o.cardsCount} | Сумма: ${o.priceBYN} BYN (~${o.priceRUB} ₽)</div>
      ${(currentRole === 'owner' || currentRole === 'staff') ? `
        <div style="margin-top: 8px; display: flex; gap: 6px;">
          <button onclick="changeStatus(${o.id}, 'in_progress')" class="btn-secondary">В работу</button>
          <button onclick="changeStatus(${o.id}, 'completed')" class="btn-secondary">Завершить</button>
        </div>
      ` : ''}
    `;
    container.appendChild(div);
  });
}

function getStatusLabel(status) {
  if (status === 'pending') return 'Новый';
  if (status === 'in_progress') return 'В работе';
  if (status === 'completed') return 'Завершен';
  return status;
}

window.changeStatus = (orderId, status) => {
  socket.emit('updateOrderStatus', { orderId, status });
};

// Проверка права на написание отзыва (только если есть завершенный заказ)
function checkReviewAccess() {
  const hasCompletedOrder = appState.orders.some(o => o.clientId === currentUser.id && o.status === 'completed');
  if (hasCompletedOrder || currentRole === 'owner' || currentRole === 'staff') {
    addReviewBtn.style.display = 'block';
  } else {
    addReviewBtn.style.display = 'none';
  }
}

// Отзывы
function renderReviews() {
  const container = document.getElementById('reviews-list');
  container.innerHTML = '';
  if (appState.reviews.length === 0) {
    container.innerHTML = '<div style="color: #a0aec0;">Отзывов пока нет.</div>';
    return;
  }
  appState.reviews.forEach(r => {
    container.innerHTML += `
      <div class="card">
        <div style="display: flex; justify-content: space-between;">
          <b>${r.authorName}</b>
          <span>${'⭐'.repeat(r.rating)}</span>
        </div>
        <p style="margin-top: 8px; font-size: 14px;">${r.text}</p>
      </div>
    `;
  });
}

addReviewBtn.onclick = () => {
  document.getElementById('review-modal').classList.remove('style-hidden');
};

document.getElementById('review-cancel-btn').onclick = () => {
  document.getElementById('review-modal').classList.add('style-hidden');
};

document.getElementById('review-submit-btn').onclick = () => {
  const text = document.getElementById('review-text').value;
  const rating = parseInt(document.getElementById('review-rating').value) || 5;
  if (text) {
    socket.emit('addReview', {
      authorName: currentUser.first_name,
      text,
      rating
    });
    document.getElementById('review-text').value = '';
    document.getElementById('review-modal').classList.add('style-hidden');
  }
};

// Чат
function renderMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  appState.messages.forEach(m => {
    const isMy = m.senderId === currentUser.id;
    const div = document.createElement('div');
    div.className = `message-bubble ${isMy ? 'message-my' : 'message-other'}`;
    div.innerHTML = `
      <div style="font-size: 10px; opacity: 0.8;">${m.senderName} • ${m.timestamp}</div>
      <div>${m.text}</div>
    `;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

document.getElementById('chat-send-btn').onclick = () => {
  const input = document.getElementById('chat-input');
  if (input.value.trim()) {
    socket.emit('sendMessage', {
      senderId: currentUser.id,
      senderName: currentUser.first_name,
      text: input.value.trim()
    });
    input.value = '';
  }
};
