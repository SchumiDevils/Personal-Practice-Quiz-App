/* ============================================================
   Cybersecurity Essentials — Practice Quiz App
   ============================================================ */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const State = {
  mode: 'home',           // 'home' | 'quiz' | 'flash' | 'study' | 'summary'
  filter: 'all',          // 'all' | 'mcq' | 'multi' | 'match' | 'starred' | 'missed'
  starred: new Set(JSON.parse(localStorage.getItem('cyb_starred') || '[]')),
  missed:  new Set(JSON.parse(localStorage.getItem('cyb_missed')  || '[]')),

  // Quiz session
  quiz: {
    pool: [],
    current: 0,
    selected: [],         // current answer selection (indices)
    answered: false,
    score: 0,
    wrong: 0,
    history: [],          // {id, correct, selected}
  },

  // Flashcard session
  flash: {
    pool: [],
    current: 0,
    flipped: false,
    correct: 0,
    wrong: 0,
    seen: 0,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function persist() {
  localStorage.setItem('cyb_starred', JSON.stringify([...State.starred]));
  localStorage.setItem('cyb_missed',  JSON.stringify([...State.missed]));
}

function getPool() {
  let qs = [...QUESTIONS];
  if (State.filter === 'mcq')     qs = qs.filter(q => q.type === 'mcq');
  if (State.filter === 'multi')   qs = qs.filter(q => q.type === 'multi');
  if (State.filter === 'match')   qs = qs.filter(q => q.type === 'match');
  if (State.filter === 'starred') qs = qs.filter(q => State.starred.has(q.id));
  if (State.filter === 'missed')  qs = qs.filter(q => State.missed.has(q.id));
  return qs;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const scr = $('screen-' + name);
  if (scr) scr.style.display = '';
  State.mode = name;
  // Show filters in header whenever not on home/summary
  const headerFilters = $('header-filters');
  if (headerFilters) {
    headerFilters.style.display = (name === 'home' || name === 'summary') ? 'none' : 'flex';
  }
  updateNav();
}

function updateNav() {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === State.mode);
  });
  updateHeaderStats();
}

function updateHeaderStats() {
  const sc = $('stat-score');
  const st = $('stat-total');
  if (sc) sc.innerHTML = `<span>${State.quiz.score}</span> pts`;
  if (st) st.innerHTML = `<span>${State.starred.size}</span> ★`;
}

// ---------------------------------------------------------------------------
// HOME
// ---------------------------------------------------------------------------
function initHome() {
  showScreen('home');
}

// ---------------------------------------------------------------------------
// QUIZ MODE
// ---------------------------------------------------------------------------
function startQuiz() {
  let pool = getPool().filter(q => q.type !== 'match' || q.matchPairs);
  if (!pool.length) { alert('No questions match this filter.'); return; }
  pool = shuffle(pool);

  State.quiz = {
    pool, current: 0, selected: [], answered: false,
    score: 0, wrong: 0, history: [],
  };
  showScreen('quiz');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const main = $('quiz-body');
  if (!main) return;
  main.innerHTML = '';

  const { pool, current } = State.quiz;
  if (current >= pool.length) { showSummary(); return; }

  const q = pool[current];
  State.quiz.selected = [];
  State.quiz.answered = false;

  // Progress
  const pct = Math.round((current / pool.length) * 100);
  const progressWrap = el('div');
  progressWrap.innerHTML = `
    <div class="progress-label">
      <span>Question ${current + 1} of ${pool.length}</span>
      <span>${pct}%</span>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width:${pct}%"></div>
    </div>`;
  main.appendChild(progressWrap);

  // Question card
  const card = el('div', 'question-card slide-in');

  const isStarred = State.starred.has(q.id);
  const typeBadge = q.type === 'multi' ? 'multi' : q.type === 'match' ? 'match' : 'mcq';
  const typeLabel = q.type === 'multi' ? `Multi (choose ${q.correct.length})` :
                    q.type === 'match' ? 'Match' : 'Single';

  card.innerHTML = `
    <div class="question-meta">
      <span class="q-num">Q${q.id}</span>
      <span class="q-type-badge ${typeBadge}">${typeLabel}</span>
      ${q.topic ? `<span class="q-topic">Topic ${q.topic}</span>` : ''}
    </div>
    <p class="question-text">${q.question}</p>`;

  if (q.type === 'match') {
    renderMatchQuestion(card, q);
  } else {
    if (q.multiple) {
      card.appendChild(el('div', 'multi-hint', `⚡ Select ${q.correct.length} correct answers`));
    }
    renderOptions(card, q);
  }

  // Star button
  const starBtn = el('button', `star-btn${isStarred ? ' starred' : ''}`, isStarred ? '★' : '☆');
  starBtn.title = 'Bookmark this question';
  starBtn.addEventListener('click', () => toggleStar(q.id, starBtn));

  const actionBar = el('div', 'action-bar');
  const submitBtn = el('button', 'btn btn-primary', 'Submit Answer →');
  submitBtn.id = 'quiz-submit';
  submitBtn.disabled = true;
  submitBtn.addEventListener('click', () => checkAnswer(q, card, submitBtn, nextBtn));

  const nextBtn = el('button', 'btn btn-secondary', 'Skip →');
  nextBtn.addEventListener('click', () => {
    if (!State.quiz.answered) {
      // Mark as missed if skipped without answering
      State.missed.add(q.id);
      persist();
    }
    State.quiz.current++;
    renderQuizQuestion();
  });

  actionBar.appendChild(submitBtn);
  actionBar.appendChild(nextBtn);
  actionBar.appendChild(starBtn);
  card.appendChild(actionBar);
  main.appendChild(card);

  const hints = el('div', 'kbd-hints', `
    <span>A-D select <span class="kbd">key</span></span>
    <span>Enter submit <span class="kbd">↵</span></span>
    <span>→ next <span class="kbd">→</span></span>
  `);
  main.appendChild(hints);
}

