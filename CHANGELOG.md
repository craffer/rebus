# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added

- `.puz`, `.ipuz`, and `.jpz` puzzle file format support via standalone `xword-parser` Rust crate
  - Full extension support: rebus (multi-letter cells), circles, and timer (GRBS/RTBL/GEXT/LTIM sections)
  - `.puz`: Across Lite binary format with CRC-16 validation and UTF-8/ISO-8859-1 fallback encoding
  - `.ipuz`: JSON-based open standard parsed via `serde_json`
  - `.jpz`: ZIP-compressed XML format parsed via `quick-xml`
- Canvas grid rendering with HiDPI (devicePixelRatio) support for pixel-perfect display on Retina screens
- Full keyboard navigation with 8 configurable navigation settings:
  - Arrow key behavior (stay in cell vs. move in direction)
  - Spacebar behavior (clear & advance vs. toggle direction)
  - End-of-word action (stop / jump to first blank / jump to next clue)
  - Backspace into previous word
  - Skip filled cells (all filled / ink only / off)
  - Skip filled clues on Tab (all filled / ink only / off)
  - Scroll clue to top on selection
  - Shift key activates pencil mode
- Clue panel with Across/Down columns, auto-scroll to active clue, and click-to-navigate
- Settings panel (Cmd+,) with persistence to disk via Tauri fs plugin, including 500ms debounce auto-save
- Dark/light/system theme support via Tailwind CSS dark mode and `useIsDarkMode` hook
- Check and reveal actions per-cell, per-word, and full-puzzle (requires puzzle to have a solution)
- Pencil mode for tentative letter entries (Shift key or toggle button in toolbar)
- Rebus entry mode for multi-letter cells (Escape to activate, Enter to confirm, Escape again to cancel)
- Puzzle library with card-based grid layout showing title, author, size, time, and completion percentage
  - Status indicators: Not Started / In Progress / Completed
  - Folder organization with drag-and-drop puzzle reordering between folders
  - Sort by date opened, title, or status (ascending/descending)
  - Filter by status: All / In Progress / Not Started / Completed
  - Context menu per card: rename, move to folder, remove from library
- Save and resume puzzle progress automatically (auto-save with debounce, restored on reopen via file hash)
- Completion animation with CSS confetti overlay and Web Audio chime sound
- Timer with pause/resume (click to toggle); timer pauses automatically when settings panel opens
- Custom keybindings configuration for navigation actions: move directions, next/previous clue, rebus mode, pencil mode, pause, spacebar, backspace, delete
- Native file picker (Cmd+O) filtered to `.puz`/`.ipuz`/`.jpz` files via Tauri dialog plugin
- CI/CD pipeline with GitHub Actions for automated multi-platform builds (macOS, Windows)
- Welcome/library screen shown when no puzzle is loaded; replaces itself with the solver UI on open
- Pause overlay that redacts clue text (shows clue numbers as gray bars) and blocks all keyboard input
- Auto-check mode setting: checks each letter as you type and marks incorrect squares
- Custom smooth clue-list scroll animation (200ms ease-in-out cubic, matching NYT feel)
- Completed clues shown in gray in the clue panel, even when highlighted as cross-clue
- Primary vs. cross-clue visual distinction (primary: blue-100 background, cross: blue-50 background)
- "Incorrect" notice dialog shown when check/puzzle finds errors, with timer pause during display
- Reset puzzle action available in toolbar and pause overlay

### Changed

- Transparent title bar style for native macOS dark mode integration (system chrome respects dark/light mode)
- Better app icon: custom crossword grid SVG icon with multi-resolution export (32×32, 128×128, 128×128@2x, .icns, .ico)
