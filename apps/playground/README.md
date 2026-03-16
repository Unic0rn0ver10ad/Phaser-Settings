# Phaser Settings Playground

Local-only app to manually test **phaser-settings** in a full Phaser + React + Vite environment. Focus: UI controls and touch interactions (scroll, tap vs drag, sliders, toggles).

**This app is not published.** The root package uses `files` allowlisting; `verify:pack` ensures no playground files appear in the npm tarball.

## Commands (from repo root)

- **`npm run dev:playground`** — Build the library, install deps, start the Vite dev server (port 5174).
- **`npm run build:playground`** — Build library and playground for production.
- **`npm run test:playground`** — Run playground unit tests.

From this directory you can also run `npm run dev`, `npm run build`, `npm run test` after installing once (`npm install` at root runs install here via `dev:playground`).

## Usage

1. From repo root: `npm run dev:playground`.
2. Open http://localhost:5174.
3. Click the **hamburger menu** (top-left of the game area) to open the settings modal; change sliders, toggles, segmented controls, and the language dropdown.
4. Use the **right-hand panel** to see live values from `SettingsManager`.
5. Test touch: drag the settings list to scroll; tap controls to change values.

Settings are persisted in `localStorage` under `phaser-settings-playground`.
