/* ============================================================
   ui.js — solver.html controller
   Wires the puzzle input boards, algorithm selection, run/playback
   controls and stats panels to the AStarEngine defined in astar.js.
   ============================================================ */

const CLASSIC_INITIAL = [2, 8, 3, 1, 6, 4, 7, 0, 5];
const CLASSIC_GOAL = [1, 2, 3, 8, 0, 4, 7, 6, 5];

const els = {
  boardInitialInput: document.getElementById('board-initial-input'),
  boardGoalInput: document.getElementById('board-goal-input'),
  btnRandom: document.getElementById('btn-random'),
  btnCheck: document.getElementById('btn-check'),
  btnResetBoards: document.getElementById('btn-reset-boards'),
  solvabilityStatus: document.getElementById('solvability-status'),

  btnSolve: document.getElementById('btn-solve'),

  boardViewInitial: document.getElementById('board-view-initial'),
  boardViewCurrent: document.getElementById('board-view-current'),
  boardViewGoal: document.getElementById('board-view-goal'),

  btnRun: document.getElementById('btn-run'),
  btnPause: document.getElementById('btn-pause'),
  btnResume: document.getElementById('btn-resume'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnResetRun: document.getElementById('btn-reset-run'),
  speed: document.getElementById('speed'),
  progressFill: document.getElementById('progress-fill'),
  stepReadout: document.getElementById('step-readout'),

  statGenerated: document.getElementById('stat-generated'),
  statExpanded: document.getElementById('stat-expanded'),
  statDepth: document.getElementById('stat-depth'),
  statG: document.getElementById('stat-g'),
  statH: document.getElementById('stat-h'),
  statF: document.getElementById('stat-f'),
  frontierList: document.getElementById('frontier-list'),
  exploredList: document.getElementById('explored-list'),

  summaryPanel: document.getElementById('summary-panel'),
  sumFound: document.getElementById('sum-found'),
  sumMoves: document.getElementById('sum-moves'),
  sumGenerated: document.getElementById('sum-generated'),
  sumExpanded: document.getElementById('sum-expanded'),
  sumDepth: document.getElementById('sum-depth'),
  sumTime: document.getElementById('sum-time'),
  sumCost: document.getElementById('sum-cost'),
  sumMem: document.getElementById('sum-mem'),
  pathStrip: document.getElementById('path-strip'),
};

const app = {
  goal: CLASSIC_GOAL.slice(),
  initial: CLASSIC_INITIAL.slice(),
  result: null,       // output of AStarEngine.runAStar
  stepIndex: -1,       // -1 = showing the initial state, else index into result.trace
  playing: false,
  timer: null,
  lastRenderedCurrent: null,
};

/* ---------- editable input boards ---------- */

function buildEditableBoard(container, arr) {
  container.innerHTML = '';
  arr.forEach((v, i) => {
    const cell = document.createElement('div');
    cell.className = 'tile';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 1;
    input.value = v === 0 ? '0' : String(v);
    input.dataset.index = i;
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-8]/g, '').slice(0, 1);
    });
    cell.appendChild(input);
    container.appendChild(cell);
  });
}

function readEditableBoard(container) {
  const inputs = [...container.querySelectorAll('input')];
  const vals = inputs.map(i => i.value.trim());
  if (vals.some(v => v === '' || isNaN(Number(v)))) return { error: 'Every cell needs a digit 0\u20138.' };
  const nums = vals.map(Number);
  const seen = new Set(nums);
  if (seen.size !== 9 || nums.some(n => n < 0 || n > 8)) {
    return { error: 'Board must contain each digit 0\u20138 exactly once (0 = blank).' };
  }
  return { state: nums };
}

buildEditableBoard(els.boardInitialInput, app.initial);
buildEditableBoard(els.boardGoalInput, app.goal);

/* ---------- static view boards ---------- */

function renderBoard(container, arr, opts = {}) {
  const { small = false, goal = null, highlightMoved = null } = opts;
  container.innerHTML = '';
  arr.forEach((v, i) => {
    const d = document.createElement('div');
    let cls = 'tile';
    if (v === 0) cls += ' blank';
    if (goal && v !== 0 && goal[i] === v) cls += ' correct';
    if (highlightMoved && highlightMoved.has(i)) cls += ' moved';
    d.className = cls;
    d.textContent = v === 0 ? '' : v;
    container.appendChild(d);
  });
}

function diffPositions(a, b) {
  if (!a) return null;
  const s = new Set();
  for (let i = 0; i < 9; i++) if (a[i] !== b[i]) s.add(i);
  return s;
}

renderBoard(els.boardViewInitial, app.initial, { small: true });
renderBoard(els.boardViewGoal, app.goal, { small: true });
renderBoard(els.boardViewCurrent, app.initial, { goal: app.goal });

/* ---------- status line helper ---------- */

function showStatus(el, text, ok) {
  el.textContent = text;
  el.classList.remove('ok', 'bad');
  el.classList.add('show', ok ? 'ok' : 'bad');
}

