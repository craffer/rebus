<h1 align="center">
  <br>
  <img src="src-tauri/icons/128x128@2x.png" alt="Rebus icon" width="128" height="128">
  <br>
  Rebus
  <br>
</h1>

A native desktop crossword puzzle solver. Opens `.puz` files and provides a smooth, speedy solving experience, with configurable navigation, dark mode, and more.

Built with Tauri v2 (Rust backend + system webview), React 19, TypeScript, and HTML5 Canvas for grid rendering.

This is a work-in-progress; eventually, you'll be able to download this as an app and solve away! For now, I've added instructions for devs below.

## Getting started

To run locally:

```bash
npm install
npm run tauri dev
```

## Testing

Run the test suite:

```bash
cargo test --workspace    # Rust tests
npx vitest run            # Frontend tests
```

## Project structure

- `crates/xword-parser/` — Standalone Rust crate for parsing `.puz` files
- `src-tauri/` — Tauri app backend (thin wrapper over xword-parser)
- `src/` — React frontend (Zustand state, Canvas renderer, Tailwind CSS)
