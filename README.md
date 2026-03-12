# phaser-settings

Data-driven Phaser 3 settings system: schema, storage adapter, validation, and modal UI (toggle, slider, select, segmented, action, section).

## Install

```bash
npm install phaser-settings
```

Peer dependency: `phaser` ^3.60.0.

## Quick start

1. **Implement a storage adapter** (e.g. bridge to your save system / localStorage):

```ts
import type { SettingsStorageAdapter } from 'phaser-settings';

const adapter: SettingsStorageAdapter = {
  load() {
    return JSON.parse(localStorage.getItem('settings') ?? '{}');
  },
  save(data) {
    localStorage.setItem('settings', JSON.stringify(data));
  },
};
```

2. **Build your schema** (categories + definitions). See types in `phaser-settings` for `SettingsSchema`, `SettingDefinition` (toggle, slider, select, segmented, action, section).

3. **Initialize the manager** once at bootstrap:

```ts
import { SettingsManager } from 'phaser-settings';

SettingsManager.create({ schema: yourSchema, storage: adapter });
```

4. **Register the settings scene** and open it (e.g. from a menu button):

```ts
import { createSettingsModalScene } from 'phaser-settings';

const SettingsScene = createSettingsModalScene({
  manager: SettingsManager.getInstance(),
  onAction: ({ settingId, manager, scene, requestClose }) => {
    // Handle restoreDefaults, deleteSave, credits, etc.
  },
  onClose: (scene) => { /* e.g. play sound */ },
});

// In your Phaser config:
scene: [..., SettingsScene]

// Open modal:
this.scene.launch('SettingsScene');
```

## How to add a new setting

1. Add a definition to your schema (e.g. in `settingsDefinitions.ts`). Append to the definitions array; add a category if needed.
2. Read the value in game code via `SettingsManager.getInstance().get('id')` or `.getOrDefault('id')`.
3. Optional: register an apply callback with `settings.onApplySetting('id', (id, value) => { ... })` for immediate effects.

See [docs/API.md](docs/API.md) for lifecycle, storage contract, migrations, and scene options.

## API

- **Types**: `SettingValue`, `SettingDefinition`, `SettingsSchema`, `SettingsTheme`, etc.
- **Storage**: `SettingsStorageAdapter` interface.
- **Manager**: `SettingsManager.create()`, `getInstance()`, `resetForTests()`, `isInitialized()`; instance methods `get`, `set`, `resetToDefaults`, `subscribe`, `onApplySetting`, etc.
- **UI**: `defaultSettingsTheme`, `renderSettingsList()`, `createSettingsModalScene()`.

## Versioning

0.x — pre-1.0; API may change. 1.0+ follows SemVer.
