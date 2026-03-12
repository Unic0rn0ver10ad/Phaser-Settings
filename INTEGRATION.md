# Integration guide: Using phaser-settings in another Phaser repo

This guide walks through installing and configuring **phaser-settings** from GitHub in a different Phaser 3 project.

---

## 1. Install from GitHub

The GitHub repo must have the package files pushed (at least one commit on `main`). If the repo is empty, install will fail.

### Option A: Install via tarball (no Git — best on Windows)

This avoids Git and SSH entirely, so it sidesteps “Could not read from remote” and Windows dofork (0xC0000142) errors:

```bash
npm install https://github.com/Unic0rn0ver10ad/Phaser-Settings/archive/refs/heads/main.tar.gz
```

In `package.json`:

```json
"phaser-settings": "https://github.com/Unic0rn0ver10ad/Phaser-Settings/archive/refs/heads/main.tar.gz"
```

If the default branch is `master` instead of `main`, use `main` in the URL or replace with `master`.

### Option B: Install via Git (HTTPS)

```bash
npm install https://github.com/Unic0rn0ver10ad/Phaser-Settings.git
```

If you still see `ssh://git@github.com/...` in errors, Git is rewriting the URL. Force HTTPS for GitHub (run once):

```bash
git config --global url."https://github.com/".insteadOf ssh://git@github.com/
```

Then run the `npm install` again.

Your project must already depend on **phaser** (peer dependency ^3.60.0).

---

## 2. Build the package (required when using GitHub)

The GitHub repo does not ship a pre-built `dist/`. Build it once after install:

```bash
cd node_modules/phaser-settings
npm install
npm run build
cd ../..
```

Or add a **postinstall** script in your game’s `package.json` to build it automatically:

```json
"scripts": {
  "postinstall": "cd node_modules/phaser-settings && npm install && npm run build"
}
```

Then `npm install` will build phaser-settings for you.

---

## 3. Implement the storage adapter

phaser-settings never touches `localStorage` (or any store) directly. Your game provides an adapter.

Create a small module (e.g. `src/settingsAdapter.ts` or next to your save logic):

```ts
import type { SettingsStorageAdapter } from 'phaser-settings';

export function createSettingsAdapter(): SettingsStorageAdapter {
  const KEY = 'my_game_settings'; // or use your existing save key

  return {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return {};
        const data = JSON.parse(raw);
        return data && typeof data === 'object' ? data : {};
      } catch {
        return {};
      }
    },
    save(data) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        console.error('phaser-settings: save failed', e);
      }
    },
  };
}
```

If your game already has a save manager (e.g. one object that owns `localStorage`), implement the adapter by calling that manager’s load/save for the settings slice, so phaser-settings stays behind your single persistence boundary.

---

## 4. Define your schema

Create a schema (categories + definitions). Example file `src/settingsSchema.ts`:

```ts
import type { SettingsSchema, SettingDefinition, SettingCategory } from 'phaser-settings';

const categories: SettingCategory[] = [
  { id: 'general', label: 'General', order: 0 },
  { id: 'audio', label: 'Audio', order: 10 },
];

const definitions: SettingDefinition[] = [
  { type: 'section', id: 'section_general', label: 'General', category: 'general', default: false },
  {
    type: 'toggle',
    id: 'muted',
    label: 'Mute',
    category: 'audio',
    default: false,
    applyImmediately: true,
  },
  {
    type: 'slider',
    id: 'volume',
    label: 'Volume',
    category: 'audio',
    default: 0.8,
    slider: { min: 0, max: 1, step: 0.1, suffix: '' },
    applyImmediately: true,
  },
  {
    type: 'select',
    id: 'language',
    label: 'Language',
    category: 'general',
    default: 'en',
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
    ],
  },
  {
    type: 'action',
    id: 'restoreDefaults',
    label: 'Restore defaults', // optional for actions: can be '' and the UI uses actionLabel
    category: 'general',
    default: false,
    actionLabel: 'Restore defaults',
  },
];

export const settingsSchema: SettingsSchema = {
  categories: categories.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  definitions,
};
```

Supported definition types: `section`, `toggle`, `slider`, `select`, `segmented`, `action`. See `phaser-settings` types (e.g. `SliderSettingDefinition`, `SelectSettingDefinition`) for full shapes.

---

## 5. Initialize the manager at bootstrap

Call **once** before any scene or code reads settings (e.g. when creating the Phaser game or in your boot scene’s `init`/`create`):

```ts
import { SettingsManager } from 'phaser-settings';
import { createSettingsAdapter } from './settingsAdapter';
import { settingsSchema } from './settingsSchema';

const adapter = createSettingsAdapter();
SettingsManager.create({ schema: settingsSchema, storage: adapter });
```

Do not call `create()` more than once. Use `SettingsManager.getInstance()` everywhere after this.

---

## 6. Register the settings scene and add it to the game

### Option A: Scene in the initial game config

When creating your Phaser game config, create the scene class and add it to the `scene` array:

