/* Lesson-first grammar library, independent from the vocabulary collections. */
const GRAMMAR_BASE = './data/';
const STORAGE_LEVEL = 'sanadala-grammar-level-v1';
const STORAGE_PROGRESS = 'sanadala-grammar-progress-v1';
const STORAGE_FAVORITES = 'sanadala-grammar-favorites-v1';
const STORAGE_RECENT = 'sanadala-grammar-recent-v1';
const STORAGE_SINO = 'sanadala-grammar-show-sino-v1';

const $g = selector => document.querySelector(selector);
const escapeGrammar = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const numberGrammar = number => new Intl.NumberFormat('vi-VN').format(number);
const normalizeGrammar = value => String(value ?? '').toLocaleLowerCase('vi')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
const labels = {planned: 'Sẽ học', learning: 'Đang học', learned: 'Đã học'};

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Reading remains available if private browsing blocks storage. */ }
}
const state = {
  catalog: null, cache: new Map(), pending: new Map(),
  level: readJson(STORAGE_LEVEL, '1'),
  selected: null, query: '', topic: 'all', status: 'all',
  progress: readJson(STORAGE_PROGRESS, {}),
  favorites: new Set(readJson(STORAGE_FAVORITES, [])),
  recent: readJson(STORAGE_RECENT, {}),
  showSino: readJson(STORAGE_SINO, false),
};
let catalogPromise;

function currentLessons() { return state.cache.get(state.level) || []; }
function statusFor(lesson) { return labels[state.progress[lesson.id]] ? state.progress[lesson.id] : 'planned'; }
function topicsForLevel() { return [...new Set(currentLessons().map(lesson => lesson.topic))]; }
function searchText(lesson) {
  return [lesson.title, lesson.topic, ...lesson.items.flatMap(item => [
    item.focus, item.pattern, item.explanation,
    ...item.examples.flatMap(ex => [ex.cn, ex.pinyin, ex.vi, ex.sino]),
  ])].join(' ');
}
function filteredLessons() {
  const query = normalizeGrammar(state.query);
  return currentLessons().filter(lesson => {
    if (state.topic !== 'all' && lesson.topic !== state.topic) return false;
    if (state.status === 'favorite' && !state.favorites.has(lesson.id)) return false;
    if (state.status in labels && statusFor(lesson) !== state.status) return false;
    return !query || normalizeGrammar(searchText(lesson)).includes(query);
  });
}
async function ensureCatalog() {
  if (state.catalog) return;
  if (!catalogPromise) catalogPromise = (async () => {
    const response = await fetch(GRAMMAR_BASE + 'grammar-catalog.json');
    if (!response.ok) throw new Error('Không tải được danh mục ngữ pháp.');
    const data = await response.json();
    state.catalog = data;
    if (!data.levels.some(item => item.key === state.level)) state.level = '1';
    $g('#grammarTotal').textContent =
      `${numberGrammar(data.totalLessons)} bài · ${numberGrammar(data.totalExamples)} ví dụ`;
  })();
  try { await catalogPromise; }
  catch (error) { catalogPromise = null; throw error; }
}
async function ensureLevel(level) {
  if (state.cache.has(level)) return;
  if (!state.pending.has(level)) {
    const entry = state.catalog.levels.find(item => item.key === level);
    if (!entry) throw new Error('Cấp độ ngữ pháp không tồn tại.');
    state.pending.set(level, (async () => {
      const response = await fetch(GRAMMAR_BASE + entry.file);
      if (!response.ok) throw new Error('Không tải được ngữ pháp ' + entry.label);
      const lessons = await response.json();
      if (lessons.length !== entry.lessons) throw new Error('Số bài ngữ pháp không khớp.');
      state.cache.set(level, lessons);
    })());
  }
  try { await state.pending.get(level); }
  finally { state.pending.delete(level); }
}

