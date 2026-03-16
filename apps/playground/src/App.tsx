import { useRef, useEffect, useState } from 'react';
import Phaser from 'phaser';
import {
  SettingsManager,
  createSettingsModalScene,
  type SettingsStorageAdapter,
} from 'phaser-settings';
import { getGameConfig } from './phaser/gameConfig';
import { playgroundSchema } from './settings/testSettingsConfig';
import { ControlsPanel } from './controls/ControlsPanel';

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
  const [manager, setManager] = useState<SettingsManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!SettingsManager.isInitialized()) {
      SettingsManager.create({ schema: playgroundSchema, storage: storageAdapter });
    }
    const settingsManager = SettingsManager.getInstance();
    setManager(settingsManager);

    const SettingsScene = createSettingsModalScene({
      manager: settingsManager,
      title: 'SETTINGS',
      onAction({ settingId, manager: m, scene, requestClose }) {
        if (settingId === 'restoreDefaults') {
          if (confirm('Restore all settings to defaults?')) {
            m.resetToDefaults();
            scene.scene.restart();
          }
        }
        requestClose();
      },
      onClose() {
        setManager(SettingsManager.getInstance());
      },
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
      <ControlsPanel manager={manager} />
    </div>
  );
}