```ts
import { createSettingsModalScene, SettingsManager } from 'phaser-settings';

const SettingsScene = createSettingsModalScene({
  manager: SettingsManager.getInstance(),
  title: 'SETTINGS', // optional; default is "SETTINGS"
  onAction(args) {
    const { settingId, manager, scene, requestClose } = args;
    if (settingId === 'restoreDefaults') {
      if (confirm('Reset all settings to defaults?')) {
        manager.resetToDefaults();
        scene.scene.restart();
      }
    }
    // Add more IDs (e.g. deleteSave, credits) as needed.
  },
  onClose(scene) {
    // Optional: e.g. play a button sound when the modal closes
    // yourSoundManager.playSfx(scene, 'click');
  },
});

const config = {
  // ...
  scene: [BootScene, MainMenuScene, SettingsScene, /* ... */],
};
```

The modal is **launched** on top of other scenes; it does not replace them. Use `sceneKey: 'SettingsScene'` (default) or pass a custom `sceneKey` in the options if you want a different key.

### Option B: Runtime registration (if "Scene key not found" happens)

In some setups (e.g. Vite + ES modules), the scene from the config array may not be registered under the expected key. If you get **Scene key not found: SettingsScene** when launching:

1. **Bootstrap in a dedicated module** (e.g. `settings/settingsScene.ts`) that creates the adapter, calls `SettingsManager.create()`, calls `createSettingsModalScene(...)`, and exports the scene key and a getter for the scene class.
2. **Import that module before creating the game** in your main entry (e.g. `main.ts`: `import './game/settings/settingsScene'` before `new Phaser.Game(config)`).
3. **Omit the settings scene from the initial `scene` array** in the game config.
4. **In BootScene.create()**, register the scene manually:

   ```ts
   import { SETTINGS_SCENE_KEY, getSettingsSceneClass } from '../settings/settingsScene'

   create() {
     if (!this.scene.get(SETTINGS_SCENE_KEY)) {
       this.scene.add(SETTINGS_SCENE_KEY, getSettingsSceneClass(), false)
     }
     // ... rest of boot
   }
   ```

Then `this.scene.launch('SettingsScene')` will work. See [docs/IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md#2-scene-key-not-found-settingsscene) for full details.

---

## 7. Open the settings modal

From any scene (e.g. menu or pause):

```ts
this.scene.launch('SettingsScene');
```

To close, the user can click the X, click outside the panel, or press ESC. Your `onClose` callback runs when that happens (if you passed one).

---

## 8. Read settings in your game

Wherever you need the current value:

```ts
import { SettingsManager } from 'phaser-settings';

const muted = SettingsManager.getInstance().get('muted') ?? false;
const volume = SettingsManager.getInstance().getOrDefault('volume');
```

---

## 9. Optional: Apply hooks (immediate effect when a setting changes)

If a definition has `applyImmediately: true`, you can run logic when that setting changes (e.g. mute audio, toggle fullscreen):

```ts
import { SettingsManager } from 'phaser-settings';

const settings = SettingsManager.getInstance();

settings.onApplySetting('muted', (_id, value) => {
  if (value) {
    // stop all sounds
  }
});

settings.onApplySetting('fullscreen', (_id, value) => {
  if (value) {
    game.scale.startFullscreen();
  } else {
    game.scale.stopFullscreen();
  }
});
```

Register these once at startup (e.g. in your boot or main init), after `SettingsManager.create()` has run.

---

## Checklist

| Step | Action |
|------|--------|
| 1 | `npm install https://github.com/Unic0rn0ver10ad/Phaser-Settings/archive/refs/heads/main.tar.gz` (or `.git` if Git/SSH works) |
| 2 | Build the package (`cd node_modules/phaser-settings && npm install && npm run build`) or use a postinstall script |
| 3 | Implement `SettingsStorageAdapter` (load/save) |
| 4 | Define `SettingsSchema` (categories + definitions) |
| 5 | Call `SettingsManager.create({ schema, storage })` once at bootstrap |
| 6 | Create scene with `createSettingsModalScene({ manager, onAction, onClose? })` and add it to the Phaser `scene` array |
| 7 | Open with `this.scene.launch('SettingsScene')` |
| 8 | Read values with `SettingsManager.getInstance().get(id)` |
| 9 | (Optional) Register `onApplySetting` for immediate-apply settings |

---

## Troubleshooting

- **"SettingsManager not initialized"**  
  You’re calling `getInstance()` before `create()`. Ensure `SettingsManager.create({ schema, storage })` runs once at app startup, before any scene or code uses the manager.

- **Modal doesn’t open or controls don’t respond**  
  Make sure the settings scene was added to the Phaser config `scene` array and you’re calling `this.scene.launch('SettingsScene')` (or whatever `sceneKey` you passed).

- **Build errors after install**  
  The package must be built. Run `npm run build` inside `node_modules/phaser-settings` (and run `npm install` there first if needed), or use the postinstall script above.

- **Types not found**  
  Ensure your project has TypeScript and that `phaser-settings` is in `dependencies` (or `devDependencies`). The package ships `dist/*.d.ts`; building the package generates these if you installed from GitHub.

- **"Could not read from remote repository" or Windows dofork/exit 0xC0000142**  
  npm is using Git and Git is using SSH. Either: (1) Install from the **tarball** so Git is not used: `npm install https://github.com/Unic0rn0ver10ad/Phaser-Settings/archive/refs/heads/main.tar.gz`. Or (2) force Git to use HTTPS: `git config --global url."https://github.com/".insteadOf ssh://git@github.com/` then run `npm install` again.

- **Repo empty / no content**  
  If the GitHub repo has no commits yet, push the package contents first (see REPO_SETUP.md in the phaser-settings repo). Install only works once the repo has at least one commit (e.g. on `main`).