/* ---------- toolbar actions ---------- */

els.btnResetBoards.addEventListener('click', () => {
  buildEditableBoard(els.boardInitialInput, CLASSIC_INITIAL);
  buildEditableBoard(els.boardGoalInput, CLASSIC_GOAL);
  els.solvabilityStatus.classList.remove('show');
});

els.btnRandom.addEventListener('click', () => {
  const goalRead = readEditableBoard(els.boardGoalInput);
  if (goalRead.error) { showStatus(els.solvabilityStatus, goalRead.error, false); return; }
  const goal = goalRead.state;
  // Random-walk from the goal so the generated puzzle is guaranteed solvable.
  let state = goal.slice();
  let lastBlank = AStarEngine.findBlank(state);
  const steps = 60 + Math.floor(Math.random() * 40);
  for (let i = 0; i < steps; i++) {
    const opts = AStarEngine.neighbors(state);
    const choice = opts[Math.floor(Math.random() * opts.length)];
    state = choice.state;
  }
  buildEditableBoard(els.boardInitialInput, state);
  showStatus(els.solvabilityStatus, 'Random solvable puzzle generated from the current goal state.', true);
});

els.btnCheck.addEventListener('click', () => {
  const i = readEditableBoard(els.boardInitialInput);
  const g = readEditableBoard(els.boardGoalInput);
  if (i.error) { showStatus(els.solvabilityStatus, i.error, false); return; }
  if (g.error) { showStatus(els.solvabilityStatus, g.error, false); return; }
  const solvable = AStarEngine.isSolvable(i.state, g.state);
  showStatus(els.solvabilityStatus, solvable
    ? 'Solvable \u2014 a path from the initial state to the goal state exists.'
    : 'Not solvable \u2014 no sequence of legal slides reaches this goal from this initial state.',
    solvable);
});

/* ---------- solve ---------- */

