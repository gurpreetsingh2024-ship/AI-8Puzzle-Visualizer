/* ============================================================
   astar.js
   8-Puzzle state-space search core: solvability check, heuristics,
   and an A* implementation (from scratch, binary min-heap frontier)
   that records a full step-by-step trace for playback in the UI.

   A board state is a length-9 array, index = row*3+col, value 0..8,
   0 represents the blank tile. Goal state is user-supplied (not
   assumed fixed), so heuristics are computed against whatever goal
   was given.
   ============================================================ */

const MOVES = [
  { dr: -1, dc: 0, name: 'Up' },
  { dr: 1, dc: 0, name: 'Down' },
  { dr: 0, dc: -1, name: 'Left' },
  { dr: 0, dc: 1, name: 'Right' },
];

function key(state) { return state.join(''); }

function findBlank(state) { return state.indexOf(0); }

function neighbors(state) {
  const blank = findBlank(state);
  const r = Math.floor(blank / 3), c = blank % 3;
  const out = [];
  for (const m of MOVES) {
    const nr = r + m.dr, nc = c + m.dc;
    if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
    const ni = nr * 3 + nc;
    const next = state.slice();
    [next[blank], next[ni]] = [next[ni], next[blank]];
    out.push({ state: next, move: m.name });
  }
  return out;
}

/* ---------- solvability: exhaustive BFS from the goal ----------
   The 8-puzzle's reachable state space (fixing the goal as root) has
   at most 9!/2 = 181,440 states, so a full BFS from the goal over the
   legal-move graph is instant and gives an exact answer for ANY
   user-supplied goal permutation (no need to special-case parity). */
function reachableSetFrom(goal) {
  const seen = new Set([key(goal)]);
  const queue = [goal];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const { state } of neighbors(cur)) {
      const k = key(state);
      if (!seen.has(k)) { seen.add(k); queue.push(state); }
    }
  }
  return seen;
}

function isSolvable(initial, goal) {
  const set = reachableSetFrom(goal);
  return set.has(key(initial));
}

/* ---------- heuristics ---------- */

function misplacedTiles(state, goal) {
  let h = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] !== 0 && state[i] !== goal[i]) h++;
  }
  return h;
}

function manhattanDistance(state, goal) {
  const goalPos = new Array(9);
  for (let i = 0; i < 9; i++) goalPos[goal[i]] = i;
  let h = 0;
  for (let i = 0; i < 9; i++) {
    const v = state[i];
    if (v === 0) continue;
    const gi = goalPos[v];
    const r1 = Math.floor(i / 3), c1 = i % 3;
    const r2 = Math.floor(gi / 3), c2 = gi % 3;
    h += Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }
  return h;
}

function heuristic(name, state, goal) {
  return name === 'manhattan' ? manhattanDistance(state, goal) : misplacedTiles(state, goal);
}

/* ---------- binary min-heap keyed on f(n), tie-broken on h(n) ---------- */

class MinHeap {
  constructor() { this.arr = []; }
  size() { return this.arr.length; }
  push(node) {
    this.arr.push(node);
    let i = this.arr.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._less(this.arr[i], this.arr[p])) { [this.arr[i], this.arr[p]] = [this.arr[p], this.arr[i]]; i = p; }
      else break;
    }
  }
  pop() {
    const top = this.arr[0];
    const last = this.arr.pop();
    if (this.arr.length) {
      this.arr[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let smallest = i;
        if (l < this.arr.length && this._less(this.arr[l], this.arr[smallest])) smallest = l;
        if (r < this.arr.length && this._less(this.arr[r], this.arr[smallest])) smallest = r;
        if (smallest === i) break;
        [this.arr[i], this.arr[smallest]] = [this.arr[smallest], this.arr[i]];
        i = smallest;
      }
    }
    return top;
  }
  _less(a, b) { return a.f !== b.f ? a.f < b.f : a.h < b.h; }
}

