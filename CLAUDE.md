# Rebus - Development Guide

## What is this?

Rebus is a native desktop crossword puzzle solver built with Tauri v2 (Rust + React). It targets serious/competitive solvers and replicates the NYT crossword solving UX with customizable settings. Must work offline. Primary platform is macOS, Windows is secondary.

## Project Structure

```
rebus/
├── crates/xword-parser/    # Standalone Rust crate for parsing .puz, .ipuz, .jpz
├── src-tauri/               # Tauri app backend (thin layer over xword-parser)
│   └── src/
│       ├── main.rs          # Entry point, calls rebus_lib::run()
│       ├── lib.rs           # Tauri builder, plugin + command registration
│       └── commands.rs      # Tauri commands (open_puzzle, etc.)
├── src/                     # React frontend
│   ├── main.tsx             # React entry
│   ├── App.tsx              # Root component
│   └── styles/index.css     # Tailwind CSS entry
├── Cargo.toml               # Workspace root
├── package.json             # Frontend deps + scripts
└── PLAN.md                  # Full implementation plan with architecture details
```

## Build & Run

```bash
npm install               # Install frontend deps (first time only)
npm run tauri dev         # Launch app in dev mode (compiles Rust + starts Vite)
```

Note: First `tauri dev` build takes a few minutes to compile all Rust deps. Subsequent builds are fast (~2-3s).

## Testing

```bash
cargo test -p xword-parser   # Rust parser tests
npx vitest run               # Frontend tests
npm run test:coverage         # Frontend tests with coverage report + threshold enforcement
cargo test --workspace       # All Rust tests
```

### Testing Requirements

Every new feature or bug fix must include tests.

- **Stores**: All Zustand store actions must have unit tests. Test state transitions, edge cases (no puzzle loaded, black cells), and side effects. See `src/store/puzzleStore.test.ts` for patterns.
- **Hooks**: React hooks that manage side effects (timers, keyboard listeners) must have tests. Mock Tauri plugins with `vi.mock()`. See `src/hooks/useKeyboardNavigation.test.ts` for patterns.
- **Utils**: Pure utility functions must have thorough tests covering edge cases. See `src/utils/gridNavigation.test.ts` for patterns.
- **Rust crate**: Each parser and public function must have unit tests. Use `#[cfg(test)]` modules. See `crates/xword-parser/src/puz.rs` for patterns.
- **Mocking Tauri**: Always mock `@tauri-apps/plugin-log` and `@tauri-apps/plugin-fs` in test files that import code using these plugins. Use the `vi.mock()` + `await import()` pattern.

### Coverage Thresholds

Coverage thresholds are enforced via `vitest.config.ts` at **70% minimum** for statements, branches, functions, and lines. Run `npm run test:coverage` to verify. These thresholds should be raised over time as coverage improves — never lowered.

**Rust coverage:** Not yet enforced. When CI/CD is set up or the `xword-parser` crate grows significantly, add `cargo-llvm-cov` for Rust coverage measurement and threshold enforcement. The Tauri backend (`commands.rs`) is intentionally thin and lower priority for coverage.

## Linting & Formatting

Pre-commit hooks enforce formatting via husky + lint-staged. Run manually:

```bash
npm run lint              # ESLint
npm run format            # Prettier (write)
npm run format:check      # Prettier (check only)
cargo fmt                 # Rust format
cargo clippy --workspace  # Rust lint
```

## Tech Stack

- **Tauri v2** — Rust backend + system WebView frontend
- **React 19** + **TypeScript 5.8** + **Vite 7**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin, NOT PostCSS)
- **Zustand** + **immer** for state management
- **HTML5 Canvas** for grid rendering
- **Vitest** for frontend tests
- **ESLint 9** (flat config) + **Prettier**
- **husky** + **lint-staged** for pre-commit hooks

## Architecture

### Data Flow
```
File → xword-parser (Rust) → Puzzle JSON → Tauri IPC → Zustand store → Canvas render
                                                                       → Clue panel
User input → Keyboard handler → Zustand store → Canvas render
```

### Key Types
- `Puzzle`, `Cell`, `Clue` defined in `crates/xword-parser/src/types.rs` (Rust)
- These types must be mirrored in `src/types/puzzle.ts` (TypeScript) — keep them in sync
- All parsers (puz, ipuz, jpz) produce the same unified `Puzzle` type

### Tauri Commands
- `open_puzzle(file_path: String) → Puzzle` — dispatches to correct parser by file extension
- Commands are registered in `src-tauri/src/lib.rs`
- Commands should be thin — logic lives in `xword-parser` crate

### Grid Rendering
- HTML5 Canvas via `GridRenderer.ts` — a pure function, NOT a React component
- Subscribes directly to Zustand store, bypasses React rendering for performance
- Must handle HiDPI (multiply canvas dimensions by `devicePixelRatio`)

### State Management
- `puzzleStore.ts` — puzzle state, cursor position, direction, cell values (Zustand + immer)
- `settingsStore.ts` — user preferences, persisted to disk via Tauri fs plugin
- Navigation logic in `src/utils/gridNavigation.ts` — pure functions, well-tested

### xword-parser Crate
- Standalone, publishable to crates.io — no Tauri dependency
- Currently supports .puz, .ipuz, and .jpz  with full extension support (rebus, circles, timer)

## Conventions

- **Commit early and often** — make small, focused commits after each meaningful change
- **Do not push** to the Git remotes without explicit instructions to do so from the user.
- **Use latest stable versions** of all tools and frameworks
- **Write tests** — unit tests for Rust (`cargo test`), Vitest for frontend. Every new feature or bug fix must include tests. Run `npm run test:coverage` to verify coverage thresholds are met before committing.
- **Run linters before committing** — pre-commit hooks enforce this, but run manually too
- Rust: `cargo fmt` + `cargo clippy --workspace` must pass with no warnings
- TypeScript: ESLint flat config + Prettier, strict mode
- Keep Tauri commands thin — parsing logic lives in xword-parser crate
- Canvas rendering is a pure function, not a React component

## UX Requirements

All navigation behaviors are configurable via settings. See PLAN.md "Solver Settings" section for the full settings table with defaults.