els.btnSolve.addEventListener('click', () => {
  const i = readEditableBoard(els.boardInitialInput);
  const g = readEditableBoard(els.boardGoalInput);
  if (i.error) { showStatus(els.solvabilityStatus, i.error, false); els.solvabilityStatus.scrollIntoView({ behavior: 'smooth' }); return; }
  if (g.error) { showStatus(els.solvabilityStatus, g.error, false); els.solvabilityStatus.scrollIntoView({ behavior: 'smooth' }); return; }

  const solvable = AStarEngine.isSolvable(i.state, g.state);
  if (!solvable) {
    showStatus(els.solvabilityStatus, 'Not solvable \u2014 pick a different initial/goal pair or use "Generate Random Puzzle".', false);
    return;
  }

  app.initial = i.state;
  app.goal = g.state;
  const heuristicName = document.querySelector('input[name="heuristic"]:checked').value;

  stopPlayback();
  app.result = AStarEngine.runAStar(app.initial, app.goal, heuristicName);
  app.stepIndex = -1;
  app.lastRenderedCurrent = null;

  renderBoard(els.boardViewInitial, app.initial, { small: true });
  renderBoard(els.boardViewGoal, app.goal, { small: true });
  renderBoard(els.boardViewCurrent, app.initial, { goal: app.goal });
  els.summaryPanel.style.display = 'none';
  updateStepUI();
  els.boardViewCurrent.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* ---------- playback: Run / Pause / Resume / Next / Previous / Reset ---------- */

function speedDelayMs() {
  const v = Number(els.speed.value); // 1 (slow) .. 10 (fast)
  return 1050 - v * 95; // ~955ms down to ~100ms
}

function stopPlayback() {
  app.playing = false;
  if (app.timer) { clearInterval(app.timer); app.timer = null; }
}

function stepForward() {
  if (!app.result) return false;
  if (app.stepIndex >= app.result.trace.length - 1) { stopPlayback(); return false; }
  app.stepIndex++;
  updateStepUI();
  return true;
}

function stepBackward() {
  if (!app.result || app.stepIndex <= -1) return;
  app.stepIndex--;
  updateStepUI();
}

els.btnRun.addEventListener('click', () => {
  if (!app.result) return;
  stopPlayback();
  app.playing = true;
  app.timer = setInterval(() => {
    const moved = stepForward();
    if (!moved) stopPlayback();
  }, speedDelayMs());
});

els.btnPause.addEventListener('click', stopPlayback);

els.btnResume.addEventListener('click', () => {
  if (!app.result || app.playing) return;
  els.btnRun.click();
});

els.btnNext.addEventListener('click', () => { stopPlayback(); stepForward(); });
els.btnPrev.addEventListener('click', () => { stopPlayback(); stepBackward(); });

els.btnResetRun.addEventListener('click', () => {
  stopPlayback();
  app.stepIndex = -1;
  app.lastRenderedCurrent = null;
  renderBoard(els.boardViewCurrent, app.initial, { goal: app.goal });
  els.summaryPanel.style.display = 'none';
  updateStepUI();
});

els.speed.addEventListener('input', () => {
  if (app.playing) { els.btnRun.click(); } // restart interval at new speed
});

/* ---------- rendering the current step ---------- */

function updateStepUI() {
  const total = app.result ? app.result.trace.length : 0;
  els.stepReadout.textContent = `Step ${Math.max(app.stepIndex + 1, 0)} / ${total}`;
  els.progressFill.style.width = total ? `${Math.max(app.stepIndex + 1, 0) / total * 100}%` : '0%';

  els.btnNext.disabled = !app.result || app.stepIndex >= total - 1;
  els.btnPrev.disabled = !app.result || app.stepIndex <= -1;
  els.btnRun.disabled = !app.result;
  els.btnPause.disabled = !app.playing;
  els.btnResume.disabled = !app.result || app.playing;

  if (!app.result || app.stepIndex === -1) {
    renderBoard(els.boardViewCurrent, app.initial, { goal: app.goal });
    els.statGenerated.textContent = '\u2014';
    els.statExpanded.textContent = '\u2014';
    els.statDepth.textContent = '\u2014';
    els.statG.textContent = '\u2014';
    els.statH.textContent = '\u2014';
    els.statF.textContent = '\u2014';
    els.frontierList.innerHTML = '';
    els.exploredList.innerHTML = '';
    return;
  }

  const entry = app.result.trace[app.stepIndex];
  const moved = diffPositions(app.lastRenderedCurrent, entry.expanded.state);
  renderBoard(els.boardViewCurrent, entry.expanded.state, { goal: app.goal, highlightMoved: moved });
  app.lastRenderedCurrent = entry.expanded.state;

  // running totals up to this step
  els.statGenerated.textContent = countGeneratedThrough(app.stepIndex);
  els.statExpanded.textContent = app.stepIndex + 1;
  els.statDepth.textContent = entry.expanded.depth;
  els.statG.textContent = entry.expanded.g;
  els.statH.textContent = entry.expanded.h;
  els.statF.textContent = entry.expanded.f;

  els.frontierList.innerHTML = entry.frontierSample.map(n =>
    `<div class="row"><span>${n.state.join('')}</span><span>g=${n.g} h=${n.h} f=${n.f}</span></div>`
  ).join('') || '<div class="row">empty</div>';
  els.frontierList.insertAdjacentHTML('afterbegin',
    `<div class="row" style="border-bottom:1px solid var(--border); color:var(--text-faint);"><span>frontier size</span><span>${entry.frontierSize}</span></div>`);

  const recentExplored = app.result.trace.slice(Math.max(0, app.stepIndex - 6), app.stepIndex + 1).reverse();
  els.exploredList.innerHTML = recentExplored.map((e, idx) =>
    `<div class="row ${idx === 0 ? 'current' : ''}"><span>${e.expanded.state.join('')}</span><span>depth=${e.expanded.depth}</span></div>`
  ).join('') || '<div class="row">empty</div>';
  els.exploredList.insertAdjacentHTML('afterbegin',
    `<div class="row" style="border-bottom:1px solid var(--border); color:var(--text-faint);"><span>explored size</span><span>${entry.exploredSize}</span></div>`);

  if (app.stepIndex === app.result.trace.length - 1) {
    showSummary();
  }
}

function countGeneratedThrough(stepIdx) {
  // nodesGenerated is cumulative and only known as a final total in the engine;
  // approximate the running count using frontierSize + exploredSize at this step,
  // which is exact except for nodes that were later discarded as stale duplicates.
  const e = app.result.trace[stepIdx];
  return e.frontierSize + e.exploredSize;
}

function showSummary() {
  const r = app.result;
  els.summaryPanel.style.display = 'block';
  els.sumFound.textContent = r.found ? 'Solution Found' : 'Not Found';
  els.sumMoves.textContent = r.found ? r.moves : '\u2014';
  els.sumGenerated.textContent = r.nodesGenerated;
  els.sumExpanded.textContent = r.nodesExpanded;
  els.sumDepth.textContent = r.maxDepth;
  els.sumTime.textContent = `${r.executionTimeMs.toFixed(2)} ms`;
  els.sumCost.textContent = r.found ? r.pathCost : '\u2014';
  els.sumMem.textContent = `${r.memoryEstimateKB.toFixed(1)} KB`;

  els.pathStrip.innerHTML = '';
  if (r.found) {
    r.path.forEach((node, idx) => {
      const card = document.createElement('div');
      card.className = 'step-card' + (idx === r.path.length - 1 ? ' goal' : '');
      const b = document.createElement('div');
      b.className = 'board small';
      renderBoard(b, node.state, { goal: app.goal });
      card.appendChild(b);
      const label = document.createElement('div');
      label.className = 'idx';
      label.textContent = idx === 0 ? 'start' : `#${idx}${node.move ? ' \u00b7 ' + node.move : ''}`;
      card.appendChild(label);
      card.addEventListener('click', () => renderBoard(els.boardViewCurrent, node.state, { goal: app.goal }));
      els.pathStrip.appendChild(card);
    });
  }
}

updateStepUI();
