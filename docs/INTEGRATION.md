# Integration guide

This document defines how consuming applications must use **phaser-settings**. The package is the single source of truth for settings schema, validation, persistence contract, and the settings modal UI. Follow this contract so that agents and future changes do not break your integration.

See also: [README](../README.md), [API and contract](API.md), [PUBLIC_API.md](../PUBLIC_API.md).

---

## 1. What this package is responsible for

- **Schema-driven resolution**: Which settings exist, their types, defaults, and constraints.
- **Validation and coercion**: Stored and in-memory values are validated and coerced to schema (invalid → default; see [API.md](API.md)).
- **Persistence**: Via your **storage adapter** only; the package calls `load()` once at bootstrap and `save()` on every change. It does not implement storage.
- **Settings modal UI**: Toggle, slider, select, segmented, action, and section controls; scroll, keyboard, and theme.

Applications must not wrap, replace, or duplicate this behavior. If you need different behavior, use the documented extension points or propose an API addition to the package.

---

## 2. What apps must do

- **Depend on a versioned artifact**: Use the published npm package or a versioned workspace dependency (e.g. `"phaser-settings": "file:../.."` in a monorepo). Do not copy source files from this repo into your app.
- **Use only the public API**: Import only from the package entrypoint:
  ```ts
  import { SettingsManager, createSettingsModalScene, type SettingsStorageAdapter, type SettingsSchema } from 'phaser-settings';
  ```
  The public surface is listed in [PUBLIC_API.md](../PUBLIC_API.md).
- **Bootstrap once**: Call `SettingsManager.create({ schema, storage })` once at app startup. A second call throws.
- **Register the settings scene**: Use `createSettingsModalScene({ manager, onAction, onClose, ... })` and add the returned scene class to your Phaser config. Open the modal with `scene.launch('SettingsScene')` (or your `sceneKey`).
- **Implement the storage adapter**: Provide `SettingsStorageAdapter` with `load()` and `save()`. `load()` must return a plain object (use `{}` when no data); do not wrap or replace the package’s merge/validation/coercion logic.
- **Reflect setting changes in the client**: To show live values (e.g. a panel or menu that updates when the user changes a setting in the modal), subscribe with `SettingsManager.getInstance().subscribe(cb)` and update your UI from that callback (or from a state flag read in the scene’s update loop). Do not rely on polling or on reading the manager only when the modal closes unless that is sufficient for your UX.

---

## 2a. Settings JSON file

Define your app’s settings in a **single JSON file** (app-owned path, e.g. `public/settings.json` or `src/settings.json`). The shape matches `SettingsSchema`: `categories`, `definitions`, and optional `version`. All labels, section headers, help text (subtext under labels), slider units (`suffix`), and option labels live in this file. Do not duplicate the schema in code.

**Loading**: The app loads the JSON (e.g. `import schema from './settings.json'` with Vite/bundler, or `fetch('/settings.json')` then `response.json()`) and passes the parsed object to `SettingsManager.create({ schema: parsed, storage, ... })`.

**Conditions in JSON**: The fields `visibleWhen` and `enabledWhen` may only be a **string** (another setting’s `id`) or omitted. They cannot be functions in JSON, so the only supported condition is “visible/enabled when setting X is truthy.”

**TypeScript**: The parsed JSON should match `SettingsSchema` (see [PUBLIC_API.md](../PUBLIC_API.md)). You can cast the import: `import raw from './settings.json'; const schema = raw as SettingsSchema;`.

---

## 3. What apps must not do

- **Do not import from non-public paths.** Only `import … from 'phaser-settings'`. Do not use `phaser-settings/validation`, `phaser-settings/ui/...`, or any path that is not the root entry. Consumers must not rely on any export not listed in [PUBLIC_API.md](../PUBLIC_API.md) or on any subpath.
- **Do not wrap or duplicate resolution/validation/coercion.** Do not build app-local “settings merge” or fallback logic that changes how values are resolved or validated. Use the package’s extension points instead.
- **Do not call `SettingsManager.create()` more than once.** The manager is a singleton; a second create throws.
- **Do not add app-specific fallback or coercion** around settings unless the package documents an extension point for it (e.g. `beforeSet`, `onValidationError`). If you need new behavior, add an extension point in the shared package rather than patching in the app.

