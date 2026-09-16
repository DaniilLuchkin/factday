const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'factday-state';
const categories = [['◒', 'Космос'], ['✣', 'Природа'], ['◉', 'История'], ['⌁', 'Наука'], ['▦', 'Технологии'], ['☼', 'Психология']];
let facts = [], currentFact = null, currentIndex = 0, dragStartX = 0, dragging = false;
let state = loadState();

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { saved: [], liked: [], disliked: [], history: [], interests: {} }; }
  catch { return { saved: [], liked: [], disliked: [], history: [], interests: {} }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayIndex() {
  const date = new Date();
  return Math.abs(Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)) % facts.length;
}
function renderCategories() {
  $('#category-grid').innerHTML = categories.map(([icon, name]) => {
    const active = state.interests[name] ? ' active' : '';
    const count = facts.filter((fact) => fact.category === name).length;
    return `<button class="category${active}" data-category="${name}"><span class="category-icon">${icon}</span><span>${name}</span><small>${count} ${count === 1 ? 'факт' : 'фактов'}</small></button>`;
  }).join('');
  document.querySelectorAll('.category').forEach((button) => button.addEventListener('click', () => {
    const category = button.dataset.category;
    state.interests[category] = !state.interests[category];
    saveState(); renderCategories();
    showToast(state.interests[category] ? `Тема «${category}» добавлена` : `Тема «${category}» убрана`);
  }));
}
function renderFact(fact) {
  currentFact = fact;
  $('#fact-category').textContent = fact.category;
  $('#fact-number').textContent = `#${String(currentIndex + 1).padStart(3, '0')}`;
  $('#fact-title').textContent = fact.title;
  $('#fact-text').textContent = fact.text;
  $('#fact-source').innerHTML = `Источник: <a href="${fact.url}" target="_blank" rel="noreferrer">${fact.source}</a>`;
  $('#fact-illustration .planet').textContent = fact.icon;
  $('#save-button span').textContent = state.saved.includes(fact.id) ? '♥' : '♡';
  $('#saved-count').textContent = state.saved.length;
  const interestCount = Object.keys(state.interests).length;
  $('#meter-fill').style.width = `${Math.max(8, Math.min(100, 8 + interestCount * 16))}%`;
  $('#interest-status').textContent = interestCount ? `${interestCount} ${interestCount === 1 ? 'тема выбрана' : 'тем выбрано'}` : 'Выберите интересы';
}
function showFact(index, addHistory = false) {
  currentIndex = (index + facts.length) % facts.length;
  const fact = facts[currentIndex];
  renderFact(fact);
  if (addHistory && !state.history.includes(fact.id)) { state.history.unshift(fact.id); state.history = state.history.slice(0, 30); saveState(); renderHistory(); }
}
function react(isLiked) {
  if (!currentFact) return;
  const list = isLiked ? state.liked : state.disliked;
  if (!list.includes(currentFact.id)) list.push(currentFact.id);
  const opposite = isLiked ? state.disliked : state.liked;
  state[isLiked ? 'disliked' : 'liked'] = opposite.filter((id) => id !== currentFact.id);
  const card = $('#fact-card'); card.classList.remove('dragging');
  card.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s';
  card.style.transform = `translateX(${isLiked ? 110 : -110}px) rotate(${isLiked ? 7 : -7}deg)`; card.style.opacity = '0';
  state.history = [currentFact.id, ...state.history.filter((id) => id !== currentFact.id)].slice(0, 30); saveState(); renderHistory();
  setTimeout(() => { showFact(currentIndex + 1); card.style.transition = 'none'; card.style.transform = 'none'; card.style.opacity = '1'; requestAnimationFrame(() => { card.style.transition = ''; }); }, 350);
  showToast(isLiked ? 'Покажем больше похожего' : 'Покажем меньше похожего');
}
function saveCurrentFact() {
  if (!currentFact) return;
  const saved = state.saved.includes(currentFact.id);
  state.saved = saved ? state.saved.filter((id) => id !== currentFact.id) : [currentFact.id, ...state.saved];
  saveState(); renderFact(currentFact); renderSaved(); showToast(saved ? 'Факт удалён из сохранённых' : 'Факт сохранён');
}
function renderSaved() {
  const savedFacts = state.saved.map((id) => facts.find((fact) => fact.id === id)).filter(Boolean);
  $('#saved-count').textContent = savedFacts.length; $('#saved-total').textContent = savedFacts.length;
  $('#saved-grid').innerHTML = savedFacts.length ? savedFacts.map((fact) => `<article class="saved-card"><div class="saved-card-top"><span class="category-pill">${fact.category}</span><button class="remove-saved" data-id="${fact.id}" aria-label="Удалить">×</button></div><h3>${fact.title}</h3><p>${fact.text}</p><a href="${fact.url}" target="_blank" rel="noreferrer">${fact.source} ↗</a></article>`).join('') : '<p class="empty-state">Здесь появятся факты, которые вы сохраните.</p>';
  document.querySelectorAll('.remove-saved').forEach((button) => button.addEventListener('click', () => { state.saved = state.saved.filter((id) => id !== button.dataset.id); saveState(); renderSaved(); renderFact(currentFact); }));
}
function renderHistory() {
  const historyFacts = state.history.map((id) => facts.find((fact) => fact.id === id)).filter(Boolean).slice(0, 8);
  $('#history-list').innerHTML = historyFacts.length ? historyFacts.map((fact, index) => `<button class="history-item" data-id="${fact.id}"><span class="history-index">${String(index + 1).padStart(2, '0')}</span><span class="history-copy"><small>${fact.category}</small><strong>${fact.title}</strong></span><span class="history-arrow">↗</span></button>`).join('') : '<p class="empty-state">История появится после первых реакций.</p>';
  document.querySelectorAll('.history-item').forEach((button) => button.addEventListener('click', () => { const index = facts.findIndex((fact) => fact.id === button.dataset.id); if (index >= 0) { showFact(index); window.scrollTo({ top: 0, behavior: 'smooth' }); } }));
}
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); }
function setupInteractions() {
  $('#yes-button').onclick = () => react(true); $('#no-button').onclick = () => react(false); $('#save-button').onclick = saveCurrentFact;
  $('#share-button').onclick = async () => { const shareText = `${currentFact.title} — ${currentFact.url}`; if (navigator.share) await navigator.share({ title: currentFact.title, text: currentFact.text, url: currentFact.url }); else { await navigator.clipboard?.writeText(shareText); showToast('Ссылка скопирована'); } };
  $('#theme-toggle').onclick = () => setTheme(!document.body.classList.contains('dark'));
  const card = $('#fact-card');
  card.addEventListener('pointerdown', (event) => { if (event.target.closest('button, a')) return; dragStartX = event.clientX; dragging = true; card.classList.add('dragging'); card.setPointerCapture(event.pointerId); });
  card.addEventListener('pointermove', (event) => { if (!dragging || event.pointerType === 'touch') return; const difference = Math.max(-120, Math.min(120, event.clientX - dragStartX)); card.style.transform = `translateX(${difference}px) rotate(${difference / 24}deg)`; card.style.opacity = String(1 - Math.min(Math.abs(difference) / 600, .35)); });
  card.addEventListener('pointerup', (event) => { if (!dragging) return; dragging = false; const difference = event.clientX - dragStartX; card.classList.remove('dragging'); if (Math.abs(difference) > 75) react(difference > 0); else { card.style.transform = ''; card.style.opacity = '1'; } });
  card.addEventListener('pointercancel', () => { dragging = false; card.classList.remove('dragging'); card.style.transform = ''; card.style.opacity = '1'; });
}
function setTheme(dark) { document.body.classList.toggle('dark', dark); document.body.style.setProperty('background', dark ? '#1a1b1d' : '', 'important'); document.body.style.color = dark ? '#f4f0e8' : ''; $('#theme-toggle').textContent = dark ? '☀' : '☾'; localStorage.setItem('factday-theme', dark ? 'dark' : 'light'); }
async function init() { const response = await fetch('facts.json'); facts = await response.json(); $('#today-date').textContent = `· ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`; renderCategories(); showFact(todayIndex()); renderSaved(); renderHistory(); setupInteractions(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=2').catch(() => {}); if (localStorage.getItem('factday-theme') === 'dark') setTheme(true); }
init().catch(() => showToast('Не удалось загрузить факты'));
