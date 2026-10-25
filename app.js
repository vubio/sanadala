const DATA_BASE = './data/';
const DONATION_DELAY = 4 * 60 * 1000;
const STORAGE_FAVORITES = 'sanadala-hsk-favorites-v1';
const STORAGE_EDITION = 'sanadala-hsk-edition-v1';
const STORAGE_PROGRESS = 'sanadala-hsk-progress-v1';
const STORAGE_RECENT = 'sanadala-hsk-recent-v1';
const STORAGE_DONATION = 'sanadala-donation-seen-v1';
const PAGE_SIZE = 32;
const validViews = new Set(['home', 'flash', 'browse', 'filter']);
const statuses = {planned:'Sẽ học',learning:'Đang học',learned:'Đã học'};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
function readObject(key) {
  try {
    const obj = JSON.parse(localStorage.getItem(key) || '{}');
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch { return {}; }
}
function savedEdition() {
  try { return localStorage.getItem(STORAGE_EDITION) === '2' ? '2' : '3'; }
  catch { return '3'; }
}
const state = {
  edition: savedEdition(),
  view: 'home', catalog: [], words: [], filtered: [], levels: new Set(),
  favorites: readFavorites(), progress: readObject(STORAGE_PROGRESS), recent: readObject(STORAGE_RECENT),
  query: '', onlyFavorites: false, statusFilter: 'all',
  sort: 'original', seed: Math.random() * 100000 | 0,
  flashIndex: 0, flipped: false, visibleCount: PAGE_SIZE,
  loaded: false, loadingPromise: null, donationTimer: null, donationPreviousFocus: null,
};

function readFavorites() {
  try {
    const old = JSON.parse(localStorage.getItem(STORAGE_FAVORITES) || '[]');
    return new Set(Array.isArray(old) ? old.map(id => String(id).includes(':') ? String(id) : '3:' + id) : []);
  }
  catch { return new Set(); }
}
function saveFavorites() {
  try { localStorage.setItem(STORAGE_FAVORITES, JSON.stringify([...state.favorites])); }
  catch { showToast('Không thể lưu trên trình duyệt này.'); }
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}
function numberFormat(value) { return new Intl.NumberFormat('vi-VN').format(value); }
function statusFor(id) { return statuses[state.progress[id]] ? state.progress[id] : 'planned'; }
function recentForEdition() { return state.recent[state.edition]; }
function saveLocalObject(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { showToast('Không thể lưu tiến độ trong trình duyệt này.'); }
}
function rememberWord(id) {
  if (!id || state.recent[state.edition] === id) return;
  state.recent[state.edition] = id;
  saveLocalObject(STORAGE_RECENT, state.recent);
  updateResumeButton();
}
function updateResumeButton() {
  $('#resumeBtn').hidden = !recentForEdition();
}
function viewFromHash() {
  const raw = window.location.hash.replace(/^#/, '');
  return validViews.has(raw) ? raw : 'home';
}

async function loadCatalog() {
  const edition = state.edition;
  const response = await fetch(DATA_BASE + (edition === '2' ? 'catalog2.json' : 'catalog.json'));
  if (!response.ok) throw new Error('Không đọc được danh mục từ vựng.');
  const data = await response.json();
  if (edition !== state.edition) return;
  state.catalog = data.levels;
  state.levels = new Set(data.levels.map(item => item.level));
  $('#totalWordsHome').textContent = numberFormat(data.total);
  renderLevelChips();
}
async function loadWords() {
  if (state.loaded) return;
  if (state.loadingPromise) return state.loadingPromise;
  const edition = state.edition;
  const catalog = [...state.catalog];
  const promise = (async () => {
    const responses = await Promise.all(catalog.map(async item => {
      const filenames = item.files || [item.file];
      const chunks = await Promise.all(filenames.map(async file => {
        const response = await fetch(DATA_BASE + file);
        if (!response.ok) throw new Error('Không tải được dữ liệu HSK ' + item.level);
        return response.json();
      }));
      const rows = chunks.flat();
      return rows.map(row => edition === '2' ? ({
        id: `2:${item.level}-${row[0]}`, level: item.level, number: row[0],
        word: row[1], pinyin: row[2], meaning: row[3], example: row[4],
        examplePinyin: row[5], exampleVi: row[6], definition: row[7],
        english: row[8], official: row[9], officialPinyin: row[10], sino: '', note: '',
      }) : ({
        id: `3:${item.level}-${row[0]}`, level: item.level, number: row[0],
        word: row[1], sino: row[2], pinyin: row[3], meaning: row[4],
        example: row[5], traditional: row[6], examplePinyin: row[7],
        exampleSino: row[8], exampleVi: row[9], note: row[10] || '',
      }));
    }));
    if (edition !== state.edition) return;
    state.words = responses.flat();
    state.loaded = true;
    applyFilters();
  })();
  state.loadingPromise = promise;
  try { await promise; }
  finally { if (state.loadingPromise === promise) state.loadingPromise = null; }
}

function updateEditionUI() {
  const edition = state.edition;
  $('#heroEditionLabel').textContent = 'HSK ' + edition + '.0';
  $('#studyEditionLabel').textContent = 'HSK ' + edition + '.0 · TỪ VỰNG';
  $$('[data-edition]').forEach(button => {
    const active = button.dataset.edition === edition;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateResumeButton();
}
async function setEdition(edition) {
  if (!['2', '3'].includes(edition) || edition === state.edition) return;
  state.edition = edition;
  try { localStorage.setItem(STORAGE_EDITION, edition); } catch {}
  state.catalog = []; state.words = []; state.filtered = []; state.levels = new Set();
  state.loaded = false; state.loadingPromise = null;
  state.query = ''; state.onlyFavorites = false; state.statusFilter = 'all';
  $('#searchInput').value = '';
  $('#statusFilter').value = 'all';
  $('#loadingState').textContent = 'Đang chuẩn bị học liệu…';
  $('#loadingState').hidden = state.view === 'home';
  $('#flashPanel').hidden = true; $('#browsePanel').hidden = true;
  updateEditionUI();
  try {
    await loadCatalog();
    if (state.view !== 'home') setView(state.view, false);
  } catch { showToast('Không tải được phiên bản HSK. Vui lòng thử lại.'); }
}

function setView(view, updateHash = true) {
  if (!validViews.has(view)) view = 'home';
  state.view = view;
  document.body.dataset.currentView = view;
  if (updateHash && window.location.hash !== '#' + view) history.pushState(null, '', '#' + view);
  $('#homeView').hidden = view !== 'home';
  $('#studyView').hidden = view === 'home';
  $$('[data-view]').forEach(el => {
    const isActive = el.dataset.view === view;
    el.classList.toggle('active', isActive);
    if (el.classList.contains('mode-tab')) el.setAttribute('aria-pressed', String(isActive));
    if (el.classList.contains('mobile-nav') || el.closest('.mobile-nav')) el.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  if (view === 'home') { window.scrollTo({top:0,behavior:'instant'}); return; }
  const headings = {
    flash: ['Thẻ ghi nhớ', 'Lật thẻ, nghe phát âm và ghi nhớ từng từ.'],
    browse: ['Duyệt từ vựng', 'Xem nghĩa, phiên âm và ví dụ của từng từ.'],
    filter: ['Bộ lọc từ vựng', 'Tìm đúng những từ bạn cần và lưu để ôn tập.'],
  };
  $('#studyTitle').textContent = headings[view][0];
  $('#studySubtitle').textContent = headings[view][1];
  $('#filterDetails').hidden = view !== 'filter';
  $('#flashPanel').hidden = true;
  $('#browsePanel').hidden = true;
  $('#emptyState').hidden = true;
  window.scrollTo({top:0,behavior:'instant'});
  startDonationTimer();
  if (!state.loaded) {
    $('#loadingState').hidden = false;
    loadWords().then(renderCurrentView).catch(error => {
      $('#loadingState').textContent = error.message + ' Hãy tải lại trang để thử lại.';
    });
  } else renderCurrentView();
}

function renderLevelChips() {
  $('#levelChips').innerHTML = state.catalog.map(item =>
    `<button class="level-chip ${state.levels.has(item.level) ? 'active' : ''}" data-level="${item.level}" aria-pressed="${state.levels.has(item.level)}">HSK ${item.level}</button>`
  ).join('');
}
function applyFilters() {
  const q = normalize(state.query);
  state.filtered = state.words.filter(item => {
    if (!state.levels.has(item.level)) return false;
    if (state.onlyFavorites && !state.favorites.has(item.id)) return false;
    if (state.statusFilter !== 'all' && statusFor(item.id) !== state.statusFilter) return false;
    if (!q) return true;
    return [item.word, item.official, item.pinyin, item.meaning, item.sino, item.english, item.definition,
      item.example, item.examplePinyin, item.exampleVi, item.note]
      .some(value => normalize(value).includes(q));
  });
  if (state.sort === 'alpha') state.filtered.sort((a,b) => a.word.localeCompare(b.word, 'zh'));
  if (state.sort === 'random') state.filtered.sort((a,b) => shuffledKey(a.id) - shuffledKey(b.id));
  state.flashIndex = 0;
  state.flipped = false;
  state.visibleCount = PAGE_SIZE;
  $('#favoritesOnlyBtn').classList.toggle('active', state.onlyFavorites);
  $('#favoritesOnlyBtn').setAttribute('aria-pressed', String(state.onlyFavorites));
  $('#sortSelect').value = state.sort;
  $('#statusFilter').value = state.statusFilter;
  renderLevelChips();
}
function shuffledKey(id) {
  let hash = state.seed | 0;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}
function refreshFilters() { applyFilters(); renderCurrentView(); }
function clearFilters() {
  state.levels = new Set(state.catalog.map(item => item.level));
  state.query = ''; state.onlyFavorites = false; state.statusFilter = 'all'; state.sort = 'original';
  $('#searchInput').value = '';
  refreshFilters();
}

function renderCurrentView() {
  if (state.view === 'home' || !state.loaded) return;
  $('#loadingState').hidden = true;
  const count = state.filtered.length;
  const counts = {planned: 0, learning: 0, learned: 0};
  state.words.forEach(item => counts[statusFor(item.id)]++);
  $('#progressSummary').textContent = `Sẽ học ${numberFormat(counts.planned)} · Đang học ${numberFormat(counts.learning)} · Đã học ${numberFormat(counts.learned)} (lưu trên thiết bị)`;
  $('#studyCounter').textContent = numberFormat(count) + ' từ';
  $('#emptyState').hidden = count !== 0;
  $('#flashPanel').hidden = state.view !== 'flash' || !count;
  $('#browsePanel').hidden = state.view === 'flash' || !count;
  if (!count) return;
  if (state.view === 'flash') renderFlash();
  else renderBrowse();
}

function speakButton(text, label) {
  if (!text) return '';
  return `<button class="speak-btn" type="button" data-speak="${escapeHtml(text)}" aria-label="Nghe phát âm ${escapeHtml(label || text)}" title="Nghe phát âm">♪</button>`;
}
function favoriteButton(item, flash = false) {
  const saved = state.favorites.has(item.id);
  return `<button type="button" class="${flash ? 'flash-save' : 'favorite-btn'} ${saved ? 'is-saved saved' : ''}" data-favorite="${item.id}" aria-label="${saved ? 'Bỏ lưu' : 'Lưu'} từ ${escapeHtml(item.word)}" aria-pressed="${saved}" title="${saved ? 'Bỏ lưu từ' : 'Lưu từ'}">${saved ? '♥' : '♡'}</button>`;
}
function statusSelect(item) {
  const selected = statusFor(item.id);
  return `<label class="status-field"><span>Tiến độ</span><select data-status="${escapeHtml(item.id)}" aria-label="Tiến độ học từ ${escapeHtml(item.word)}">
    ${Object.entries(statuses).map(([key,label]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${label}</option>`).join('')}
  </select></label>`;
}
function officialLabel(item) {
  if (!item.official || item.official.replace(/\s/g, '') === item.word.replace(/\s/g, '')) return '';
  return `<div class="word-official">Mục từ HSK: ${escapeHtml(item.official)}</div>`;
}
function setWordStatus(id, value) {
  if (!statuses[value]) return;
  if (value === 'planned') delete state.progress[id];
  else state.progress[id] = value;
  saveLocalObject(STORAGE_PROGRESS, state.progress);
  if (state.statusFilter !== 'all') refreshFilters();
  else if (state.view === 'flash') renderFlash();
  else renderBrowse();
  showToast('Đã lưu: ' + statuses[value]);
}
function renderFlash() {
  const item = state.filtered[state.flashIndex];
  if (!item) return;
  rememberWord(item.id);
  $('#flashPosition').textContent = `${numberFormat(state.flashIndex + 1)} / ${numberFormat(state.filtered.length)} · HSK ${item.level}`;
  $('#flashFront').innerHTML = `
    <span class="flash-label">HSK ${item.level} · TỪ SỐ ${item.number}</span>
    <div class="flash-word">${escapeHtml(item.word)}</div>
    <div class="flash-pinyin">${escapeHtml(item.pinyin)} ${speakButton(item.word, item.word)}</div>
    ${officialLabel(item)}
    <span class="flash-instruction">CHẠM ĐỂ XEM NGHĨA ↻</span>`;
  $('#flashBack').innerHTML = `
    <span class="flash-label">NGHĨA TIẾNG VIỆT</span>
    <div class="flash-meaning">${escapeHtml(item.meaning)}</div>
    ${item.sino ? `<div class="flash-hanviet">Hán Việt: ${escapeHtml(item.sino)}</div>` : ''}
    ${item.definition ? `<div class="flash-definition">Giải thích: ${escapeHtml(item.definition)}</div>` : ''}
    <div class="flash-example">
      <div class="example-header">VÍ DỤ</div>
      <div class="flash-example-cn">${escapeHtml(item.example)} ${speakButton(item.example, 'câu ví dụ')}</div>
      <div class="flash-example-pinyin">${escapeHtml(item.examplePinyin)}</div>
      <div class="flash-example-vi">${escapeHtml(item.exampleVi)}</div>
    </div>`;
  $('#flashStatus').innerHTML = statusSelect(item);
  $('#flashCard').querySelectorAll('.flash-save').forEach(el => el.remove());
  $('#flashCard').insertAdjacentHTML('beforeend', favoriteButton(item, true));
  $('#flashCard').classList.toggle('is-flipped', state.flipped);
  $('#flashCard').setAttribute('aria-pressed', String(state.flipped));
}
function flipCard() {
  if (state.view !== 'flash' || !state.filtered.length) return;
  state.flipped = !state.flipped;
  $('#flashCard').classList.toggle('is-flipped', state.flipped);
  $('#flashCard').setAttribute('aria-pressed', String(state.flipped));
}
function navigateFlash(delta) {
  if (state.view !== 'flash' || !state.filtered.length) return;
  state.flashIndex = (state.flashIndex + delta + state.filtered.length) % state.filtered.length;
  state.flipped = false;
  renderFlash();
}
function renderWordCard(item) {
  return `<article class="word-card">
    <div class="word-card-top"><div><span class="word-hsk">HSK ${item.level}</span><span class="word-id">#${item.number}</span></div>${favoriteButton(item)}</div>
    <div class="word-main"><h3>${escapeHtml(item.word)}</h3>${speakButton(item.word, item.word)}</div>
    <div class="word-pinyin">${escapeHtml(item.pinyin)}</div>
    ${officialLabel(item)}
    <div class="word-meaning">${escapeHtml(item.meaning)}</div>
    ${item.sino ? `<div class="word-sino">Hán Việt: ${escapeHtml(item.sino)}</div>` : ''}
    ${item.english ? `<div class="word-english">Tiếng Anh: ${escapeHtml(item.english)}</div>` : ''}
    ${item.definition ? `<div class="word-definition">Giải thích: ${escapeHtml(item.definition)}</div>` : ''}
    <div class="example-box"><span class="example-header">VÍ DỤ</span>
      <div class="example-chinese">${escapeHtml(item.example)} ${speakButton(item.example, 'câu ví dụ')}</div>
      <div class="example-pinyin">${escapeHtml(item.examplePinyin)}</div>
      <div class="example-vi">${escapeHtml(item.exampleVi)}</div>
      ${item.note ? `<div class="word-note">Ghi chú: ${escapeHtml(item.note)}</div>` : ''}
    </div>
    <div class="word-status">${statusSelect(item)}</div>
  </article>`;
}
function renderBrowse() {
  $('#resultText').textContent = 'Danh sách · ' + numberFormat(state.filtered.length) + ' từ';
  $('#wordGrid').innerHTML = state.filtered.slice(0, state.visibleCount).map(renderWordCard).join('');
  $('#loadMoreBtn').hidden = state.visibleCount >= state.filtered.length;
}
function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  if (state.onlyFavorites) refreshFilters();
  else if (state.view === 'flash') renderFlash();
  else renderBrowse();
}

function speak(text) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    showToast('Trình duyệt này chưa hỗ trợ đọc văn bản.'); return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; utterance.rate = .86; utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /^zh[-_]CN/i.test(v.lang)) || voices.find(v => /^zh/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onerror = () => showToast('Không phát được âm thanh. Hãy kiểm tra giọng đọc tiếng Trung trên thiết bị.');
    window.speechSynthesis.speak(utterance);
  } catch { showToast('Không thể phát âm thanh trên thiết bị này.'); }
}
let toastTimer;
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.hidden = true, 2500);
}
async function copyBank() {
  const text = 'TRAN NHAT LE\nMB Bank 2807199679';
  try { await navigator.clipboard.writeText(text); showToast('Đã sao chép thông tin ngân hàng.'); }
  catch { showToast('Không thể sao chép tự động.'); }
}

function startDonationTimer() {
  if (state.donationTimer || sessionStorage.getItem(STORAGE_DONATION) === '1') return;
  state.donationTimer = setTimeout(() => {
    state.donationTimer = null;
    if (document.hidden) {
      const onVisible = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', onVisible); showDonation(); } };
      document.addEventListener('visibilitychange', onVisible);
    } else showDonation();
  }, DONATION_DELAY);
}
function showDonation() {
  if (sessionStorage.getItem(STORAGE_DONATION) === '1') return;
  sessionStorage.setItem(STORAGE_DONATION, '1');
  state.donationPreviousFocus = document.activeElement;
  $('#donationModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#modalCloseBtn').focus();
}
function closeDonation() {
  $('#donationModal').hidden = true;
  document.body.style.overflow = '';
  if (state.donationPreviousFocus?.focus) state.donationPreviousFocus.focus();
}

async function resumeLast() {
  const remembered = recentForEdition();
  if (!remembered) { setView('flash'); return; }
  if (!state.loaded) await loadWords();
  state.levels = new Set(state.catalog.map(item => item.level));
  state.query = ''; state.onlyFavorites = false; state.statusFilter = 'all'; state.sort = 'original';
  $('#searchInput').value = '';
  applyFilters();
  state.flashIndex = Math.max(0, state.filtered.findIndex(item => item.id === remembered));
  state.flipped = false;
  setView('flash');
}

function bindEvents() {
  document.addEventListener('click', event => {
    const speakEl = event.target.closest('[data-speak]');
    if (speakEl) { event.stopPropagation(); speak(speakEl.dataset.speak); return; }
    const favEl = event.target.closest('[data-favorite]');
    if (favEl) { event.stopPropagation(); toggleFavorite(favEl.dataset.favorite); return; }
    const editionEl = event.target.closest('[data-edition]');
    if (editionEl) { setEdition(editionEl.dataset.edition); return; }
    const moduleEl = event.target.closest('[data-open-edition]');
    if (moduleEl) { setEdition(moduleEl.dataset.openEdition).then(() => setView('browse')); return; }
    const viewEl = event.target.closest('[data-view]');
    if (viewEl) { setView(viewEl.dataset.view); return; }
    const levelEl = event.target.closest('[data-level]');
    if (levelEl) {
      const level = Number(levelEl.dataset.level);
      if (state.levels.has(level)) state.levels.delete(level);
      else state.levels.add(level);
      refreshFilters(); return;
    }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-status]')) setWordStatus(event.target.dataset.status, event.target.value);
  });
  $('#searchInput').addEventListener('input', e => { state.query = e.target.value; refreshFilters(); });
  $('#statusFilter').addEventListener('change', e => { state.statusFilter = e.target.value; refreshFilters(); });
  $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; refreshFilters(); });
  $('#allLevelsBtn').addEventListener('click', () => { state.levels = new Set(state.catalog.map(item=>item.level)); refreshFilters(); });
  $('#favoritesOnlyBtn').addEventListener('click', () => { state.onlyFavorites = !state.onlyFavorites; refreshFilters(); });
  $('#shuffleBtn').addEventListener('click', () => { state.seed = Math.random() * 100000 | 0; state.sort = 'random'; refreshFilters(); showToast('Đã trộn thứ tự từ.'); });
  $('#clearFiltersBtn').addEventListener('click', clearFilters);
  $('#emptyClearBtn').addEventListener('click', clearFilters);
  $('#loadMoreBtn').addEventListener('click', () => { state.visibleCount += PAGE_SIZE; renderBrowse(); });
  $('#resumeBtn').addEventListener('click', () => resumeLast().catch(() => showToast('Không thể tiếp tục, hãy thử lại.')));
  $('#flashCard').addEventListener('click', event => {
    if (event.target.closest('[data-speak], [data-favorite]')) return;
    if (Date.now() > swipeIgnoreUntil) flipCard();
  });
  $('#flashCard').addEventListener('keydown', e => { if (e.target === $('#flashCard') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flipCard(); } });
  $('#flipCardBtn').addEventListener('click', flipCard);
  $('#prevCardBtn').addEventListener('click', () => navigateFlash(-1));
  $('#nextCardBtn').addEventListener('click', () => navigateFlash(1));
  $('#copyBankBtn').addEventListener('click', copyBank);
  $('#modalCopyBtn').addEventListener('click', copyBank);
  $('#modalCloseBtn').addEventListener('click', closeDonation);
  $('#modalLaterBtn').addEventListener('click', closeDonation);
  $('#donationModal').addEventListener('click', event => { if (event.target === $('#donationModal')) closeDonation(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#donationModal').hidden) { closeDonation(); return; }
    if (!$('#donationModal').hidden || state.view !== 'flash') return;
    if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName || '')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); navigateFlash(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); navigateFlash(-1); }
    if (event.code === 'Space' && document.activeElement !== $('#flashCard')) { event.preventDefault(); flipCard(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      if (state.view !== 'home') { event.preventDefault(); $('#searchInput').focus(); }
    }
  });
  let startX = 0, startY = 0;
  $('#flashCard').addEventListener('pointerdown', event => { startX = event.clientX; startY = event.clientY; });
  $('#flashCard').addEventListener('pointerup', event => {
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swipeIgnoreUntil = Date.now() + 500;
      navigateFlash(dx < 0 ? 1 : -1);
    }
  });
  window.addEventListener('hashchange', () => setView(viewFromHash(), false));
  window.addEventListener('popstate', () => setView(viewFromHash(), false));
}
let swipeIgnoreUntil = 0;

async function start() {
  $('#year').textContent = new Date().getFullYear();
  bindEvents();
  updateEditionUI();
  try {
    await loadCatalog();
    setView(viewFromHash(), false);
  } catch (error) {
    $('#totalWordsHome').textContent = '—';
    showToast('Chưa tải được danh mục học liệu. Hãy thử tải lại trang.');
    console.error('Catalog load failed:', error);
  }
}
start();
