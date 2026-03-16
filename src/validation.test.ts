import { describe, it, expect } from 'vitest';
import { validateSchema } from './validation.js';
import type { SettingsSchema } from './types.js';

describe('validateSchema', () => {
  it('throws for select with empty options', () => {
    const schema: SettingsSchema = {
      categories: [{ id: 'c', label: 'C', order: 0 }],
      definitions: [
        { type: 'section', id: 's', label: 'S', category: 'c', default: false },
        { type: 'select', id: 'sel', label: 'Sel', category: 'c', default: 'a', options: [] },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('options must be non-empty');
  });

  it('throws for segmented with empty options', () => {
    const schema: SettingsSchema = {
      categories: [{ id: 'c', label: 'C', order: 0 }],
      definitions: [
        { type: 'section', id: 's', label: 'S', category: 'c', default: false },
        { type: 'segmented', id: 'seg', label: 'Seg', category: 'c', default: 1, options: [] },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('options must be non-empty');
  });

  it('accepts select/segmented with non-empty options', () => {
    const schema: SettingsSchema = {
      categories: [{ id: 'c', label: 'C', order: 0 }],
      definitions: [
        { type: 'section', id: 's', label: 'S', category: 'c', default: false },
        { type: 'select', id: 'sel', label: 'Sel', category: 'c', default: 'a', options: [{ value: 'a', label: 'A' }] },
        { type: 'segmented', id: 'seg', label: 'Seg', category: 'c', default: 1, options: [{ value: 1, label: 'One' }] },
      ],
    };
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
