import { describe, it, expect } from 'vitest';
import settingsSchema from '../src/settings.json';

describe('playground settings config', () => {
  const { categories, definitions } = settingsSchema;

  it('has categories with unique ids and order', () => {
    const ids = new Set(categories.map((c: { id: string }) => c.id));
    expect(ids.size).toBe(categories.length);
    expect(categories.map((c: { id: string }) => c.id)).toContain('touch');
    expect(categories.map((c: { id: string }) => c.id)).toContain('display');
    expect(categories.map((c: { id: string }) => c.id)).toContain('actions');
  });

  it('has definitions with valid category references', () => {
    const categoryIds = new Set(categories.map((c: { id: string }) => c.id));
    for (const def of definitions) {
      expect(categoryIds.has(def.category)).toBe(true);
    }
  });

  it('has expected setting ids', () => {
    const ids = definitions.map((d: { id: string }) => d.id);
    expect(ids).toContain('tapDragThreshold');
    expect(ids).toContain('scrollSensitivity');
    expect(ids).toContain('virtualJoystick');
    expect(ids).toContain('language');
    expect(ids).toContain('buttonA');
    expect(ids).toContain('restoreDefaults');
  });

  it('schema has version and sorted categories', () => {
    expect(settingsSchema.version).toBe(1);
    expect(settingsSchema.categories.length).toBe(categories.length);
    const orders = settingsSchema.categories.map((c: { order?: number }) => c.order ?? 999);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('slider defaults are within min/max', () => {
    for (const def of definitions) {
      if (def.type === 'slider' && def.slider && 'default' in def) {
        expect(def.default).toBeGreaterThanOrEqual(def.slider.min);
        expect(def.default).toBeLessThanOrEqual(def.slider.max);
      }
    }
  });

  it('every select and segmented has non-empty options', () => {
    for (const def of definitions) {
      if (def.type === 'select' || def.type === 'segmented') {
        expect(Array.isArray(def.options)).toBe(true);
        expect(def.options.length).toBeGreaterThan(0);
      }
    }
  });

  it('every select/segmented default is one of options values', () => {
    for (const def of definitions) {
      if (def.type === 'select' || def.type === 'segmented') {
        const values = def.options.map((o: { value: unknown }) => o.value);
        expect(values).toContain(def.default);
      }
    }
  });

  it('every definition id is unique', () => {
    const ids = definitions.map((d: { id: string }) => d.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
