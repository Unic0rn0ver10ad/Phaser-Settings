import { describe, it, expect } from 'vitest';
import { validateSchema } from './validation.js';
import type { SettingsSchema } from './types.js';

const baseCategories = [{ id: 'c', label: 'C', order: 0 }];
const baseSection = { type: 'section' as const, id: 's', label: 'S', category: 'c', default: false };

describe('validateSchema', () => {
  it('throws for definition missing id', () => {
    const schema: SettingsSchema = {
      categories: baseCategories,
      definitions: [
        baseSection,
        { type: 'toggle', id: '', label: 'T', category: 'c', default: false },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('definition missing id');
  });

  it('throws for duplicate id', () => {
    const schema: SettingsSchema = {
      categories: baseCategories,
      definitions: [
        baseSection,
        { type: 'toggle', id: 'dup', label: 'T1', category: 'c', default: false },
        { type: 'toggle', id: 'dup', label: 'T2', category: 'c', default: true },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('duplicate id "dup"');
  });

  it('throws for definition missing label', () => {
    const schema: SettingsSchema = {
      categories: baseCategories,
      definitions: [
        baseSection,
        { type: 'toggle', id: 't', label: '', category: 'c', default: false },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('missing label');
  });

  it('throws for definition missing category', () => {
    const schema: SettingsSchema = {
      categories: baseCategories,
      definitions: [
        baseSection,
        { type: 'toggle', id: 't', label: 'T', category: '', default: false },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('missing category');
  });

  it('throws for slider missing slider constraints', () => {
    const schema: SettingsSchema = {
      categories: baseCategories,
      definitions: [
        baseSection,
        { type: 'slider', id: 'sl', label: 'Sl', category: 'c', default: 0.5, slider: undefined! },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('missing slider constraints');
  });

  it('throws for action missing actionLabel', () => {
    const schema: SettingsSchema = {
      categories: baseCategories,
      definitions: [
        baseSection,
        { type: 'action', id: 'act', label: 'Act', category: 'c', default: false, actionLabel: undefined! },
      ],
    };
    expect(() => validateSchema(schema)).toThrow('missing actionLabel');
  });

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
