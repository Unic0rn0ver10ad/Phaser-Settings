/**
 * UI contract tests for renderSettingsList: manager source, fallback to singleton, and controls calling manager.set/onAction.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
import { SettingsManager } from './SettingsManager.js';
import { renderSettingsList } from './ui/SettingsListRenderer.js';
import type { SettingsSchema } from './types.js';
import type { SettingsStorageAdapter } from './storage.js';

function makeMockScene() {
  const zones: Array<{ on: (ev: string, cb: () => void) => void; _emit: (ev: string) => void }> = [];
  const noop = () => {};
  const noopReturn = () => ({ clear: noop, fillStyle: noop, fillRect: noop, fillRoundedRect: noop, fillCircle: noop, lineStyle: noop, strokeRoundedRect: noop, lineBetween: noop, setOrigin: noopReturn, setDepth: noopReturn, setMask: noopReturn, setVisible: noop });
  const createZone = () => {
    const handlers: Record<string, () => void> = {};
    const z = {
      setInteractive: () => z,
      on: (ev: string, cb: () => void) => {
        handlers[ev] = cb;
        return z;
      },
      _emit: (ev: string) => handlers[ev]?.(),
    };
    zones.push(z);
    return z;
  };
  const createContainer = (_x: number, _y: number, children: unknown[] = []) => ({
    list: children as unknown[],
    setPosition: noop,
    setDepth: noop,
    setMask: noop,
    setSize: noop,
    add: noop,
    addAt: noop,
  });
  const scene = {
    add: {
      graphics: noopReturn,
      text: (_x: number, _y: number, _text: string, _opts?: object) => ({ setOrigin: noopReturn, setDepth: noopReturn, wordWrap: noopReturn }),
      container: createContainer,
      zone: createZone,
    },
  };
  return { scene: scene as unknown as Phaser.Scene, zones };
}

const minimalSchema: SettingsSchema = {
  categories: [{ id: 'g', label: 'General', order: 0 }],
  definitions: [
    { type: 'section', id: 's1', label: 'General', category: 'g', default: false },
    { type: 'toggle', id: 'muted', label: 'Mute', category: 'g', default: false },
    { type: 'action', id: 'act', label: 'Action', category: 'g', default: false, actionLabel: 'Do it' },
  ],
};

function createStorage(initial: Record<string, unknown> = {}): SettingsStorageAdapter {
  const data = { ...initial };
  return {
    load: () => ({ ...data }),
    save: (d) => { Object.assign(data, d); },
  };
}

describe('renderSettingsList contract', () => {
  beforeEach(() => {
    SettingsManager.resetForTests();
  });

  it('uses explicit manager when provided', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const getSchema = vi.spyOn(manager, 'getSchema');
    const getOrDefault = vi.spyOn(manager, 'getOrDefault');
    const { scene } = makeMockScene();
    renderSettingsList({ scene, listWidth: 300, manager });
    expect(getSchema).toHaveBeenCalled();
    expect(getOrDefault).toHaveBeenCalled();
  });

  it('uses SettingsManager.getInstance() when manager omitted', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const getSchema = vi.spyOn(manager, 'getSchema');
    const { scene } = makeMockScene();
    renderSettingsList({ scene, listWidth: 300 });
    expect(getSchema).toHaveBeenCalled();
  });

  it('toggle control onChange calls manager.set', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const setSpy = vi.spyOn(manager, 'set');
    const { scene, zones } = makeMockScene();
    const { rows } = renderSettingsList({ scene, listWidth: 300, manager });
    const toggleRow = rows.find((r) => r.definition.type === 'toggle');
    expect(toggleRow).toBeDefined();
    expect(toggleRow!.controlResult).toBeDefined();
    const container = toggleRow!.controlResult!.container as { list: unknown[] };
    const zone = container.list[container.list.length - 1] as { _emit: (ev: string) => void };
    zone._emit('pointerdown');
    expect(setSpy).toHaveBeenCalledWith('muted', true);
  });

  it('action control invokes onAction with settingId', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const onAction = vi.fn();
    const { scene } = makeMockScene();
    const { rows } = renderSettingsList({ scene, listWidth: 300, manager, onAction });
    const actionRow = rows.find((r) => r.definition.type === 'action');
    expect(actionRow).toBeDefined();
    expect(actionRow!.controlResult).toBeDefined();
    const container = actionRow!.controlResult!.container as { list: unknown[] };
    const zone = container.list[container.list.length - 1] as { _emit: (ev: string) => void };
    zone._emit('pointerdown');
    zone._emit('pointerup');
    expect(onAction).toHaveBeenCalledWith('act');
  });
});
