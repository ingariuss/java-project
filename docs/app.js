'use strict';

/* =========================================================
 *  LinguaRosa — карточки для изучения английского и иврита
 * ========================================================= */

const $app = document.getElementById('app');

const state = {
  languages: [],
  cards: {},        // code -> [cards]
  category: {},     // code -> выбранная тема
};

let cleanup = () => {};   // снимает обработчики текущего экрана

/* ---------- Утилиты ---------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const sample = (arr, n) => shuffle(arr).slice(0, n);

let staticMode = false;   // true, когда сайт открыт без Java-сервера (например, на GitHub Pages)

async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Ошибка загрузки (${res.status})`);
  return res.json();
}

/** Сначала пробуем Java-сервер, если его нет — берём готовые файлы из папки data/. */
async function api(path, staticPath) {
  if (!staticMode) {
    try {
      return await getJson(path);
    } catch {
      staticMode = true;
    }
  }
  return getJson(staticPath);
}

/** Озвучка слова голосом браузера. */
function speak(text, lang) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang.speechLang;
  u.rate = 0.85;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang.speechLang.slice(0, 2)));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/** Сердечки-конфетти 💗 */
function hearts(count = 24) {
  const box = document.createElement('div');
  box.className = 'hearts';
  const icons = ['💗', '💖', '🌸', '💕', '🎀', '✨'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = icons[i % icons.length];
    s.style.left = `${Math.random() * 100}%`;
    s.style.fontSize = `${18 + Math.random() * 22}px`;
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.setProperty('--r', `${Math.random() * 360 - 180}deg`);
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3800);
}

/* ---------- Прогресс (хранится в браузере) ---------- */

const Progress = {
  key: (code) => `linguarosa.known.${code}`,
  get(code) {
    try { return new Set(JSON.parse(localStorage.getItem(this.key(code)) || '[]')); } catch { return new Set(); }
  },
  save(code, set) {
    try { localStorage.setItem(this.key(code), JSON.stringify([...set])); } catch { /* приватный режим */ }
  },
  mark(code, id, known) {
    const s = this.get(code);
    if (known) s.add(id); else s.delete(id);
    this.save(code, s);
  },
};

/* ---------- Данные ---------- */

async function loadCards(code) {
  if (!state.cards[code]) state.cards[code] = await api(`api/cards?lang=${encodeURIComponent(code)}`, `data/cards-${encodeURIComponent(code)}.json`);
  return state.cards[code];
}

function filtered(code) {
  const cat = state.category[code] || 'all';
  const all = state.cards[code] || [];
  return cat === 'all' ? all : all.filter((c) => c.category === cat);
}

/** HTML слова на изучаемом языке (с поддержкой иврита справа налево). */
function wordHtml(lang, text, cls = 'word') {
  return lang.rtl
    ? `<div class="${cls} he" dir="rtl" lang="he">${esc(text)}</div>`
    : `<div class="${cls}" lang="${esc(lang.code)}">${esc(text)}</div>`;
}

const topbar = (title, backHref, extra = '') => `
  <div class="topbar">
    <a class="back" href="${backHref}" aria-label="Назад">←</a>
    <h2>${title}</h2>
    ${extra}
  </div>`;

/* ---------- Роутер ---------- */

const MODES = {
  flash: { title: 'Карточки', icon: '🃏', desc: 'Переворачивай и запоминай', render: renderFlash },
  quiz: { title: 'Викторина', icon: '🎯', desc: 'Выбери правильный ответ', render: renderQuiz },
  type: { title: 'Напиши слово', icon: '✍️', desc: 'Вспомни и введи сам', render: renderType },
  match: { title: 'Найди пару', icon: '💞', desc: 'Соедини слово и перевод', render: renderMatch },
  dict: { title: 'Словарик', icon: '📖', desc: 'Все слова и прогресс', render: renderDict },
};

async function route() {
  cleanup();
  cleanup = () => {};
  document.querySelectorAll('.hearts').forEach((h) => h.remove());
  window.scrollTo(0, 0);
  const [section, code, mode] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (!state.languages.length) {
      $app.innerHTML = '<div class="loader">🌸</div>';
      state.languages = await api('api/languages', 'data/languages.json');
    }
    const lang = state.languages.find((l) => l.code === code);
    if (section === 'lang' && lang) {
      await loadCards(lang.code);
      if (mode && MODES[mode]) MODES[mode].render(lang);
      else renderLanguage(lang);
    } else {
      renderHome();
    }
  } catch (e) {
    $app.innerHTML = `<div class="error">😿 Не получилось загрузить данные.<br><small>${esc(e.message)}</small></div>`;
  }
}