---

## 4. Extension points (sanctioned customization)

These are the only sanctioned ways to customize behavior. Use them instead of wrapping or replacing package behavior.

| Extension point | Where | Purpose |
|-----------------|--------|---------|
| `beforeSet(id, value)` | `SettingsManager.create({ … })` | Transform or reject a value before it is stored. |
| `afterSet(id, value)` | `SettingsManager.create({ … })` | Side effects after a value is stored (e.g. logging). |
| `onValidationError(id, raw, reason)` | `SettingsManager.create({ … })` | Notified when stored/incoming value is invalid; package still coerces to default. |
| `onPersistenceError(error)` | `SettingsManager.create({ … })` | Notified when `storage.save()` throws; package does not throw. |
| `migrate(loaded, fromVersion, toVersion)` | `SettingsManager.create({ … })` | Transform loaded data when `schema.version` changes. |
| `onAction({ settingId, manager, scene, requestClose })` | `createSettingsModalScene({ … })` | Handle action buttons (e.g. restore defaults, delete save). App does confirmation and navigation. |
| `onClose(scene)` | `createSettingsModalScene({ … })` | Called when modal is closed (ESC, click outside, X). |
| `theme` | `createSettingsModalScene({ … })` | Override layout/colors and typography for the modal list. Optional font-family fields (`fontFamily`, `titleFontFamily`, `labelFontFamily`, etc.) let the app control typefaces; the app is responsible for loading fonts before opening the settings scene (or accepts a brief fallback flash). |

If your app needs behavior not supported by the package, **propose or add an API or extension point in the shared package** rather than patching or wrapping in the app.

---

## 5. Lifecycle and state

- **Bootstrap**: One-time `SettingsManager.create({ schema, storage })`. Validates schema (unless `validateSchemaInDev: false`), loads from adapter, coerces values.
- **Singleton**: `SettingsManager.getInstance()` returns the same instance after create. `getInstance()` before create throws.
- **Sync only**: The storage adapter is synchronous. Async storage is not supported in 0.x.
- **Threading**: Single-threaded; no special threading model.

Details for storage contract, error handling, and migrations: [docs/API.md](API.md).

---

## 6. Install from GitHub

See [README — Install](../README.md#install). Use the tarball URL or Git HTTPS in `package.json`. After install, run `npm run build` in the package (or use a postinstall script) so `dist/` exists. The package does not ship built files from every branch; consumers typically depend on a tag or a built artifact.

---

## 7. Build

Before using the package (or after pulling updates), build it from the repo root:

```bash
npm run build
```

This produces `dist/`. Consuming apps must have a built package (or rely on your publish pipeline).

---

## 8. Examples

**Correct integration**

```ts
// Bootstrap (once)
import { SettingsManager, createSettingsModalScene, type SettingsStorageAdapter } from 'phaser-settings';

const storage: SettingsStorageAdapter = {
  load: () => ({ ... }),
  save: (data) => { ... },
};
SettingsManager.create({ schema: mySchema, storage });

// Scene
const SettingsScene = createSettingsModalScene({
  manager: SettingsManager.getInstance(),
  onAction: ({ settingId, manager, requestClose }) => { ... },
  onClose: (scene) => { ... },
});
// Add SettingsScene to Phaser config; open with scene.launch('SettingsScene')
```

**Forbidden**

- Importing from internals: `import { validateSchema } from 'phaser-settings/validation'` (no such path; use `import { validateSchema } from 'phaser-settings'` if you need it).
- App-owned “settings merge” that wraps or replaces the package: e.g. loading from storage and re-applying your own defaults/validation instead of using the manager’s `get`/`set` and adapter.
- Calling `SettingsManager.create()` in a second place (e.g. after a route change) to “re-init” settings.
