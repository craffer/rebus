# Rebus - Development Guide

## What is this?

Rebus is a native desktop crossword puzzle solver built with Tauri v2 (Rust + React). It targets serious/competitive solvers and replicates the NYT crossword UX with customizable settings.

## Project Structure

- `crates/crossword-parser/` — Standalone Rust crate for parsing .puz, .ipuz, .jpz files
- `src-tauri/` — Tauri app backend (thin layer over crossword-parser)
- `src/` — React frontend (TypeScript, Tailwind CSS v4, Zustand)

## Build & Run

```bash
npm install               # Install frontend deps
npm run tauri dev         # Launch app in dev mode (compiles Rust + starts Vite)
```

## Testing

```bash
cargo test -p crossword-parser   # Rust parser tests
npx vitest run                   # Frontend tests
```

## Linting & Formatting

Pre-commit hooks enforce formatting via husky + lint-staged:

```bash
npm run lint              # ESLint check
npm run format            # Prettier format
npm run format:check      # Prettier check
cargo fmt                 # Rust format
cargo clippy              # Rust lint
```

## Architecture

### Data Flow
```
File → crossword-parser (Rust) → Puzzle JSON → Tauri IPC → Zustand store → Canvas render
```

### Key Types
- `Puzzle`, `Cell`, `Clue` defined in `crates/crossword-parser/src/types.rs` (Rust) and mirrored in `src/types/puzzle.ts` (TypeScript)
- All parsers produce the same `Puzzle` type regardless of input format

### Tauri Commands
- `open_puzzle(file_path: String) → Puzzle` — dispatches to correct parser by file extension

### Grid Rendering
- HTML5 Canvas via `GridRenderer.ts` (pure function, no React)
- Subscribes directly to Zustand store, bypasses React rendering for performance

### State Management
- `puzzleStore.ts` — puzzle state, cursor, direction (Zustand + immer)
- `settingsStore.ts` — user preferences, persisted to disk
- Navigation logic in `src/utils/gridNavigation.ts`

## Conventions
- Rust: use `cargo fmt` + `clippy`, edition 2021
- TypeScript: ESLint flat config + Prettier, strict mode
- Keep Tauri commands thin — parsing logic lives in crossword-parser crate
- Canvas rendering is a pure function, not a React component
