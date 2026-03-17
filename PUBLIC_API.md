# Public API

Single source of truth for **exported symbols** is [src/index.ts](src/index.ts). Consumers must not rely on any export not listed here or on any subpath (e.g. `phaser-settings/validation`).

---

## Exported symbols

### Constants

| Symbol | Description |
|--------|-------------|
| `VERSION` | Package version string (from package.json, injected at build). |

### Types (schema and UI)

| Symbol | Description |
|--------|-------------|
| `SettingValue` | `string \| number \| boolean` — primitive value for a setting. |
| `SettingControlType` | Union of `'toggle' \| 'slider' \| 'select' \| 'segmented' \| 'action' \| 'section'`. |
| `SettingCondition` | Visibility/enabled condition: `string` (setting id) or `(getValue) => boolean`. |
| `SliderConstraints` | `{ min, max, step, suffix? }`. |
| `SettingOption` | `{ value, label }` for select/segmented. |
| `SettingDefinitionBase` | Base definition fields (id, label, category, help, default, etc.). |
| `ToggleSettingDefinition` | Definition for toggle control. |
| `SliderSettingDefinition` | Definition for slider (includes `slider: SliderConstraints`). |
| `SelectSettingDefinition` | Definition for select (includes `options`). |
| `SegmentedSettingDefinition` | Definition for segmented (includes `options`). |
| `ActionSettingDefinition` | Definition for action button (`actionLabel`, etc.). |
| `SectionSettingDefinition` | Definition for section header. |
| `SettingDefinition` | Union of all definition types. |
| `SettingCategory` | `{ id, label, order? }`. |
| `SettingsSchema` | `{ categories, definitions, version? }`. |
| `SettingsTheme` | Theme fields for layout, colors, and optional font families (rowHeight, font sizes, `fontFamily`, `titleFontFamily`, `labelFontFamily`, `helpFontFamily`, `sectionHeaderFontFamily`, `controlFontFamily`, `versionFontFamily`). Apps load fonts and pass families via theme; the library uses neutral fallbacks when unset. |

### Storage

| Symbol | Description |
|--------|-------------|
| `SettingsStorageAdapter` | Interface: `load(): Record<string, unknown>`, `save(data): void`. |

### Validation (helpers)

| Symbol | Description |
|--------|-------------|
| `getDefaultForDefinition(def)` | Default value for a definition. |
| `getOptionValues(def)` | Array of option values for select/segmented. |
| `validateSchema(schema)` | Throws on invalid schema (run in dev). |

### Manager

| Symbol | Description |
|--------|-------------|
| `SettingsManager` | Class: `create(options)`, `getInstance()`, `resetForTests()`, `isInitialized()`; instance: `getSchema()`, `get(id)`, `getOrDefault(id)`, `set(id, value)`, `resetToDefaults()`, `isVisible(def)`, `isEnabled(def)`, `subscribe(cb)`, `onApply(cb)`, `onApplySetting(id, cb)`. |
| `SettingChangeCallback` | `(id: string, value: SettingValue) => void`. |
| `ApplyCallback` | `(id: string, value: SettingValue) => void`. |
| `SettingsManagerCreateOptions` | Options for `SettingsManager.create()`. |

### UI

| Symbol | Description |
|--------|-------------|
| `defaultSettingsTheme` | Default theme object. |
| `renderSettingsList(options)` | Builds scrollable list of setting rows; returns `{ rows, rowYs, totalHeight }`. |
| `SettingsListRendererOptions` | Options for `renderSettingsList`. |
| `RenderedRow` | `{ container, definition, controlResult? }`. |
| `createSettingsModalScene(options)` | Returns a Phaser Scene class for the settings modal. |
| `CreateSettingsModalSceneOptions` | Options for `createSettingsModalScene`. |
| `SettingsModalBounds` | `{ x, y, width, height }` — optional bounds so the modal and overlay are confined to a rectangle (e.g. game area). Can be passed in options or via `scene.launch(key, { bounds })`. |

---

## Stability

- **0.x**: Pre-1.0. API may change; no stability guarantee beyond what is documented in [docs/API.md](docs/API.md) and [docs/INTEGRATION.md](docs/INTEGRATION.md).
- **1.0+**: SemVer. Breaking changes to the listed API or documented behavior will result in a major version bump.

Only the symbols and behavior described in this file and in docs/API.md and docs/INTEGRATION.md are part of the contract. Internal modules (e.g. under `src/ui/`, `src/validation.ts` as implementation) are **not** part of the public API even if they appear in `dist/`.