window.addEventListener('hashchange', route);
route();

/* ---------- Главная ---------- */

function renderHome() {
  $app.innerHTML = `
    <header class="hero">
      <div class="logo">🌸</div>
      <h1>LinguaRosa</h1>
      <p>Выбери язык и учи слова с карточками</p>
    </header>
    <div class="lang-grid">
      ${state.languages.map((l) => {
        const known = Progress.get(l.code).size;
        const pct = l.cardCount ? Math.round((known / l.cardCount) * 100) : 0;
        return `
          <a class="lang-card" href="#/lang/${esc(l.code)}">
            <div class="flag">${esc(l.flag)}</div>
            <h2>${esc(l.name)}</h2>
            <p class="native ${l.rtl ? 'he' : ''}" ${l.rtl ? 'dir="rtl"' : ''}>${esc(l.nativeName)}</p>
            <div class="progress"><div style="width:${pct}%"></div></div>
            <small>Выучено ${known} из ${l.cardCount} · ${pct}%</small>
          </a>`;
      }).join('')}
    </div>
    <p class="footer">Сделано с любовью 💗</p>`;
}

/* ---------- Экран языка ---------- */

function renderLanguage(lang) {
  const all = state.cards[lang.code];
  const categories = [...new Set(all.map((c) => c.category))];
  const current = state.category[lang.code] || 'all';
  const known = Progress.get(lang.code);
  const list = filtered(lang.code);
  const knownHere = list.filter((c) => known.has(c.id)).length;

  $app.innerHTML = `
    ${topbar(`${esc(lang.flag)} ${esc(lang.name)}`, '#/')}
    <div class="stat-row">
      <div class="stat"><b>${list.length}</b><span>слов в наборе</span></div>
      <div class="stat"><b>${knownHere}</b><span>уже знаю 💖</span></div>
      <div class="stat"><b>${list.length - knownHere}</b><span>ещё учить</span></div>
    </div>
    <div class="section-title">Тема</div>
    <div class="chips">
      ${['all', ...categories].map((c) => `
        <button class="chip ${c === current ? 'active' : ''}" data-cat="${esc(c)}">${c === 'all' ? '✨ Все' : esc(c)}</button>`).join('')}
    </div>
    <div class="section-title">Как будем учить?</div>
    <div class="modes">
      ${Object.entries(MODES).map(([key, m]) => `
        <a class="mode" href="#/lang/${esc(lang.code)}/${key}">
          <div class="icon">${m.icon}</div>
          <div><b>${m.title}</b><span>${m.desc}</span></div>
        </a>`).join('')}
    </div>`;

  $app.querySelectorAll('.chip').forEach((btn) => btn.addEventListener('click', () => {
    state.category[lang.code] = btn.dataset.cat;
    renderLanguage(lang);
  }));
}

/* ---------- Экран результата ---------- */

