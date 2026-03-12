# Verification

## Package

- `npm run check` — TypeScript
- `npm run test` — Vitest (manager unit tests)
- `npm run build` — output in `dist/`

## Consumer app (e.g. Time Traders)

- `npm run check`, `npm run lint`, `npm run build`
- Manual QA:
  - Open settings from every entry point (menu button on run scene, menu background).
  - Change each control type (toggle, slider, select, segmented); confirm value and persistence after reload.
  - Restore defaults; confirm state.
  - Delete save (or equivalent); confirm modal closes and navigation to menu works.
  - ESC and click-outside close the modal; X closes the modal.
  - Narrow viewport: no horizontal clip; labels wrap.

## Lockfile

For local development use `"phaser-settings": "file:./packages/phaser-settings"` in the app; after publishing use the published version. Run `npm install` after changing the package.
