import { describe, it, expect } from 'vitest';
import {
  playgroundSchema,
  playgroundCategories,
  playgroundDefinitions,
} from '../src/settings/testSettingsConfig';

describe('playground settings config', () => {
  it('has categories with unique ids and order', () => {
    const ids = new Set(playgroundCategories.map((c) => c.id));
    expect(ids.size).toBe(playgroundCategories.length);
    expect(playgroundCategories.map((c) => c.id)).toContain('touch');
    expect(playgroundCategories.map((c) => c.id)).toContain('display');
    expect(playgroundCategories.map((c) => c.id)).toContain('actions');
  });

  it('has definitions with valid category references', () => {
    const categoryIds = new Set(playgroundCategories.map((c) => c.id));
    for (const def of playgroundDefinitions) {
      expect(categoryIds.has(def.category)).toBe(true);
    }
  });

  it('has touch-focused settings', () => {
    const ids = playgroundDefinitions.map((d) => d.id);
    expect(ids).toContain('tapDragThreshold');
    expect(ids).toContain('scrollSensitivity');
    expect(ids).toContain('virtualJoystick');
    expect(ids).toContain('deadZone');
    expect(ids).toContain('buttonSize');
    expect(ids).toContain('buttonSpacing');
    expect(ids).toContain('touchOpacity');
    expect(ids).toContain('restoreDefaults');
  });

  it('schema has version and sorted categories', () => {
    expect(playgroundSchema.version).toBe(1);
    expect(playgroundSchema.categories.length).toBe(playgroundCategories.length);
    const orders = playgroundSchema.categories.map((c) => c.order ?? 999);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('slider defaults are within min/max', () => {
    for (const def of playgroundDefinitions) {
      if (def.type === 'slider' && 'slider' in def && 'default' in def) {
        expect(def.default).toBeGreaterThanOrEqual(def.slider.min);
        expect(def.default).toBeLessThanOrEqual(def.slider.max);
      }
    }
  });
});
