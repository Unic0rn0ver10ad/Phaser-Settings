import type { SettingsSchema, SettingCategory, SettingDefinition } from 'phaser-settings';

export const playgroundCategories: SettingCategory[] = [
  { id: 'touch', label: 'Touch', order: 0 },
  { id: 'display', label: 'Display', order: 10 },
  { id: 'actions', label: 'Actions', order: 20 },
];

export const playgroundDefinitions: SettingDefinition[] = [
  { type: 'section', id: 'section_touch', label: 'Touch & input', category: 'touch', default: false },
  {
    type: 'slider',
    id: 'tapDragThreshold',
    label: 'Tap vs drag threshold (px)',
    category: 'touch',
    default: 4,
    slider: { min: 0, max: 32, step: 2, suffix: 'px' },
    help: 'Movement under this is treated as tap.',
    applyImmediately: true,
  },
  {
    type: 'slider',
    id: 'scrollSensitivity',
    label: 'Scroll sensitivity',
    category: 'touch',
    default: 1,
    slider: { min: 0.25, max: 2, step: 0.25, suffix: 'x' },
    applyImmediately: true,
  },
  {
    type: 'segmented',
    id: 'virtualJoystick',
    label: 'Virtual joystick',
    category: 'touch',
    default: 'off',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
    ],
    applyImmediately: true,
  },
  {
    type: 'slider',
    id: 'deadZone',
    label: 'Dead zone radius',
    category: 'touch',
    default: 8,
    slider: { min: 0, max: 48, step: 4, suffix: 'px' },
    help: 'Inner radius where input is ignored.',
    applyImmediately: true,
  },
  { type: 'section', id: 'section_display', label: 'Display', category: 'display', default: false },
  {
    type: 'slider',
    id: 'buttonSize',
    label: 'Button size',
    category: 'display',
    default: 48,
    slider: { min: 24, max: 96, step: 8, suffix: 'px' },
    applyImmediately: true,
  },
  {
    type: 'slider',
    id: 'buttonSpacing',
    label: 'Button spacing',
    category: 'display',
    default: 12,
    slider: { min: 0, max: 32, step: 4, suffix: 'px' },
    applyImmediately: true,
  },
  {
    type: 'slider',
    id: 'touchOpacity',
    label: 'Touch zone opacity',
    category: 'display',
    default: 0.4,
    slider: { min: 0.1, max: 1, step: 0.1, suffix: '' },
    applyImmediately: true,
  },
  { type: 'section', id: 'section_actions', label: 'Actions', category: 'actions', default: false },
  {
    type: 'action',
    id: 'restoreDefaults',
    label: 'Restore defaults',
    category: 'actions',
    default: false,
    actionLabel: 'Restore defaults',
  },
];

export const playgroundSchema: SettingsSchema = {
  categories: playgroundCategories.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  definitions: playgroundDefinitions,
  version: 1,
};
