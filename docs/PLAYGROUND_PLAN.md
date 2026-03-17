# Local Phaser Settings Playground Plan

## Goal
Create a **local-only** playground app in this same repository to manually test `phaser-settings` behavior (especially touch controls) in a full Phaser + React + Vite environment, while guaranteeing this playground never ships in the published npm package.

## Decisions Captured
- **Repo location:** same repository.
- **Integration style:** import package the same way consumers do.
- **UI style:** Phaser app + React controls panel (no preset save/load).
- **Primary validation target:** UI controls with focus on touch interactions.
- **Tooling:** Vite + React + TypeScript.
- **Scope:** local dev only.
- **Quality gate:** basic unit tests only for now.
- **Developer UX:** one-command startup (`npm run dev:playground`).

## Non-shipping Strategy (Hard Guarantee)
This package already uses npm `files` allowlisting (`dist`, `README.md`, `docs`), which means `apps/playground` will not be published by default.

To make this explicit and safer:
1. Keep playground code under `apps/playground/`.
2. Keep package publishing rooted in this library package (`npm publish` from repo root).
3. Add a verification script to check package contents via `npm pack --dry-run` and fail if any `apps/playground` files appear.

## Proposed Repository Layout

```txt
/
  src/                       # existing library source
  apps/
    playground/
      index.html
      package.json
      tsconfig.json
      vite.config.ts
      src/
        main.tsx
        App.tsx
        phaser/
          gameConfig.ts
          scenes/
            PlaygroundScene.ts
        controls/
          ControlsPanel.tsx
        settings/
          testSettingsConfig.ts
      test/
        settings-config.test.ts
```

## Implementation Plan

### Phase 1 — Scaffold local playground app
1. Create `apps/playground` as a standalone Vite React + TS app.
2. Configure it to run with `npm run dev:playground` from the repo root.
3. Keep dependencies local to playground (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`).

### Phase 2 — Consumer-like package integration
1. Build the root package first (`npm run build`) so `dist/` exists.
2. In playground, consume `phaser-settings` exactly like external apps:
   - via package name in `package.json` using local file reference (example: `"phaser-settings": "file:../.."`),
   - import from `'phaser-settings'` in playground code.
3. Add a root helper script to build library + start playground in one flow.

### Phase 3 — WYSIWYG testing surface
1. Add a Phaser scene that renders touch-friendly UI targets and a visible state overlay.
2. Add a React controls panel beside or over the canvas for changing live settings values.
3. Wire controls through the settings manager so updates are reflected in both UI and scene behavior.
4. Include at least these touch-focused scenarios:
   - tap/drag sensitivity settings,
   - virtual joystick or directional touch zones,
   - button size/spacing/opacity settings,
   - dead-zone / threshold settings.

### Phase 4 — Unit test baseline
1. Add basic unit tests for the playground settings config (shape/defaults/validation expectations).
2. Keep tests lightweight and deterministic (no browser automation yet).

### Phase 5 — Publish-safety checks
1. Add `npm run verify:pack` at root:
   - executes `npm pack --dry-run`,
   - parses output,
   - fails if files under `apps/playground` are included.
2. Run `verify:pack` before actual publish as a local checklist step.

## Root Scripts to Add
At repo root:
- `dev:playground`: run the playground dev server (one-command startup target).
- `build:playground`: build library then playground build (optional local confidence check).
- `test:playground`: run playground unit tests only.
- `verify:pack`: assert publish payload excludes playground files.

## Acceptance Criteria
1. `npm run dev:playground` starts a React + Phaser playground locally.
2. Playground imports from `'phaser-settings'` (consumer-style), not internal `src/*` paths.
3. Touch-related controls can be changed live and observed immediately in-scene.
4. Basic playground unit tests pass.
5. `npm run verify:pack` confirms no `apps/playground` content appears in publish payload.

## Rollout Order
1. Scaffold app + scripts.
2. Connect package import path and verify local run.
3. Implement touch-focused controls and scene wiring.
4. Add unit tests.
5. Add pack verification and document local publish checklist.

## Notes
- Because this repo already publishes only allowlisted files, the playground should remain non-shipping by design.
- If workflow changes later (monorepo publish tooling, CI release jobs), keep `verify:pack` as a guardrail.
