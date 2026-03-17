/**
 * Builds a scrollable list of setting rows from schema + current values.
 * When manager is not provided, uses SettingsManager.getInstance(); ensure create() was called at bootstrap.
 */
import type { SettingDefinition, SettingValue, SettingsTheme } from '../types.js';
import type { ControlContext, ControlResult } from './types.js';
import { SettingsManager } from '../SettingsManager.js';
import { defaultSettingsTheme } from './SettingsTheme.js';
import * as controls from './controls/index.js';

export interface SettingsListRendererOptions {
  scene: Phaser.Scene;
  theme?: Partial<SettingsTheme>;
  listWidth: number;
  /** When provided, this manager is used for schema, visibility, and updates. Otherwise getInstance() is used. */
  manager?: SettingsManager;
  onAction?: (settingId: string) => void;
}

export interface RenderedRow {
  container: Phaser.GameObjects.Container;
  definition: SettingDefinition;
  controlResult?: ControlResult;
}

export function renderSettingsList(options: SettingsListRendererOptions): {
  rows: RenderedRow[];
  rowYs: number[];
  totalHeight: number;
} {
  const { scene, listWidth, onAction } = options;
  const theme: SettingsTheme = { ...defaultSettingsTheme, ...options.theme };
  const manager = options.manager ?? SettingsManager.getInstance();
  const schema = manager.getSchema();

  const controlWidth = Math.floor(listWidth * 0.45);
  const ctx: ControlContext = { scene, theme, controlWidth, listWidth };

  const rows: RenderedRow[] = [];
  const rowYs: number[] = [];
  let y = theme.paddingVertical;
  const labelWidth = listWidth - controlWidth - theme.paddingHorizontal * 2 - 16;

  for (const def of schema.definitions) {
    if (!manager.isVisible(def)) continue;

    const isSection = def.type === 'section';
    const isAction = def.type === 'action';
    const disabled = !manager.isEnabled(def);
    const value = isSection || isAction ? false : manager.getOrDefault(def.id);

    if (isSection) {
      const result = controls.createSectionHeader(ctx, {
        definition: def,
        value: false,
        disabled: false,
        onChange: () => {},
      });
      result.container.setPosition(0, y);
      rows.push({ container: result.container, definition: def });
      rowYs.push(y);
      y += theme.sectionHeaderHeight + theme.gapBetweenSections;
      continue;
    }

    const rowHeight = theme.rowHeight + (def.help ? theme.controlHeight * 0.5 : 0);
    const rowContainer = scene.add.container(0, y);

    const label = scene.add.text(theme.paddingHorizontal, theme.rowHeight / 2, def.label, {
      fontSize: theme.labelFontSize,
      color: disabled ? theme.helpColor : theme.labelColor,
      fontFamily: theme.labelFontFamily ?? theme.fontFamily ?? 'monospace',
      wordWrap: { width: labelWidth },
    }).setOrigin(0, 0.5);
    rowContainer.add(label);

    let controlResult: ControlResult;
    const onChange = (v: SettingValue) => manager.set(def.id, v);
    const onActionCb = isAction && onAction ? () => onAction(def.id) : undefined;

    switch (def.type) {
      case 'toggle':
        controlResult = controls.createToggleControl(ctx, {
          definition: def,
          value: value as boolean,
          disabled,
          onChange,
        });
        break;
      case 'slider':
        controlResult = controls.createSliderControl(ctx, {
          definition: def,
          value: value as number,
          disabled,
          onChange,
        });
        break;
      case 'select':
        controlResult = controls.createSelectControl(ctx, {
          definition: def,
          value,
          disabled,
          onChange,
        });
        break;
      case 'segmented':
        controlResult = controls.createSegmentedControl(ctx, {
          definition: def,
          value,
          disabled,
          onChange,
        });
        break;
      case 'action':
        controlResult = controls.createActionControl(ctx, {
          definition: def,
          value: false,
          disabled,
          onChange: () => {},
          onAction: onActionCb,
        });
        break;
      default:
        continue;
    }

    controlResult.container.setPosition(listWidth - theme.paddingHorizontal - controlWidth, 0);
    rowContainer.add(controlResult.container);

    if (def.help) {
      const helpText = scene.add.text(theme.paddingHorizontal, theme.rowHeight + 4, def.help, {
        fontSize: theme.helpFontSize,
        color: theme.helpColor,
        fontFamily: theme.helpFontFamily ?? theme.fontFamily ?? 'monospace',
        wordWrap: { width: labelWidth + controlWidth },
      }).setOrigin(0, 0);
      rowContainer.add(helpText);
    }

    if (theme.rowBackgroundColor !== undefined) {
      const rowBg = scene.add.graphics();
      rowBg.fillStyle(theme.rowBackgroundColor, 0.5);
      rowBg.fillRect(0, -theme.gapBetweenRows / 2, listWidth, rowHeight + theme.gapBetweenRows);
      rowContainer.addAt(rowBg, 0);
    }

    rows.push({ container: rowContainer, definition: def, controlResult });
    rowYs.push(y);
    y += rowHeight + theme.gapBetweenRows;
  }

  const totalHeight = y + theme.paddingVertical;
  return { rows, rowYs, totalHeight };
}