function renderResult(lang, { emoji, title, lines, againLabel = 'Ещё раз', onAgain, extra = [] }) {
  $app.innerHTML = `
    ${topbar('Результат', `#/lang/${lang.code}`)}
    <div class="result">
      <div class="emoji">${emoji}</div>
      <h2>${title}</h2>
      ${lines.map((l) => `<p>${l}</p>`).join('')}
      <div class="actions">
        <button class="btn primary" data-act="again">${againLabel}</button>
        ${extra.map((e, i) => `<button class="btn soft" data-act="x${i}">${e.label}</button>`).join('')}
        <a class="btn" href="#/lang/${lang.code}">К выбору режима</a>
      </div>
    </div>`;
  $app.querySelector('[data-act="again"]').addEventListener('click', onAgain);
  extra.forEach((e, i) => $app.querySelector(`[data-act="x${i}"]`).addEventListener('click', e.onClick));
}

function emptyScreen(lang, text) {
  $app.innerHTML = `${topbar('Упс', `#/lang/${lang.code}`)}<div class="empty">${text}</div>`;
}

/* =========================================================
 *  Режим 1: Карточки (переворот + свайп)
 * ========================================================= */

function renderFlash(lang, deckOverride) {
  const deck = deckOverride || shuffle(filtered(lang.code));
  if (!deck.length) return emptyScreen(lang, 'В этой теме пока нет карточек 🌱');

  let i = 0;
  const knownNow = [];
  const learnNow = [];

  const draw = () => {
    if (i >= deck.length) return finish();
    const c = deck[i];
    $app.innerHTML = `
      ${topbar('🃏 Карточки', `#/lang/${lang.code}`, `<span class="pill">${i + 1} / ${deck.length}</span>`)}
      <div class="progress"><div style="width:${(i / deck.length) * 100}%"></div></div>
      <div class="flash-wrap">
        <div class="flashcard" id="card">
          <div class="flash-stamp know">ЗНАЮ 💖</div>
          <div class="flash-stamp learn">УЧУ 📚</div>
          <div class="face face-front">
            <div class="cat">${esc(c.category)}</div>
            ${wordHtml(lang, c.word)}
            <div class="trans">${esc(c.transcription)}</div>
            <button class="speak" data-speak title="Послушать">🔊</button>
            <div class="hint">нажми, чтобы перевернуть</div>
          </div>
          <div class="face face-back">
            <div class="cat">${esc(c.category)}</div>
            <div class="translation">${esc(c.translation)}</div>
            ${c.example ? `<div class="example ${lang.rtl ? 'he' : ''}" ${lang.rtl ? 'dir="rtl"' : ''}>${esc(c.example)}</div>` : ''}
            <div class="hint">свайп вправо — знаю, влево — учу</div>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn soft big" data-act="learn">📚 Ещё учу</button>
        <button class="btn primary big" data-act="know">💖 Знаю</button>
      </div>
      <div class="keys-hint">Пробел — перевернуть · ← учу · → знаю</div>`;

    const card = $app.querySelector('#card');
    const stampKnow = card.querySelector('.know');
    const stampLearn = card.querySelector('.learn');
    let flipped = false;
    let startX = null;
    let dx = 0;
    let moved = false;

    const flip = () => { flipped = !flipped; card.classList.toggle('flipped', flipped); };

    card.querySelector('[data-speak]').addEventListener('click', (e) => { e.stopPropagation(); speak(c.word, lang); });
    card.addEventListener('click', () => { if (!moved) flip(); });

    // Свайп пальцем или мышкой
    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-speak]')) return;
      startX = e.clientX; dx = 0; moved = false;
      card.classList.add('dragging');
    });
    card.addEventListener('pointermove', (e) => {
      if (startX === null) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg) ${flipped ? 'rotateY(180deg)' : ''}`;
      stampKnow.style.opacity = Math.max(0, Math.min(1, dx / 90));
      stampLearn.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    const release = () => {
      if (startX === null) return;
      startX = null;
      card.classList.remove('dragging');
      if (dx > 90) return answer(true, 1);
      if (dx < -90) return answer(false, -1);
      card.style.transform = '';
      stampKnow.style.opacity = stampLearn.style.opacity = 0;
      setTimeout(() => { moved = false; }, 0);
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointerleave', release);
    card.addEventListener('pointercancel', release);

    $app.querySelector('[data-act="know"]').addEventListener('click', () => answer(true, 1));
    $app.querySelector('[data-act="learn"]').addEventListener('click', () => answer(false, -1));

    function answer(known, dir) {
      Progress.mark(lang.code, c.id, known);
      (known ? knownNow : learnNow).push(c);
      card.style.transition = 'transform .35s ease-in, opacity .35s';
      card.style.transform = `translateX(${dir * 600}px) rotate(${dir * 25}deg) ${flipped ? 'rotateY(180deg)' : ''}`;
      card.style.opacity = '0';
      $app.querySelectorAll('.btn').forEach((b) => { b.disabled = true; });
      setTimeout(() => { i++; draw(); }, 300);
    }

    onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowRight') answer(true, 1);
      else if (e.key === 'ArrowLeft') answer(false, -1);
    };
  };

  let onKey = () => {};
  const keyHandler = (e) => onKey(e);
  document.addEventListener('keydown', keyHandler);
  cleanup = () => document.removeEventListener('keydown', keyHandler);

  const finish = () => {
    onKey = () => {};
    const pct = Math.round((knownNow.length / deck.length) * 100);
    if (pct >= 70) hearts();
    renderResult(lang, {
      emoji: pct >= 70 ? '🥰' : pct >= 40 ? '😊' : '🌱',
      title: pct >= 70 ? 'Великолепно!' : 'Хорошая работа!',
      lines: [`Знаю: <b>${knownNow.length}</b> · Ещё учу: <b>${learnNow.length}</b>`],
      onAgain: () => renderFlash(lang),
      extra: learnNow.length
        ? [{ label: `📚 Повторить сложные (${learnNow.length})`, onClick: () => renderFlash(lang, shuffle(learnNow)) }]
        : [],
    });
  };

  draw();
}