/* ============================================================
   runAStar
   Runs A* to completion and returns:
   {
     found, path (array of states, initial..goal), moves,
     nodesGenerated, nodesExpanded, maxDepth, pathCost,
     executionTimeMs, memoryEstimateKB,
     trace: [ { step, expanded:{state,g,h,f,depth,parentKey},
                frontierSize, frontierSample, exploredSize } ... ]
   }
   The trace is a full step-by-step record of every expansion, meant
   for the UI to play back with Run/Pause/Step controls.
   ============================================================ */
function runAStar(initial, goal, heuristicName) {
  const t0 = performance.now();
  const startH = heuristic(heuristicName, initial, goal);
  const startNode = { state: initial, g: 0, h: startH, f: startH, depth: 0, parentKey: null, move: null };

  const open = new MinHeap();
  open.push(startNode);
  const openBest = new Map([[key(initial), startNode]]); // best g seen for a key currently in/near frontier
  const closed = new Map(); // key -> node (for path reconstruction + explored display)
  const cameFrom = new Map();

  let nodesGenerated = 1;
  let nodesExpanded = 0;
  let maxDepth = 0;
  const trace = [];
  let goalNode = null;

  while (open.size() > 0) {
    const current = open.pop();
    const ck = key(current.state);
    if (closed.has(ck)) continue; // stale heap entry
    closed.set(ck, current);
    cameFrom.set(ck, current);
    nodesExpanded++;
    maxDepth = Math.max(maxDepth, current.depth);

    const frontierSample = open.arr
      .slice()
      .sort((a, b) => (a.f - b.f) || (a.h - b.h))
      .slice(0, 8)
      .map(n => ({ state: n.state, g: n.g, h: n.h, f: n.f }));

    trace.push({
      step: trace.length,
      expanded: { state: current.state, g: current.g, h: current.h, f: current.f, depth: current.depth, parentKey: current.parentKey, move: current.move },
      frontierSize: open.size(),
      frontierSample,
      exploredSize: closed.size,
    });

    if (key(current.state) === key(goal)) { goalNode = current; break; }

    for (const { state: nextState, move } of neighbors(current.state)) {
      const nk = key(nextState);
      if (closed.has(nk)) continue;
      const g = current.g + 1;
      const existing = openBest.get(nk);
      if (existing && existing.g <= g) continue;
      const h = heuristic(heuristicName, nextState, goal);
      const node = { state: nextState, g, h, f: g + h, depth: current.depth + 1, parentKey: ck, move };
      openBest.set(nk, node);
      open.push(node);
      nodesGenerated++;
    }
  }

  const t1 = performance.now();

  if (!goalNode) {
    return {
      found: false, path: [], moves: 0, nodesGenerated, nodesExpanded, maxDepth,
      pathCost: null, executionTimeMs: t1 - t0,
      memoryEstimateKB: estimateMemoryKB(nodesGenerated), trace,
    };
  }

  // reconstruct path by walking parentKey chain via `closed`
  const path = [];
  let node = goalNode;
  while (node) {
    path.unshift({ state: node.state, g: node.g, h: node.h, f: node.f, move: node.move });
    node = node.parentKey ? closed.get(node.parentKey) : null;
  }

  return {
    found: true,
    path,
    moves: path.length - 1,
    nodesGenerated,
    nodesExpanded,
    maxDepth,
    pathCost: goalNode.g,
    executionTimeMs: t1 - t0,
    memoryEstimateKB: estimateMemoryKB(nodesGenerated),
    trace,
  };
}

// Rough approximation: each node ~ (9 ints for state + g/h/f/depth/refs) ~ 96 bytes
function estimateMemoryKB(nodeCount) {
  return (nodeCount * 96) / 1024;
}

const AStarEngine = {
  key, findBlank, neighbors, isSolvable, reachableSetFrom,
  misplacedTiles, manhattanDistance, heuristic, runAStar,
};

if (typeof module !== 'undefined') module.exports = AStarEngine;
