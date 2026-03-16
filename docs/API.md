# phaser-settings — Public API and contract

## Versioning

- **0.x**: Initial extraction; API may change. Pre-1.0.
- **1.0+**: SemVer. Breaking changes = major version.

## Public API surface

- **Version**: `VERSION` (string) — Package version from `package.json`, injected at build. Use `import { VERSION } from 'phaser-settings'` to check the installed version; it is also shown at the bottom of the settings modal.
- **Types**: `SettingValue`, `SettingDefinition` (union), `SettingsSchema`, `SettingCategory`, `SettingCondition`, `SettingsTheme`, and all definition interfaces (e.g. `ToggleSettingDefinition`).
- **Storage**: `SettingsStorageAdapter` interface.
- **Validation**: `getDefaultForDefinition(def)`, `getOptionValues(def)`, `validateSchema(schema)` (dev).
- **Manager**: `SettingsManager.create(options)`, `SettingsManager.getInstance()`, `SettingsManager.resetForTests()`, `isInitialized()`; instance methods: `getSchema()`, `get(id)`, `getOrDefault(id)`, `set(id, value)`, `resetToDefaults()`, `isVisible(def)`, `isEnabled(def)`, `subscribe(cb)`, `onApply(cb)`, `onApplySetting(id, cb)`.
- **UI**: `defaultSettingsTheme`, `renderSettingsList(options)`, `createSettingsModalScene(options)`.
- **Scene factory options**: `schema`, `storage` or `manager`, `theme?`, `onAction?(args)`, `onClose?()`.

## Unsupported (0.x)

- React or non-Phaser renderers.
- Async storage (adapter is sync only; future major may add async).

## Lifecycle

- **Init**: Call `SettingsManager.create({ schema, storage })` once at app bootstrap. Second call **throws** (prevents accidental re-init).
- **Pre-init**: `getInstance()` before `create()` **throws** with message: "SettingsManager not initialized. Call SettingsManager.create() first."
- **Singleton**: After `create()`, `getInstance()` returns the same instance.
- **Tests**: Call `SettingsManager.resetForTests()` to clear the singleton; then `create()` may be called again. Document as test/dev only.

## Error and coercion

- **Unknown key** in stored data: ignored.
- **Invalid value** for known id: coerce to schema default; if `onValidationError(id, raw, reason)` is provided in create options, call it.
- **Persistence**: If adapter throws in `save()`, manager calls `onPersistenceError?(error)` if provided; manager does not throw (failed write is logged/handled by app).
- **Corrupt load**: Adapter should return `{}` or migrate; package does not dictate. If adapter throws, manager throws (bootstrap fails fast).

## Storage adapter contract

- `load(): Record<string, unknown>` — Return current settings blob. Must not throw for "no data"; return `{}`. On corruption, return `{}` or throw; document adapter behavior.
- `save(data: Record<string, unknown>): void` — Persist. **Replace vs merge** is the adapter’s choice (e.g. Time Traders merges into SaveData.settings). Package passes full current settings (all keys in schema). Debounce: optional; can be adapter responsibility or a future package option.

## Schema evolution

- Optional `schema.version?: number`. If present, migration can be used.
- **Migration**: App can provide `migrate?(loaded, fromVersion, toVersion): Record<string, unknown>` in create options; manager calls after load when version changes.
- **Removed keys**: Manager only writes keys that exist in schema; keys not in schema are dropped when saving. Stored keys not in schema are ignored on read.

## Scene and navigation

- Package scene is **launched as overlay** (`scene.launch`). It does **not** use `goTo`. App handles navigation in `onAction` (e.g. deleteSave → `requestClose()`, then app calls `goTo(..., 'menu')`).
- **Transition-in**: Package scene is not entered via `goTo`; do not call `applyTransitionIn` in the package.

## onAction contract

```ts
onAction?: (args: {
  settingId: string;
  manager: SettingsManager;
  scene: Phaser.Scene;
  requestClose: () => void;
}) => void;
```

App performs confirmation, async UX, `manager.resetToDefaults()`, then `requestClose()` and/or navigation. Package only invokes `onAction` and provides `requestClose` (stops the scene).

## Optional hooks (create options)

- `beforeSet?(id, value): value | void`
- `afterSet?(id, value): void`
- `onValidationError?(id, raw, reason): void`
- `onPersistenceError?(error): void`
- `migrate?(loaded, fromVersion, toVersion): Record<string, unknown>`