/* =========================================================
 *  Режим 2: Викторина (4 варианта)
 * ========================================================= */

function renderQuiz(lang) {
  const pool = filtered(lang.code);
  const all = state.cards[lang.code];
  if (!pool.length) return emptyScreen(lang, 'В этой теме пока нет карточек 🌱');

  const questions = sample(pool, Math.min(10, pool.length)).map((card, idx) => {
    const reverse = idx % 2 === 1; // чередуем: слово → перевод и перевод → слово
    const distractSource = (pool.length >= 4 ? pool : all).filter((c) => c.id !== card.id);
    const options = shuffle([card, ...sample(distractSource, 3)]);
    return { card, reverse, options };
  });

  let i = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let timer = null;
  cleanup = () => clearTimeout(timer);

  const draw = () => {
    if (i >= questions.length) return finish();
    const { card, reverse, options } = questions[i];
    $app.innerHTML = `
      ${topbar('🎯 Викторина', `#/lang/${lang.code}`, `<span class="pill">${i + 1} / ${questions.length}</span>`)}
      <div class="progress"><div style="width:${(i / questions.length) * 100}%"></div></div>
      <div class="question">
        ${streak >= 2 ? `<div class="streak">🔥 ${streak}</div>` : ''}
        <div class="label">${reverse ? `Как будет по-${lang.code === 'he' ? 'еврейски' : 'английски'}?` : 'Что это значит?'}</div>
        ${reverse
          ? `<div class="word">${esc(card.translation)}</div>`
          : `${wordHtml(lang, card.word)}<div class="trans">${esc(card.transcription)}</div>
             <button class="speak" data-speak title="Послушать">🔊</button>`}
      </div>
      <div class="options">
        ${options.map((o) => `
          <button class="option ${reverse && lang.rtl ? 'he' : ''}" data-id="${esc(o.id)}" ${reverse && lang.rtl ? 'dir="rtl"' : ''}>
            ${esc(reverse ? o.word : o.translation)}
          </button>`).join('')}
      </div>`;

    $app.querySelector('[data-speak]')?.addEventListener('click', () => speak(card.word, lang));
    $app.querySelectorAll('.option').forEach((btn) => btn.addEventListener('click', () => {
      const right = btn.dataset.id === card.id;
      $app.querySelectorAll('.option').forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === card.id) b.classList.add('correct');
      });
      if (right) {
        score++; streak++; bestStreak = Math.max(bestStreak, streak);
      } else {
        btn.classList.add('wrong'); streak = 0;
      }
      if (reverse === false || right) speak(card.word, lang);
      timer = setTimeout(() => { i++; draw(); }, right ? 900 : 1700);
    }));
  };

  const finish = () => {
    const pct = Math.round((score / questions.length) * 100);
    if (pct >= 70) hearts();
    renderResult(lang, {
      emoji: pct === 100 ? '👑' : pct >= 70 ? '🥰' : pct >= 40 ? '😊' : '🌱',
      title: pct === 100 ? 'Идеально!' : pct >= 70 ? 'Супер!' : 'Продолжай тренироваться!',
      lines: [`Правильно: <b>${score}</b> из ${questions.length} (${pct}%)`, `Лучшая серия: 🔥 ${bestStreak}`],
      onAgain: () => renderQuiz(lang),
    });
  };

  draw();
}

/* =========================================================
 *  Режим 3: Напиши слово
 * ========================================================= */

/** Приводим ответ к простому виду: без огласовок, регистра, ё и знаков препинания. */
const normalize = (s) => String(s)
  .toLowerCase()
  .normalize('NFC')
  .replace(/[֑-ׇ]/g, '')   // огласовки иврита (никуд)
  .replace(/ё/g, 'е')
  .replace(/[^\p{L}\p{N} ]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function renderType(lang) {
  const pool = filtered(lang.code);
  if (!pool.length) return emptyScreen(lang, 'В этой теме пока нет карточек 🌱');

  const items = sample(pool, Math.min(10, pool.length));
  let i = 0;
  let score = 0;
  const mistakes = [];
  let timer = null;
  cleanup = () => clearTimeout(timer);

  const draw = () => {
    if (i >= items.length) return finish();
    const c = items[i];
    // Для иврита принимаем и само слово, и транскрипцию русскими буквами
    const answers = [c.word, lang.rtl ? c.transcription : null].filter(Boolean).map(normalize);
    const hintSource = lang.rtl ? c.transcription : c.word;
    let hintLen = 0;
    let done = false;

    $app.innerHTML = `
      ${topbar('✍️ Напиши слово', `#/lang/${lang.code}`, `<span class="pill">${i + 1} / ${items.length}</span>`)}
      <div class="progress"><div style="width:${(i / items.length) * 100}%"></div></div>
      <div class="question">
        <div class="label">Переведи на ${lang.code === 'he' ? 'иврит' : 'английский'}</div>
        <div class="word">${esc(c.translation)}</div>
        <div class="trans" id="hint">&nbsp;</div>
      </div>
      <form class="type-form" autocomplete="off">
        <input class="type-input" id="answer" ${lang.rtl ? 'dir="auto"' : ''}
               placeholder="${lang.rtl ? 'на иврите или транскрипцией' : 'введи слово'}" autocapitalize="off" spellcheck="false">
        <button class="btn primary" type="submit">OK</button>
      </form>
      <div class="feedback" id="feedback"></div>
      <div class="actions">
        <button class="btn soft" data-act="hint">💡 Подсказка</button>
        <button class="btn" data-act="skip">🙈 Не знаю</button>
      </div>`;

    const input = $app.querySelector('#answer');
    const feedback = $app.querySelector('#feedback');
    const hint = $app.querySelector('#hint');
    input.focus();

    const reveal = (ok, text) => {
      done = true;
      feedback.className = `feedback ${ok ? 'ok' : 'bad'}`;
      feedback.innerHTML = text;
      input.disabled = true;
      $app.querySelectorAll('[data-act]').forEach((b) => { b.disabled = true; });
      speak(c.word, lang);
      timer = setTimeout(() => { i++; draw(); }, ok ? 1300 : 2600);
    };
    const correctText = () => `<span ${lang.rtl ? 'class="he" dir="rtl"' : ''}>${esc(c.word)}</span> · ${esc(c.transcription)}`;

    $app.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (done) return;
      const value = normalize(input.value);
      if (!value) return;
      if (answers.includes(value)) {
        score++;
        input.classList.add('ok');
        Progress.mark(lang.code, c.id, true);
        reveal(true, `Верно! 💖 ${correctText()}`);
      } else if (answers.some((a) => a.length > 3 && distance(a, value) === 1)) {
        score++;
        input.classList.add('ok');
        reveal(true, `Почти идеально! Правильно: ${correctText()}`);
      } else {
        input.classList.remove('bad');
        void input.offsetWidth; // перезапуск анимации
        input.classList.add('bad');
        feedback.className = 'feedback bad';
        feedback.textContent = 'Не совсем… попробуй ещё или возьми подсказку';
      }
    });
    $app.querySelector('[data-act="hint"]').addEventListener('click', () => {
      hintLen = Math.min(hintLen + 1, hintSource.length);
      hint.textContent = hintSource.slice(0, hintLen) + '…';
      input.focus();
    });
    $app.querySelector('[data-act="skip"]').addEventListener('click', () => {
      mistakes.push(c);
      Progress.mark(lang.code, c.id, false);
      reveal(false, `Правильный ответ: ${correctText()}`);
    });
  };

  const finish = () => {
    const pct = Math.round((score / items.length) * 100);
    if (pct >= 70) hearts();
    renderResult(lang, {
      emoji: pct >= 70 ? '🥰' : '✍️',
      title: pct >= 70 ? 'Отлично пишешь!' : 'Хорошая тренировка!',
      lines: [
        `Правильно: <b>${score}</b> из ${items.length}`,
        mistakes.length ? `Повтори: ${mistakes.map((m) => esc(m.translation)).join(', ')}` : '',
      ],
      onAgain: () => renderType(lang),
    });
  };

  draw();
}

/* =========================================================
 *  Режим 4: Найди пару
 * ========================================================= */

function renderMatch(lang) {
  const pool = filtered(lang.code);
  if (pool.length < 2) return emptyScreen(lang, 'Для игры нужно хотя бы 2 слова в теме 🌱');

  const pairs = sample(pool, Math.min(6, pool.length));
  const left = shuffle(pairs);
  const right = shuffle(pairs);
  const started = Date.now();
  let selected = null;   // { side, id, el }
  let matched = 0;
  let mistakes = 0;

  $app.innerHTML = `
    ${topbar('💞 Найди пару', `#/lang/${lang.code}`, '<span class="pill" id="score">0 / ' + pairs.length + '</span>')}
    <p class="counter">Нажми на слово, а потом на его перевод</p>
    <div class="match-grid">
      <div class="match-col">
        ${left.map((c) => `<button class="tile ${lang.rtl ? 'he' : ''}" data-side="l" data-id="${esc(c.id)}" ${lang.rtl ? 'dir="rtl"' : ''}>${esc(c.word)}</button>`).join('')}
      </div>
      <div class="match-col">
        ${right.map((c) => `<button class="tile" data-side="r" data-id="${esc(c.id)}">${esc(c.translation)}</button>`).join('')}
      </div>
    </div>`;

  const scoreEl = $app.querySelector('#score');
  let timer = null;
  cleanup = () => clearTimeout(timer);

  $app.querySelectorAll('.tile').forEach((tile) => tile.addEventListener('click', () => {
    const { side, id } = tile.dataset;
    if (!selected || selected.side === side) {
      selected?.el.classList.remove('selected');
      selected = { side, id, el: tile };
      tile.classList.add('selected');
      if (side === 'l') speak(pairs.find((p) => p.id === id).word, lang);
      return;
    }
    const other = selected.el;
    selected = null;
    if (other.dataset.id === id) {
      [other, tile].forEach((t) => { t.classList.remove('selected'); t.classList.add('done'); t.disabled = true; });
      matched++;
      scoreEl.textContent = `${matched} / ${pairs.length}`;
      if (matched === pairs.length) timer = setTimeout(finish, 700);
    } else {
      mistakes++;
      [other, tile].forEach((t) => { t.classList.remove('selected'); t.classList.add('wrong'); });
      setTimeout(() => [other, tile].forEach((t) => t.classList.remove('wrong')), 450);
    }
  }));

  function finish() {
    const seconds = Math.round((Date.now() - started) / 1000);
    if (mistakes <= 1) hearts();
    renderResult(lang, {
      emoji: mistakes === 0 ? '💞' : '😊',
      title: mistakes === 0 ? 'Без единой ошибки!' : 'Все пары найдены!',
      lines: [`Время: <b>${seconds} сек</b> · Ошибок: <b>${mistakes}</b>`],
      againLabel: 'Новый раунд',
      onAgain: () => renderMatch(lang),
    });
  }
}

/* =========================================================
 *  Режим 5: Словарик
 * ========================================================= */

function renderDict(lang) {
  const list = filtered(lang.code);
  $app.innerHTML = `
    ${topbar('📖 Словарик', `#/lang/${lang.code}`, `<span class="pill">${list.length} слов</span>`)}
    <input class="search" id="search" placeholder="🔍 Поиск по слову или переводу">
    <div class="dict" id="dict"></div>`;

  const box = $app.querySelector('#dict');
  const draw = (q = '') => {
    const known = Progress.get(lang.code);
    const nq = normalize(q);
    const rows = list.filter((c) => !nq || [c.word, c.transcription, c.translation].some((f) => normalize(f).includes(nq)));
    box.innerHTML = rows.length ? rows.map((c) => `
      <div class="dict-row">
        <button class="icon-btn" data-speak="${esc(c.id)}" title="Послушать">🔊</button>
        <div class="main">
          ${wordHtml(lang, c.word, 'w')}
          <div class="t">${esc(c.transcription)} · ${esc(c.category)}</div>
        </div>
        <div class="tr">${esc(c.translation)}</div>
        <button class="icon-btn" data-known="${esc(c.id)}" title="Отметить как выученное">${known.has(c.id) ? '💖' : '🤍'}</button>
      </div>`).join('') : '<div class="empty">Ничего не найдено 🌸</div>';
  };
  draw();

  $app.querySelector('#search').addEventListener('input', (e) => draw(e.target.value));
  box.addEventListener('click', (e) => {
    const sp = e.target.closest('[data-speak]');
    if (sp) speak(list.find((c) => c.id === sp.dataset.speak).word, lang);
    const kn = e.target.closest('[data-known]');
    if (kn) {
      const id = kn.dataset.known;
      const isKnown = Progress.get(lang.code).has(id);
      Progress.mark(lang.code, id, !isKnown);
      kn.textContent = isKnown ? '🤍' : '💖';
    }
  });
}