function renderOptions(card, q) {
  const optionOrder = shuffle(q.options.map((o, i) => ({ text: o, origIdx: i })));

  const list = el('div', 'options-list');
  optionOrder.forEach(({ text, origIdx }, displayIdx) => {
    const btn = el('button', 'option-btn');
    btn.dataset.origIdx = origIdx;
    btn.innerHTML = `
      <span class="option-letter">${LETTERS[displayIdx]}</span>
      <span class="option-text">${text}</span>
      <span class="option-check"></span>`;

    btn.addEventListener('click', () => {
      if (State.quiz.answered) return;
      if (q.multiple) {
        // Toggle
        if (State.quiz.selected.includes(origIdx)) {
          State.quiz.selected = State.quiz.selected.filter(i => i !== origIdx);
          btn.classList.remove('selected');
        } else {
          State.quiz.selected.push(origIdx);
          btn.classList.add('selected');
        }
        $('quiz-submit').disabled = State.quiz.selected.length === 0;
      } else {
        list.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        State.quiz.selected = [origIdx];
        $('quiz-submit').disabled = false;
      }
    });

    list.appendChild(btn);
  });

  card.appendChild(list);
}

function renderMatchQuestion(card, q) {
  const table = el('table', 'match-table');
  table.innerHTML = `<thead><tr>
    <th>Step / Item</th>
    <th>Description</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');
  (q.matchPairs || []).forEach(([a, b]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a}</td><td>${b}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);

  if (q.explanation) {
    const expl = el('div', 'explanation-box', `<strong>Answer / Explanation</strong>${q.explanation}`);
    card.appendChild(expl);
  }
}

function checkAnswer(q, card, submitBtn, nextBtn) {
  State.quiz.answered = true;
  submitBtn.disabled = true;
  submitBtn.textContent = '✓ Submitted';

  const selected = State.quiz.selected;
  const correct  = q.correct;

  const isCorrect = (
    selected.length === correct.length &&
    selected.every(i => correct.includes(i))
  );

  if (isCorrect) {
    State.quiz.score++;
    State.missed.delete(q.id);
  } else {
    State.quiz.wrong++;
    State.missed.add(q.id);
  }
  persist();

  // Color the options
  const optBtns = card.querySelectorAll('.option-btn');
  optBtns.forEach(btn => {
    btn.disabled = true;
    const idx = parseInt(btn.dataset.origIdx, 10);
    const isCorrectOpt = correct.includes(idx);
    const isSelectedOpt = selected.includes(idx);

    if (isCorrectOpt && isSelectedOpt) {
      btn.classList.add('correct');
      btn.querySelector('.option-check').textContent = '✓';
    } else if (isCorrectOpt && !isSelectedOpt) {
      btn.classList.add('missed');
      btn.querySelector('.option-check').textContent = '→';
    } else if (!isCorrectOpt && isSelectedOpt) {
      btn.classList.add('wrong');
      btn.querySelector('.option-check').textContent = '✗';
    }
  });

  // Feedback banner
  const banner = el('div', `explanation-box`, '');
  banner.innerHTML = isCorrect
    ? `<strong style="color:var(--success)">✓ Correct!</strong>${q.explanation}`
    : `<strong style="color:var(--danger)">✗ Incorrect</strong>${q.explanation}`;
  card.insertBefore(banner, card.querySelector('.action-bar'));

  // Change Next button
  nextBtn.textContent = 'Next Question →';
  nextBtn.classList.remove('btn-secondary');
  nextBtn.classList.add('btn-primary');
  nextBtn.onclick = () => { State.quiz.current++; renderQuizQuestion(); };

  // Save history
  State.quiz.history.push({ id: q.id, q: q.question, correct, selected, isCorrect });
  updateHeaderStats();
}

// ---------------------------------------------------------------------------
// FLASHCARD MODE
// ---------------------------------------------------------------------------
function startFlash() {
  let pool = getPool();
  if (!pool.length) { alert('No questions match this filter.'); return; }
  pool = shuffle(pool);

  State.flash = { pool, current: 0, flipped: false, correct: 0, wrong: 0, seen: 0 };
  showScreen('flash');
  renderFlashCard();
}

function renderFlashCard() {
  const main = $('flash-body');
  if (!main) return;
  main.innerHTML = '';

  const { pool, current, correct, wrong } = State.flash;
  if (current >= pool.length) { showFlashSummary(); return; }

  const q = pool[current];
  State.flash.flipped = false;

  // Progress
  const pct = Math.round((current / pool.length) * 100);
  const progressWrap = el('div');
  progressWrap.innerHTML = `
    <div class="progress-label">
      <span>Card ${current + 1} of ${pool.length}</span>
      <span style="color:var(--success)">✓ ${correct}</span>
      <span style="color:var(--danger)">✗ ${wrong}</span>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width:${pct}%"></div>
    </div>`;
  main.appendChild(progressWrap);

  // Correct answer text for flashcard back
  let answerText = '';
  if (q.type === 'match' && q.matchPairs && q.matchPairs.length) {
    answerText = `<table style="width:100%;border-collapse:collapse;font-size:14px">` +
      q.matchPairs.map(([a,b]) => `<tr>
        <td style="padding:5px 10px 5px 0;color:var(--accent2);font-family:var(--mono);font-size:13px;font-weight:600;width:50%;vertical-align:top">${a}</td>
        <td style="padding:5px 0;color:var(--text);vertical-align:top">${b}</td>
      </tr>`).join('') + `</table>`;
  } else if (q.correct && q.correct.length) {
    answerText = q.correct.map(i => `<div style="padding:4px 0;color:var(--success)">${q.options[i]}</div>`).join('');
  } else {
    answerText = q.explanation;
  }

  // Card
  const area = el('div', 'flash-area');
  area.innerHTML = `
    <div class="flash-card-inner">
      <div class="flash-face flash-front">
        <p class="flash-q-text">${q.question}</p>
        <span class="flash-hint">Click card or press <span class="kbd">Space</span> to reveal</span>
      </div>
      <div class="flash-face flash-back">
        <div class="flash-answer-label">✓ Correct Answer</div>
        <div class="flash-answer-text">${answerText}</div>
        <div class="flash-explanation">${q.explanation || ''}</div>
      </div>
    </div>`;

  area.addEventListener('click', () => flipCard(area));
  main.appendChild(area);

  // Self-mark controls (shown after flip)
  const controls = el('div', 'flash-controls', '');
  controls.id = 'flash-controls';
  controls.style.display = 'none';
  controls.innerHTML = `
    <button class="btn-wrong"  id="fc-wrong" ><span class="kbd">\u2190</span> Didn't know</button>
    <button class="btn-correct" id="fc-correct">Got it <span class="kbd">\u2192</span></button>`;
  main.appendChild(controls);

  controls.querySelector('#fc-wrong').addEventListener('click',  () => markFlash(false));
  controls.querySelector('#fc-correct').addEventListener('click', () => markFlash(true));

  // Star + skip
  const isStarred = State.starred.has(q.id);
  const navRow = el('div', 'action-bar', `
    <button class="btn btn-ghost" id="flash-skip">Skip ›</button>`);
  const starBtn = el('button', `star-btn${isStarred ? ' starred' : ''}`, isStarred ? '★' : '☆');
  starBtn.addEventListener('click', () => toggleStar(q.id, starBtn));
  navRow.appendChild(starBtn);
  main.appendChild(navRow);
  $('flash-skip').addEventListener('click', () => {
    State.flash.current++;
    renderFlashCard();
  });

  const kbdHint = el('div', 'kbd-hints', `
    <span>Flip <span class="kbd">Space</span></span>
    <span>Got it <span class="kbd">\u2192</span></span>
    <span>Missed <span class="kbd">\u2190</span></span>
  `);
  main.appendChild(kbdHint);
}

function flipCard(area) {
  State.flash.flipped = !State.flash.flipped;
  area.classList.toggle('flipped', State.flash.flipped);
  const ctrl = $('flash-controls');
  if (ctrl) ctrl.style.display = State.flash.flipped ? 'flex' : 'none';
}

function markFlash(wasCorrect) {
  const q = State.flash.pool[State.flash.current];
  if (wasCorrect) {
    State.flash.correct++;
    State.missed.delete(q.id);
  } else {
    State.flash.wrong++;
    State.missed.add(q.id);
  }
  persist();
  State.flash.seen++;
  State.flash.current++;
  renderFlashCard();
}

function showFlashSummary() {
  const main = $('flash-body');
  if (!main) return;
  const { correct, wrong, pool } = State.flash;
  const total = pool.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  main.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:28px;padding:48px 0">
      <div class="summary-score">
        <div class="big-num">${pct}%</div>
        <div class="big-label">Flashcard Session Complete</div>
      </div>
      <div class="summary-grid">
        <div class="summary-stat correct"><div class="num">${correct}</div><div class="lbl">Got it</div></div>
        <div class="summary-stat wrong">  <div class="num">${wrong}</div><div class="lbl">Missed</div></div>
        <div class="summary-stat skipped"><div class="num">${total}</div><div class="lbl">Total</div></div>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick="startFlash()">Retry Deck</button>
        <button class="btn btn-secondary" onclick="initHome()">Back to Home</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// STUDY MODE
// ---------------------------------------------------------------------------
function startStudy() {
  const pool = getPool();
  if (!pool.length) { alert('No questions match this filter.'); return; }
  showScreen('study');
  renderStudy(pool);

  // Wire study search
  const searchInput = $('study-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = () => {
      const term = searchInput.value.toLowerCase();
      document.querySelectorAll('.study-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    };
  }
}

function renderStudy(pool) {
  const main = $('study-body');
  if (!main) return;
  main.innerHTML = '';

  pool.forEach(q => {
    const item = el('div', 'study-item');
    const isStarred = State.starred.has(q.id);

    const header = el('div', 'study-item-header');
    header.innerHTML = `
      <span class="study-item-num">Q${q.id}</span>
      <span class="study-item-q">${q.question}</span>
      <span class="study-item-arrow">▾</span>`;
    header.addEventListener('click', () => item.classList.toggle('open'));

    const body = el('div', 'study-item-body');

    if (q.type === 'match' && q.matchPairs) {
      const table = el('table', 'match-table');
      table.innerHTML = `<thead><tr><th>Item</th><th>Match</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      q.matchPairs.forEach(([a,b]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${a}</td><td>${b}</td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(table);
    } else {
      q.options.forEach((opt, i) => {
        const isCorrect = q.correct.includes(i);
        const div = el('div', `study-answer ${isCorrect ? 'correct-ans' : 'other-ans'}`);
        div.textContent = (isCorrect ? '✓ ' : '') + opt;
        body.appendChild(div);
      });
    }

    if (q.explanation) {
      const expl = el('div', 'study-expl', q.explanation);
      body.appendChild(expl);
    }

    // Star button
    const starBtn = el('button', `star-btn${isStarred ? ' starred' : ''}`, isStarred ? '★' : '☆');
    starBtn.style.marginLeft = '8px';
    starBtn.title = 'Bookmark';
    starBtn.addEventListener('click', e => { e.stopPropagation(); toggleStar(q.id, starBtn); });
    header.appendChild(starBtn);

    item.appendChild(header);
    item.appendChild(body);
    main.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
function showSummary() {
  showScreen('summary');
  const { score, wrong, history, pool } = State.quiz;
  const total = pool.length;
  const skipped = total - score - wrong;
  const pct = total ? Math.round((score / total) * 100) : 0;

  const main = $('summary-body');
  if (!main) return;

  const missed = history.filter(h => !h.isCorrect);

  main.innerHTML = `
    <div class="summary-score">
      <div class="big-num">${pct}%</div>
      <div class="big-label">${score} / ${total} correct</div>
    </div>
    <div class="summary-grid">
      <div class="summary-stat correct"><div class="num">${score}</div><div class="lbl">Correct</div></div>
      <div class="summary-stat wrong">  <div class="num">${wrong}</div><div class="lbl">Wrong</div></div>
      <div class="summary-stat skipped"><div class="num">${skipped}</div><div class="lbl">Skipped</div></div>
    </div>
    ${missed.length ? `
      <div class="missed-list">
        <h3>Questions to review (${missed.length})</h3>
        ${missed.map(h => `
          <div class="missed-item">
            <div class="q-text">${h.q.slice(0, 120)}${h.q.length > 120 ? '…' : ''}</div>
            <div class="q-answer">Correct: ${h.correct.map(i => {
              const q = QUESTIONS.find(qq => qq.id === h.id);
              return q ? q.options[i] : '';
            }).join(', ')}</div>
          </div>`).join('')}
      </div>` : ''}
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-primary"   onclick="startQuiz()">New Quiz</button>
      ${State.missed.size ? `<button class="btn btn-secondary" onclick="setFilter('missed');startQuiz()">Retry Missed (${State.missed.size})</button>` : ''}
      <button class="btn btn-ghost"     onclick="initHome()">Home</button>
    </div>`;
}

// ---------------------------------------------------------------------------
// Bookmarking
// ---------------------------------------------------------------------------
function toggleStar(id, btn) {
  if (State.starred.has(id)) {
    State.starred.delete(id);
    btn.classList.remove('starred');
    btn.textContent = '☆';
  } else {
    State.starred.add(id);
    btn.classList.add('starred');
    btn.textContent = '★';
  }
  persist();
  updateHeaderStats();
}

// ---------------------------------------------------------------------------
// Filter buttons
// ---------------------------------------------------------------------------
function setFilter(f) {
  State.filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === f);
  });
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (State.mode === 'quiz') {
    const optBtns = document.querySelectorAll('.option-btn:not(:disabled)');

    // A-D / A-F select options
    const letterIdx = 'ABCDEFGHIJ'.indexOf(e.key.toUpperCase());
    if (letterIdx >= 0 && letterIdx < optBtns.length) {
      optBtns[letterIdx].click();
      return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && !State.quiz.answered) {
      const sub = $('quiz-submit');
      if (sub && !sub.disabled) { sub.click(); return; }
    }

    if (e.key === 'ArrowRight') {
      const nextBtn = document.querySelector('.action-bar .btn-primary, .action-bar .btn-secondary');
      if (nextBtn && State.quiz.answered) { nextBtn.click(); return; }
    }
  }

  if (State.mode === 'flash') {
    if (e.key === ' ') {
      e.preventDefault();
      const area = document.querySelector('.flash-area');
      if (area) flipCard(area);
    }
    if (e.key === 'ArrowLeft'  && State.flash.flipped) markFlash(false);
    if (e.key === 'ArrowRight' && State.flash.flipped) markFlash(true);
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const m = tab.dataset.mode;
      if (m === 'quiz')  startQuiz();
      else if (m === 'flash') startFlash();
      else if (m === 'study') startStudy();
      else initHome();
    });
  });

  // Home mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const m = card.dataset.mode;
      if (m === 'quiz')  startQuiz();
      else if (m === 'flash') startFlash();
      else if (m === 'study') startStudy();
    });
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  updateHeaderStats();
  initHome();
}

document.addEventListener('DOMContentLoaded', boot);
