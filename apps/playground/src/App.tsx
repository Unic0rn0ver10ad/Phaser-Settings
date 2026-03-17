import { useRef, useEffect } from 'react';
import Phaser from 'phaser';
import {
  SettingsManager,
  createSettingsModalScene,
  type SettingsStorageAdapter,
  type SettingsSchema,
} from 'phaser-settings';
import { getGameConfig } from './phaser/gameConfig';
import settingsSchemaJson from './settings.json';
import { APP_FONT_FAMILY } from './appTheme';

const settingsSchema = settingsSchemaJson as SettingsSchema;

const STORAGE_KEY = 'phaser-settings-playground';

const storageAdapter: SettingsStorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    } catch {
      return {};
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Playground storage save failed', e);
    }
  },
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!SettingsManager.isInitialized()) {
      SettingsManager.create({ schema: settingsSchema, storage: storageAdapter });
    }
    const settingsManager = SettingsManager.getInstance();

    const SettingsScene = createSettingsModalScene({
      manager: settingsManager,
      title: 'SETTINGS',
      theme: { fontFamily: APP_FONT_FAMILY },
      onAction({ settingId, manager: m, scene, requestClose }) {
        const def = m.getSchema().definitions.find((d) => d.id === settingId);
        const label =
          def && def.type === 'action' && 'actionLabel' in def
            ? (def as { actionLabel?: string }).actionLabel
            : def && 'label' in def
              ? (def as { label: string }).label
              : settingId;
        const playground = scene.scene.get('PlaygroundScene');
        if (playground) playground.events.emit('buttonPressed', { label: String(label) });
        if (settingId === 'restoreDefaults') {
          if (confirm('Restore all settings to defaults?')) {
            m.resetToDefaults();
            scene.scene.restart();
          }
        }
        requestClose();
      },
      onClose(_scene) {},
    });

    const config = getGameConfig(containerRef.current, [SettingsScene]);
    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="app">
      <div className="phaser-container" ref={containerRef} />
    </div>
  );
}
