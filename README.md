# AI-8Puzzle-Visualizer

Interactive 8-Puzzle Problem Solver built for the **Artificial Intelligence** Digital Assignment
(Case Study) &mdash; individual algorithm assigned: **A\* Search**.

## Project Description

A browser-based visualizer for the classic 8-puzzle sliding-tile problem. The user enters (or
randomly generates) an initial and goal state, runs A\* search from scratch, and steps through the
frontier/explored-set expansion one node at a time while live statistics (g, h, f, depth, frontier,
explored) update. On completion it shows a full solution summary and the reconstructed move-by-move
solution path.

## Technologies Used

- HTML5, CSS3 (custom design system, no CSS framework)
- Vanilla JavaScript (ES6) &mdash; no build step, no dependencies
- Google Fonts: Space Grotesk, Inter, JetBrains Mono

## Search Algorithm Implemented

- **A\* Search**, implemented from scratch with a binary min-heap priority queue frontier
  (`js/astar.js`), including path reconstruction via parent pointers and full step-trace recording
  for UI playback.

## Heuristics Used

- **Misplaced Tiles** &mdash; count of tiles not in their goal position (blank excluded).
- **Manhattan Distance** &mdash; sum of row + column distance of every tile from its goal position.

Both are admissible for the 8-puzzle's unit step cost, so A\* returns an optimal (shortest) solution
with either.

## Puzzle Solvability

Rather than relying on the standard fixed-goal parity trick, solvability is checked by an exhaustive
BFS over the legal-move graph starting from the **user-supplied goal state** (at most 9!/2 = 181,440
reachable states, computed instantly in-browser). This makes the check exact for any custom goal
state, not just the classic `1 2 3 / 8 _ 4 / 7 6 5` goal.

## Project Structure

```
AI-8Puzzle-Visualizer/
├── index.html        # Home page (course/assignment/student details, intro)
├── solver.html        # Puzzle input, A* solver, live search visualization
├── info.html           # A* description, working principle, complexity, etc.
├── css/style.css      # Design system + all page styles
├── js/astar.js         # A* engine: solvability BFS, heuristics, search, trace
├── js/ui.js             # Solver page controller (input, playback, stats)
├── assets/, images/  # Reserved for screenshots / static assets
├── docs/                  # Reserved for GitHub Pages, if deployed from /docs
└── README.md
```

## How to Run the Project

**Locally:** clone the repository and open `index.html` in any modern browser &mdash; there is no
build step or server required.

```bash
git clone https://github.com/<username>/AI-8Puzzle-Visualizer.git
cd AI-8Puzzle-Visualizer
open index.html   # or double-click the file / use a "Live Server" extension
```

**Via GitHub Pages:** enable Pages on this repository (Settings &rarr; Pages &rarr; deploy from
`main` / root), then visit:

```
https://<username>.github.io/AI-8Puzzle-Visualizer/
```

## Student Details

- **Name:** Gurpreet
- **Registration No.:** 24BCT0292
- **Course:** Artificial Intelligence
- **Assigned Algorithm:** A\* Search (Algorithm 7)

## References

- Russell, S. & Norvig, P., *Artificial Intelligence: A Modern Approach* &mdash; A\* search and
  admissible heuristics for the 8-puzzle.
- Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). *A Formal Basis for the Heuristic Determination
  of Minimum Cost Paths.* IEEE Transactions on Systems Science and Cybernetics.
- Google Fonts: Space Grotesk, Inter, JetBrains Mono.

## Screenshots

_Add screenshots of the Home, Solver, and Algorithm Info pages here before submission._

## Live Demo

- GitHub Repository: `<add link before submission>`
- GitHub Pages: `<add link before submission>`
