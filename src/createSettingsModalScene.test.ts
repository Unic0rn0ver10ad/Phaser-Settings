/**
 * UI contract tests for createSettingsModalScene: onClose (ESC, click-outside, close button), onAction args, bounds.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager } from './SettingsManager.js';
import Phaser from 'phaser';
import { createSettingsModalScene } from './createSettingsModalScene.js';
import type { SettingsSchema } from './types.js';
import type { SettingsStorageAdapter } from './storage.js';

interface TestCaptures {
  pointerdownCallbacks: Array<() => void>;
  getEscCallback: () => (() => void) | null;
  setEscCallback: (cb: (() => void) | null) => void;
}

vi.mock('phaser', () => {
  const noop = () => {};
  const noopReturn = () => {
    const o = {
      clear: noop, fillStyle: () => o, fillRect: () => o, fillRoundedRect: () => o, fillCircle: () => o,
      lineStyle: () => o, strokeRoundedRect: () => o, lineBetween: () => o,
      setOrigin: () => o, setDepth: () => o, setMask: () => o, setVisible: () => o,
      createGeometryMask: () => ({}),
    };
    return o;
  };
  const pointerdownCallbacks: Array<() => void> = [];
  let escDownCallback: (() => void) | null = null;
  const createZone = () => {
    const handlers: Record<string, () => void> = {};
    const z = {
      setInteractive: () => z,
      on: (ev: string, cb: () => void) => {
        if (ev === 'pointerdown') pointerdownCallbacks.push(cb);
        handlers[ev] = cb;
        return z;
      },
      setDepth: () => z,
      _emit: (ev: string) => handlers[ev]?.(),
    };
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
  class MockScene {
    settingsRows: unknown[] = [];
    settingsRowYs: number[] = [];
    settingsListX = 0;
    settingsListYBase = 0;
    scrollY = 0;
    viewportHeight = 100;
    versionContainer: { setPosition: (x: number, y: number) => void } | null = null;
    versionRowY = 0;
    settingsListWidth = 0;
    scene!: { key: string; bringToTop: () => void; stop: ReturnType<typeof vi.fn> };
    add!: unknown;
    cameras!: unknown;
    scale!: unknown;
    events!: unknown;
    input!: unknown;

    constructor(public sceneKey = 'SettingsScene') {
      this.scene = { key: this.sceneKey, bringToTop: noop, stop: vi.fn() };
      this.add = {
        graphics: () => noopReturn(),
        text: (_x: number, _y: number, _text: string, _opts?: object) => ({ setOrigin: noopReturn, setDepth: noopReturn }),
        container: createContainer,
        zone: createZone,
      };
      this.cameras = { main: { setBackgroundColor: noop } };
      this.scale = { width: 800, height: 600 };
      this.events = { on: noop, once: noop };
      this.input = {
        on: noop,
        off: noop,
        hitTestPointer: () => [],
        keyboard: {
          addKeys: () => ({
            UP: { on: noop, off: noop },
            DOWN: { on: noop, off: noop },
            ESC: { on: (_ev: string, cb: () => void) => { escDownCallback = cb; }, off: noop },
          }),
        },
      };
    }
    setScrollY(_y: number) {}
    applyScroll(_delta: number) {}
  }
  const MockMath = { Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)) };
  const MockGeomRectangle = class {
    constructor(public x = 0, public y = 0, public width = 800, public height = 600) {}
    static Contains(_r: { x: number; y: number; width: number; height: number }, _x: number, _y: number) {
      return true;
    }
  };
  const mock = {
    Scene: MockScene,
    Geom: { Rectangle: MockGeomRectangle },
    Math: MockMath,
    __testCaptures: {
      pointerdownCallbacks,
      getEscCallback: () => escDownCallback,
      setEscCallback: (cb: (() => void) | null) => { escDownCallback = cb; },
    } as TestCaptures,
  };
  return { default: mock };
});

function getCaptures(): TestCaptures {
  return (Phaser as unknown as { __testCaptures: TestCaptures }).__testCaptures;
}

const minimalSchema: SettingsSchema = {
  categories: [{ id: 'g', label: 'General', order: 0 }],
  definitions: [
    { type: 'section', id: 's1', label: 'General', category: 'g', default: false },
    { type: 'toggle', id: 'muted', label: 'Mute', category: 'g', default: false },
    { type: 'action', id: 'restoreDefaults', label: 'Restore', category: 'g', default: false, actionLabel: 'Restore defaults' },
  ],
};

function createStorage(initial: Record<string, unknown> = {}): SettingsStorageAdapter {
  const data = { ...initial };
  return { load: () => ({ ...data }), save: (d) => Object.assign(data, d) };
}

type SceneInst = {
  init?: (data?: Record<string, unknown>) => void;
  create?: () => void;
  settingsRows: Array<{ definition: { type: string; id: string }; controlResult?: { container: { list: Array<{ _emit?: (ev: string) => void }> } } }>;
  scene: { stop: ReturnType<typeof vi.fn> };
  viewportHeight?: number;
};

describe('createSettingsModalScene contract', () => {
  beforeEach(() => {
    SettingsManager.resetForTests();
    const cap = getCaptures();
    cap.pointerdownCallbacks.length = 0;
    cap.setEscCallback(null);
  });

  it('onClose and scene.stop called when overlay pointerdown (click-outside)', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const onClose = vi.fn();
    const SceneClass = createSettingsModalScene({ manager, onClose });
    const sceneInstance = new (SceneClass as unknown as new () => SceneInst)();
    sceneInstance.init?.();
    sceneInstance.create?.();
    const pointerdownCallbacks = getCaptures().pointerdownCallbacks;
    expect(pointerdownCallbacks.length).toBeGreaterThanOrEqual(1);
    pointerdownCallbacks[0]!();
    expect(onClose).toHaveBeenCalledWith(sceneInstance);
    expect(sceneInstance.scene.stop).toHaveBeenCalled();
  });

  it('onClose and scene.stop called when close button pointerdown', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const onClose = vi.fn();
    const SceneClass = createSettingsModalScene({ manager, onClose });
    const sceneInstance = new (SceneClass as unknown as new () => SceneInst)();
    sceneInstance.init?.();
    sceneInstance.create?.();
    const pointerdownCallbacks = getCaptures().pointerdownCallbacks;
    expect(pointerdownCallbacks.length).toBeGreaterThanOrEqual(2);
    pointerdownCallbacks[1]!();
    expect(onClose).toHaveBeenCalledWith(sceneInstance);
    expect(sceneInstance.scene.stop).toHaveBeenCalled();
  });

  it('onClose and scene.stop called when ESC key down', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const onClose = vi.fn();
    const SceneClass = createSettingsModalScene({ manager, onClose });
    const sceneInstance = new (SceneClass as unknown as new () => SceneInst)();
    sceneInstance.init?.();
    sceneInstance.create?.();
    const escDownCallback = getCaptures().getEscCallback();
    expect(escDownCallback).toBeDefined();
    escDownCallback!();
    expect(onClose).toHaveBeenCalledWith(sceneInstance);
    expect(sceneInstance.scene.stop).toHaveBeenCalled();
  });

  it('onAction called with settingId, manager, scene, requestClose when action triggered', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const onAction = vi.fn();
    const SceneClass = createSettingsModalScene({ manager, onAction });
    const sceneInstance = new (SceneClass as unknown as new () => SceneInst)();
    sceneInstance.init?.();
    sceneInstance.create?.();
    const actionRow = sceneInstance.settingsRows.find((r) => r.definition.type === 'action');
    expect(actionRow).toBeDefined();
    const container = actionRow!.controlResult!.container;
    const actionZone = container.list[container.list.length - 1];
    actionZone._emit!('pointerdown');
    actionZone._emit!('pointerup');
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        settingId: 'restoreDefaults',
        manager,
        scene: sceneInstance,
      })
    );
    const firstArg = onAction.mock.calls[0]?.[0] as { requestClose: () => void } | undefined;
    expect(typeof firstArg?.requestClose).toBe('function');
  });

  it('bounds from options used for layout dimensions', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const SceneClass = createSettingsModalScene({
      manager,
      bounds: { x: 10, y: 20, width: 400, height: 300 },
    });
    const sceneInstance = new (SceneClass as unknown as new () => SceneInst)();
    sceneInstance.init?.();
    sceneInstance.create?.();
    expect(sceneInstance.viewportHeight).toBeGreaterThan(0);
  });

  it('bounds from scene.launch data used when init(data) called with data.bounds', () => {
    const storage = createStorage();
    const manager = SettingsManager.create({ schema: minimalSchema, storage });
    const SceneClass = createSettingsModalScene({ manager });
    const sceneInstance = new (SceneClass as unknown as new () => SceneInst)();
    sceneInstance.init?.({
      bounds: { x: 5, y: 10, width: 200, height: 150 },
    });
    sceneInstance.create?.();
    expect(sceneInstance.viewportHeight).toBeGreaterThan(0);
  });
});