function renderLevels() {
  $g('#grammarLevels').innerHTML = state.catalog.levels.map(level => {
    const active = level.key === state.level;
    return `<button class="grammar-level ${active ? 'active' : ''}" data-grammar-level="${level.key}"
      aria-pressed="${active}"><strong>${escapeGrammar(level.label)}</strong><small>${numberGrammar(level.lessons)} bài</small></button>`;
  }).join('');
}
function renderTopics() {
  const topics = ['all', ...topicsForLevel()];
  const container = $g('#grammarTopics');
  const previousScroll = container.scrollLeft;
  container.innerHTML = topics.map(topic => {
    const count = topic === 'all' ? currentLessons().length :
      currentLessons().filter(item => item.topic === topic).length;
    const selected = state.topic === topic;
    return `<button class="grammar-topic ${selected ? 'active' : ''}" data-grammar-topic="${escapeGrammar(topic)}"
      aria-pressed="${selected}">${escapeGrammar(topic === 'all' ? 'Tất cả' : topic)} <span>${count}</span></button>`;
  }).join('');
  container.scrollLeft = previousScroll;
}
function renderStatusFilters() {
  $g('#grammarView').querySelectorAll('[data-grammar-filter]').forEach(button => {
    const active = button.dataset.grammarFilter === state.status;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function rememberLesson(id) {
  if (!id || state.recent[state.level] === id) return;
  state.recent[state.level] = id;
  saveJson(STORAGE_RECENT, state.recent);
}
function speakGrammar(text, name) {
  if (!text) return '';
  return `<button class="speak-btn grammar-speak" type="button" data-speak="${escapeGrammar(text)}"
    aria-label="Nghe phát âm ${escapeGrammar(name || text)}" title="Nghe tiếng Trung">♪</button>`;
}
function renderExample(ex, index, passage) {
  return `<div class="grammar-example ${passage ? 'is-passage' : ''}">
    <div class="grammar-example-top"><span>${passage ? 'Câu' : 'Ví dụ'} ${index + 1}</span>
      ${ex.speaker ? `<span>${escapeGrammar(ex.speaker)}</span>` : ''}</div>
    <div class="grammar-example-cn">${escapeGrammar(ex.cn)} ${speakGrammar(ex.cn, 'câu ví dụ')}</div>
    <div class="grammar-example-pinyin">${escapeGrammar(ex.pinyin)}</div>
    <div class="grammar-example-vi">${escapeGrammar(ex.vi)}</div>
    ${state.showSino && ex.sino ? `<div class="grammar-example-sino">Hán Việt: ${escapeGrammar(ex.sino)}</div>` : ''}
  </div>`;
}
function renderTeachingItem(item, index, total) {
  const passage = item.examples.some(example => example.type === 'passage');
  const fullPassage = passage ? item.examples.map(ex => ex.cn).join(' ') : '';
  return `<section class="grammar-teaching-item">
    <div class="grammar-item-title">
      <span class="grammar-item-index">${total > 1 ? `CẤU TRÚC ${index + 1}` : 'CẤU TRÚC'}</span>
      <div class="grammar-focus-line"><strong>${escapeGrammar(item.focus)}</strong>
        ${speakGrammar(item.spoken || item.focus, item.focus)}</div>
    </div>
    ${item.pattern ? `<div class="grammar-pattern"><span>Mẫu câu</span><p>${escapeGrammar(item.pattern)}</p></div>` : ''}
    ${item.explanation ? `<div class="grammar-explanation"><span>Cách dùng</span><p>${escapeGrammar(item.explanation)}</p></div>` : ''}
    <div class="grammar-examples-heading"><strong>${passage ? 'ĐỌC ĐOẠN VĂN' : 'CÂU VÍ DỤ'}</strong>
      ${passage ? `<span class="grammar-passage-play">Nghe cả đoạn ${speakGrammar(fullPassage, 'cả đoạn văn')}</span>` : ''}</div>
    <div class="grammar-examples">${item.examples.map((ex, i) => renderExample(ex, i, passage)).join('')}</div>
  </section>`;
}
function renderLessonDetail(lesson, visibleLessons) {
  const meta = state.catalog.levels.find(item => item.key === state.level);
  const index = visibleLessons.findIndex(item => item.id === lesson.id);
  const favorite = state.favorites.has(lesson.id);
  $g('#grammarLesson').innerHTML = `
    <div class="grammar-detail-meta">${escapeGrammar(meta.label)} <span>·</span> BÀI ${lesson.number} <span>·</span> ${escapeGrammar(lesson.topic)}</div>
    <h2>${escapeGrammar(lesson.title)}</h2>
    <div class="grammar-detail-actions">
      <label class="grammar-status-select">Tiến độ
        <select id="grammarLessonStatus" aria-label="Tiến độ học bài ${lesson.number}">
          ${Object.entries(labels).map(([value, text]) => `<option value="${value}" ${statusFor(lesson) === value ? 'selected' : ''}>${text}</option>`).join('')}
        </select>
      </label>
      <button class="grammar-favorite ${favorite ? 'saved' : ''}" data-grammar-favorite="${lesson.id}"
        aria-pressed="${favorite}">${favorite ? '♥ Đã lưu' : '♡ Lưu bài'}</button>
      <button class="grammar-toggle-sino ${state.showSino ? 'active' : ''}" data-grammar-sino
        aria-pressed="${state.showSino}">${state.showSino ? 'Ẩn Hán Việt' : 'Hiện Hán Việt'}</button>
    </div>
    ${lesson.items.map((item, i) => renderTeachingItem(item, i, lesson.items.length)).join('')}
    <div class="grammar-detail-pagination">
      <button data-grammar-step="-1" ${index <= 0 ? 'disabled' : ''}>← Bài trước</button>
      <span>${numberGrammar(index + 1)} / ${numberGrammar(visibleLessons.length)} bài</span>
      <button data-grammar-step="1" ${index === visibleLessons.length - 1 ? 'disabled' : ''}>Bài tiếp →</button>
    </div>`;
}
function renderLessonList(lessons) {
  let previousTopic = '';
  $g('#grammarLessonList').innerHTML = lessons.map(lesson => {
    const topic = lesson.topic !== previousTopic ?
      `<div class="grammar-list-topic">${escapeGrammar(lesson.topic)}</div>` : '';
    previousTopic = lesson.topic;
    const active = lesson.id === state.selected;
    const status = statusFor(lesson);
    const favorite = state.favorites.has(lesson.id);
    return `${topic}<button class="grammar-lesson-link ${active ? 'active' : ''}" data-grammar-lesson="${lesson.id}"
      aria-current="${active ? 'true' : 'false'}">
      <span class="grammar-lesson-number">${String(lesson.number).padStart(2, '0')}</span>
      <span class="grammar-lesson-name">${escapeGrammar(lesson.title)}</span>
      <span class="grammar-lesson-state ${status}" title="${labels[status]}">${favorite ? '♥' : status === 'learned' ? '✓' : status === 'learning' ? '◐' : '○'}</span>
    </button>`;
  }).join('');
}
function renderGrammar() {
  const all = currentLessons();
  const filtered = filteredLessons();
  if (!filtered.some(lesson => lesson.id === state.selected)) {
    const last = state.recent[state.level];
    state.selected = (filtered.find(lesson => lesson.id === last) || filtered[0])?.id || null;
  }
  renderLevels();
  renderTopics();
  renderStatusFilters();
  $g('#grammarListCount').textContent = `${numberGrammar(filtered.length)} bài học`;
  $g('#grammarProgressCount').textContent =
    `${numberGrammar(all.filter(lesson => statusFor(lesson) === 'learned').length)} / ${numberGrammar(all.length)} đã học`;
  $g('#grammarResumeBtn').hidden = !state.recent[state.level];
  $g('#grammarContent').hidden = filtered.length === 0;
  $g('#grammarEmpty').hidden = filtered.length !== 0;
  $g('#grammarLoading').hidden = true;
  if (!filtered.length) return;
  renderLessonList(filtered);
  const lesson = filtered.find(item => item.id === state.selected);
  rememberLesson(lesson.id);
  $g('#grammarResumeBtn').hidden = false;
  renderLessonDetail(lesson, filtered);
}
function selectLesson(id, scrollToDetail = false) {
  if (!filteredLessons().some(lesson => lesson.id === id)) return;
  state.selected = id;
  renderGrammar();
  if (scrollToDetail && window.matchMedia('(max-width: 720px)').matches)
    $g('#grammarLesson').scrollIntoView({behavior: 'smooth', block: 'start'});
}
async function changeGrammarLevel(level) {
  if (!state.catalog.levels.some(item => item.key === level)) return;
  state.level = level;
  saveJson(STORAGE_LEVEL, level);
  state.selected = state.recent[level] || null;
  state.topic = 'all'; state.status = 'all'; state.query = '';
  $g('#grammarSearch').value = '';
  $g('#grammarContent').hidden = true;
  $g('#grammarEmpty').hidden = true;
  $g('#grammarLoading').hidden = false;
  $g('#grammarLoading').textContent = 'Đang tải bài ngữ pháp…';
  await ensureLevel(level);
  if (state.level === level && !($g('#grammarView').hidden)) renderGrammar();
}
function clearGrammarFilters() {
  state.query = ''; state.topic = 'all'; state.status = 'all';
  $g('#grammarSearch').value = '';
  renderGrammar();
}

export async function showGrammar() {
  $g('#grammarLoading').hidden = false;
  await ensureCatalog();
  await ensureLevel(state.level);
  if (!$g('#grammarView').hidden) renderGrammar();
}

export function initGrammar() {
  $g('#grammarView').addEventListener('click', event => {
    const level = event.target.closest('[data-grammar-level]');
    if (level) { changeGrammarLevel(level.dataset.grammarLevel).catch(console.error); return; }
    const topic = event.target.closest('[data-grammar-topic]');
    if (topic) { state.topic = topic.dataset.grammarTopic; renderGrammar(); return; }
    const filter = event.target.closest('[data-grammar-filter]');
    if (filter) { state.status = filter.dataset.grammarFilter; renderGrammar(); return; }
    const lesson = event.target.closest('[data-grammar-lesson]');
    if (lesson) { selectLesson(lesson.dataset.grammarLesson, true); return; }
    const favorite = event.target.closest('[data-grammar-favorite]');
    if (favorite) {
      if (state.favorites.has(favorite.dataset.grammarFavorite)) state.favorites.delete(favorite.dataset.grammarFavorite);
      else state.favorites.add(favorite.dataset.grammarFavorite);
      saveJson(STORAGE_FAVORITES, [...state.favorites]);
      renderGrammar(); return;
    }
    if (event.target.closest('[data-grammar-sino]')) {
      state.showSino = !state.showSino;
      saveJson(STORAGE_SINO, state.showSino);
      renderGrammar(); return;
    }
    const step = event.target.closest('[data-grammar-step]');
    if (step) {
      const lessons = filteredLessons();
      const index = lessons.findIndex(item => item.id === state.selected);
      const next = lessons[index + Number(step.dataset.grammarStep)];
      if (next) selectLesson(next.id, true);
    }
  });
  $g('#grammarSearch').addEventListener('input', event => {
    state.query = event.target.value;
    renderGrammar();
  });
  $g('#grammarView').addEventListener('change', event => {
    if (event.target.id !== 'grammarLessonStatus' || !state.selected) return;
    if (event.target.value === 'planned') delete state.progress[state.selected];
    else state.progress[state.selected] = event.target.value;
    saveJson(STORAGE_PROGRESS, state.progress);
    renderGrammar();
  });
  $g('#grammarClearBtn').addEventListener('click', clearGrammarFilters);
  $g('#grammarResumeBtn').addEventListener('click', () => {
    const id = state.recent[state.level];
    clearGrammarFilters();
    if (id) selectLesson(id, true);
  });
}
