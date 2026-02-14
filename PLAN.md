# Rebus - Crossword Puzzle Solver App

## Context

Build a native desktop crossword puzzle solving application from scratch. The goal is to replicate the NYTimes crossword solving experience but for puzzles from any source. Target audience is serious/competitive solvers who care about speed and keyboard-driven interaction. Must work offline.

## Technology Stack

- **Framework**: Tauri v2 (Rust backend + web frontend)
  - ~30MB memory, <500ms startup, 3-10MB bundle (vs Electron's 200MB+ / 100MB+)
  - Uses system WebView for native feel
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Grid Rendering**: HTML5 Canvas (pixel-perfect control, ~1ms repaints)
- **State Management**: Zustand + immer middleware
- **Rust deps**: `serde`, `byteorder`, `thiserror`, `encoding_rs`, `tauri-plugin-dialog`, `tauri-plugin-fs`
- **Testing**: Vitest (frontend), `cargo test` (Rust), with test fixtures of real .puz/.ipuz/.jpz files
- **Linting/Formatting**: ESLint + Prettier (frontend), `rustfmt` + `clippy` (Rust), enforced via pre-commit hooks

## Architecture

### Rust Backend

#### `xword-parser` — Standalone Rust Crate (`crates/xword-parser/`)
A reusable library crate, separate from the Tauri app, so it can be published to crates.io or used in other contexts (CLI tools, WASM, etc.).

- **Unified `Puzzle` type**: All parsers produce the same output struct regardless of input format
- **.puz parser** (Across Lite binary format — de facto industry standard)
  - Header validation (magic string `ACROSS&DOWN\0`, CRC-16 checksums)
  - Grid parsing (solution + player state)
  - String extraction (title, author, copyright, clues, notes)
  - Extension sections: GRBS/RTBL (rebus), GEXT (circles/flags), LTIM (timer)
  - Encoding: try UTF-8, fall back to ISO-8859-1/Windows-1252 via `encoding_rs`
- **.ipuz parser** (JSON-based open standard — growing adoption)
  - Parse via `serde_json`, map to unified `Puzzle` type
- **.jpz parser** (XML-based — flexible, used by some publishers)
  - Parse via `quick-xml`, map to unified `Puzzle` type
- **Clue numbering algorithm**: Scan L-to-R, T-to-B, assign numbers at word starts
- **Thorough unit tests**: Test against real puzzle files for each format, round-trip fidelity

#### Tauri App (`src-tauri/`)
- Depends on `xword-parser` as a path dependency
- **Tauri commands**: `open_puzzle(file_path)` dispatches to the right parser by extension, returns `Puzzle` JSON
- Thin layer — parsing logic lives in the crate, not here

### React Frontend (`src/`)
- **Canvas grid** (`GridRenderer.ts`): Pure function, draws entire grid in one paint call. Subscribes directly to Zustand (bypasses React rendering).
- **Clue panel** (`CluePanel/`): Two scrollable lists (Across/Down), auto-scrolls to active clue
- **Keyboard handler** (`useKeyboardNavigation.ts`): All navigation behavior driven by settings store
- **Zustand stores**: `puzzleStore.ts` (grid state, cursor, direction), `settingsStore.ts` (persisted preferences)

### Data Flow
```
File → Rust parser (xword-parser crate) → Puzzle JSON → Tauri IPC → Zustand store → Canvas render
                                                                                       → Clue panel
User input → Keyboard handler → Zustand store → Canvas render (re-subscribes)
```

### Directory Structure
```
rebus/
├── crates/
│   └── xword-parser/          # Standalone Rust crate
│       ├── src/
│       │   ├── lib.rs             # Public API: parse(bytes, format) → Puzzle
│       │   ├── types.rs           # Puzzle, Cell, Clue, CellKind structs
│       │   ├── puz.rs             # .puz binary parser
│       │   ├── ipuz.rs            # .ipuz JSON parser
│       │   ├── jpz.rs             # .jpz XML parser
│       │   └── error.rs           # Error types
│       ├── tests/
│       │   ├── fixtures/          # Real .puz, .ipuz, .jpz test files
│       │   └── parser_tests.rs    # Integration tests
│       └── Cargo.toml
├── src-tauri/                     # Tauri app backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs                 # Tauri builder, plugin + command registration
│   │   └── commands.rs            # open_puzzle, check, reveal commands
│   └── Cargo.toml                 # depends on xword-parser via path
├── src/                           # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Grid/
│   │   │   ├── Grid.tsx           # Canvas setup, mouse handling, Zustand subscription
│   │   │   ├── GridRenderer.ts    # Pure canvas drawing (no React)
│   │   │   └── constants.ts       # Cell size, colors, fonts
│   │   ├── CluePanel/
│   │   │   ├── CluePanel.tsx
│   │   │   ├── ClueList.tsx
│   │   │   └── ClueItem.tsx
│   │   ├── Toolbar.tsx
│   │   ├── Timer.tsx
│   │   └── WelcomeScreen.tsx
│   ├── hooks/
│   │   ├── useKeyboardNavigation.ts
│   │   ├── usePuzzleLoader.ts
│   │   └── useTimer.ts
│   ├── store/
│   │   ├── puzzleStore.ts
│   │   ├── settingsStore.ts
│   │   └── selectors.ts
│   ├── types/
│   │   ├── puzzle.ts              # Mirrors Rust Puzzle types
│   │   └── settings.ts
│   ├── utils/
│   │   └── gridNavigation.ts      # Next cell, word boundaries, etc.
│   └── styles/
│       └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js               # ESLint flat config
├── .prettierrc
├── .pre-commit-config.yaml        # Pre-commit hooks
├── Cargo.toml                     # Workspace root
└── CLAUDE.md
```

## Layout
```
+--------------------------------------------------+
| Toolbar: Open | Timer | Check | Reveal | Rebus    |
+-------------------+------------------------------+
|                   |  Across Clues                |
|   Canvas Grid     |  1. First clue...            |
|   (60% width,     |  5. Another...               |
|    square,         |------------------------------+
|    centered)      |  Down Clues                  |
|                   |  1. First down...            |
+-------------------+------------------------------+
```

## Solver Settings (Customizable)

All settings persisted to disk via Tauri fs plugin. Stored as JSON in the app's data directory.

### Navigation Settings
| Setting | Default | NYT Default | Options |
|---------|---------|-------------|---------|
| After changing direction with arrow keys | Stay in same square | Same | Stay in same square / Move in direction of arrow |
| Spacebar behavior | Clear current square and advance | Same | Clear and advance / Toggle Across/Down |
| Backspace into previous word | Off | Off | On / Off |
| Skip over filled squares (within word) | On | On | On / Off |
| Skip penciled-in squares too | On | On | On / Off (only relevant if skip filled is on) |
| At end of word: jump back to first blank | Off | Off | On / Off |
| At end of word: jump to next clue | Off | Off | On / Off (only if not jumping back) |

### Feedback Settings
| Setting | Default | Options |
|---------|---------|---------|
| Play sound on solve | On | On / Off |
| Show timer | On | On / Off |
| Show puzzle milestones | On | On / Off |
| Suppress disqualification warnings | Off | On / Off |

### Rebus-Only Settings (Beyond NYT)
| Setting | Default | Options |
|---------|---------|---------|
| Custom key bindings | System defaults | User-configurable map |
| Auto-check on completion | Off | Off / Check / Reveal |
| Grid scale | Auto-fit | 50%-200% slider |
| Clue font size | Medium | Small / Medium / Large |
| Highlight style | Blue (NYT-style) | Blue / Yellow / Green / Custom color |
| Show incorrect count in toolbar | Off | On / Off |
| Timer counts | Up | Up / Down (for timed practice) |

Settings file: `src/store/settingsStore.ts` (Zustand, persisted via Tauri fs plugin)
Settings types: `src/types/settings.ts`
Settings UI: `src/components/SettingsPanel.tsx` (Phase 2, settings work via defaults in Phase 1)

### How Settings Affect Navigation Code
The `useKeyboardNavigation` hook and `gridNavigation.ts` utilities read from `settingsStore` to determine behavior:
- `spacebar_behavior` controls whether Space clears+advances or toggles direction
- `skip_filled` and `skip_penciled` affect `getNextCell()` logic
- `arrow_key_behavior` controls whether arrow keys that change direction also move the cursor
- `backspace_into_previous_word` controls Backspace behavior at word boundaries
- `end_of_word_action` controls what happens after filling the last cell of a word

## Phase 1: Working Prototype

### Step 0: Repo Setup & Tooling ✅
- [x] Initialize git repo
- [x] Ensure latest stable Rust (`rustup update stable`) and Node.js (v22 LTS)
- [x] Scaffold Tauri v2 + React + TypeScript project
- [x] Set up Cargo workspace with `xword-parser` crate
- [x] Install all deps (frontend + Rust + Tauri plugins)
- [x] Configure ESLint (flat config) + Prettier for TypeScript/React
- [x] Configure `rustfmt` + `clippy` for Rust
- [x] Set up pre-commit hooks (via `pre-commit` or `husky` + `lint-staged`):
  - [x] `prettier --check` + `eslint` on staged .ts/.tsx files
  - [x] `cargo fmt --check` + `cargo clippy` on staged .rs files
- [x] Verify `npm run tauri dev` launches an empty window
- [x] **Commit plan as `PLAN.md` and create `CLAUDE.md`**

### Step 1: Crossword Parser Crate ✅
- [x] Files: `crates/xword-parser/src/{lib,types,puz,error}.rs`
- [x] Implement `Puzzle`, `Cell`, `Clue` structs with serde
- [x] Implement .puz binary parser with full extension support (rebus, circles, timer)
- [x] Implement clue numbering algorithm
- [x] Unit tests against real .puz fixture files
- [x] Wire up in `src-tauri/` — register `open_puzzle` Tauri command

### Step 2: Canvas Grid Rendering ✅
- [x] Files: `src/components/Grid/GridRenderer.ts`, `Grid.tsx`, `constants.ts`
- [x] Pure canvas drawing: black cells, borders, numbers, letters, highlights
- [x] HiDPI support (devicePixelRatio scaling)
- [x] Mouse click → grid coordinates → store update
- [x] Current cell (yellow) and current word (light blue) highlighting

### Step 3: State Management ✅
- [x] Files: `src/store/puzzleStore.ts`, `src/store/selectors.ts`, `src/utils/gridNavigation.ts`
- [x] Puzzle state, cursor, direction, cell values
- [x] Selectors: current clue, highlighted cells, completion check
- [x] Navigation utilities (next cell, word boundaries, wrapping)

### Step 4: Clue Panel ✅
- [x] Files: `src/components/CluePanel/CluePanel.tsx`, `ClueList.tsx`, `ClueItem.tsx`
- [x] Two-column Across/Down layout
- [x] Auto-scroll to active clue
- [x] Click clue → navigate to word

### Step 5: Keyboard Navigation + Settings ✅
- [x] Files: `src/hooks/useKeyboardNavigation.ts`, `src/store/settingsStore.ts`, `src/types/settings.ts`
- [x] Define all settings types and defaults (matching NYT defaults from table above)
- [x] Settings store with persistence (read/write JSON to Tauri app data dir)
- [x] All navigation behavior reads from settings store
- [x] Unit tests for navigation logic (`gridNavigation.ts`) — 24 tests passing

### Step 6: File Opening Flow ✅
- [x] Cmd+O → native file picker (Tauri dialog plugin, filtered to .puz/.ipuz/.jpz)
- [x] Invoke `open_puzzle` → populate store → render
- [x] Welcome screen when no puzzle loaded

### Step 7: Polish ✅
- [x] Timer display
- [x] Window title = puzzle title
- [x] Toolbar with metadata (title, author)
- [x] Clean theme: white grid, blue highlights, system fonts
- [x] Responsive canvas sizing (fit to available space)

### Step 7.5: NYT Parity Features ✅
- [x] Completed clues grayed out in clue panel (`isClueComplete` selector in `puzzleStore.ts`)
- [x] Primary vs cross clue visual distinction (primary: `bg-blue-100`, cross: `bg-blue-50`)
- [x] Completed clues stay grayed even when highlighted
- [x] Enter key advances to next clue (same as Tab without Shift)
- [x] Clue list auto-scrolls selected clue to top (configurable via `scroll_clue_to_top` setting)
- [x] Custom smooth scroll animation (400ms ease-in-out cubic, NYT-like feel)
- [x] Pause overlay covers grid with "Paused" + Resume button (`bg-white/95`)
- [x] Keyboard input blocked when paused
- [x] Redacted clue list during pause (clue numbers visible, text replaced with gray bars)
- [x] Tests: 10 new tests in `puzzleStore.test.ts` (isClueComplete + pause behavior)

### Step 8: Add .ipuz, .jpz, and .xml Parsers
- Files: `crates/xword-parser/src/ipuz.rs`, `crates/xword-parser/src/jpz.rs`
- [ ] .ipuz parser (JSON format, uses `serde_json`)
- [ ] .jpz parser (ZIP-compressed XML, uses `quick-xml` + `zip`)
- [ ] .xml parser (raw Crossword Compiler XML, shares jpz parser)
- [ ] Unit tests with real PuzzleMe fixture files
- [x] `open_puzzle` command already dispatches by extension

## Phase 2
- [x] Settings persistence to disk (Tauri fs plugin, auto-save with 500ms debounce)
- [x] Dark mode (light/dark/system, canvas + Tailwind, `useIsDarkMode` hook)
- [x] Completion animation + sound (CSS confetti overlay, Web Audio chime)
- [x] Settings UI panel (modal with gear icon, Cmd+,, Toggle/Select components)
- [x] Check/reveal (per-cell, per-word, full puzzle)
- [x] Pencil mode, rebus mode UI
- [x] Save/resume progress to disk
- [ ] Recent files / Puzzle Library (see design below)
- [ ] Custom key bindings UI
- [ ] Countdown timer mode (for timed practice)
- [ ] Puzzle statistics tracking (solve times, streaks)
- [ ] Better app icon

### Recent Files / Puzzle Library (Design)
A rich UI for accessing previously opened puzzles, replacing the basic welcome screen:
- **Card-based grid** in welcome screen showing all opened puzzles
- Each card displays: title, author, date opened, completion %, grid size
- **Status indicators**: Not Started / In Progress / Completed (with visual badges)
- **Filter/sort** by date, status, source
- Backed by `recent-files.json` persisted in AppData alongside settings
- "Remove from list" context menu on each card
- Auto-populated when any puzzle is opened via the file picker
- Clicking a card reopens the puzzle with saved progress
- Data model: `{ filePath, puzzleId, title, author, dateOpened, completionPercent, isSolved, width, height }`

## Verification
1. `cargo test -p xword-parser` — all parser tests pass
2. `npx vitest run` — all frontend tests pass
3. Pre-commit hooks pass: `cargo fmt`, `clippy`, `eslint`, `prettier`
4. `npm run tauri dev` — app launches with welcome screen
5. Open a .puz file via Cmd+O — grid renders correctly with numbers and black cells
6. Click cells — cursor moves, direction toggles on same-cell click
7. Type letters — they appear in cells, cursor auto-advances
8. Arrow keys, Tab, Backspace all behave per settings defaults
9. Clue panel highlights current clue and auto-scrolls
10. Complete a puzzle — all cells filled correctly
11. Test with multiple .puz files including rebus puzzles and Sunday-size (21x21)
12. Open .ipuz and .jpz files — same behavior as .puz
