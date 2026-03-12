/**
 * Data-driven game settings — value types and schema.
 * Logic and layout are independent of visual style; theming is applied separately.
 */

/** Primitive value stored for a setting. */
export type SettingValue = string | number | boolean;

/** Control types supported by the settings UI. */
export type SettingControlType =
  | 'toggle'
  | 'slider'
  | 'select'
  | 'segmented'
  | 'action'
  | 'section';

/**
 * Condition for visibility or enabled state.
 * - string: another setting's id; visible/enabled when that setting's value is truthy.
 * - Function: (getValue) => boolean for custom logic (e.g. "mobile only").
 */
export type SettingCondition = string | ((getValue: (id: string) => SettingValue | undefined) => boolean);

/** Slider constraints. */
export interface SliderConstraints {
  min: number;
  max: number;
  step: number;
  /** Optional unit or suffix, e.g. "%" */
  suffix?: string;
}

/** Option for select or segmented control. */
export interface SettingOption {
  value: string | number | boolean;
  label: string;
}

/**
 * Definition of a single setting (metadata/schema).
 * Used to build the UI and validate stored values.
 */
export interface SettingDefinitionBase {
  id: string;
  label: string;
  category: string;
  /** Optional helper text shown under the control */
  help?: string;
  /** Default value; used when no saved value exists */
  default: SettingValue;
  /** If true, changes take effect immediately; otherwise may require Apply */
  applyImmediately?: boolean;
  /** If true, UI can show "restart required" hint */
  requiresRestart?: boolean;
  /** When falsy, this setting is hidden from the list */
  visibleWhen?: SettingCondition;
  /** When falsy, control is shown but disabled */
  enabledWhen?: SettingCondition;
}

export interface ToggleSettingDefinition extends SettingDefinitionBase {
  type: 'toggle';
  default: boolean;
}

export interface SliderSettingDefinition extends SettingDefinitionBase {
  type: 'slider';
  default: number;
  slider: SliderConstraints;
}

export interface SelectSettingDefinition extends SettingDefinitionBase {
  type: 'select';
  default: string | number | boolean;
  options: SettingOption[];
}

export interface SegmentedSettingDefinition extends SettingDefinitionBase {
  type: 'segmented';
  default: string | number | boolean;
  options: SettingOption[];
}

export interface ActionSettingDefinition extends SettingDefinitionBase {
  type: 'action';
  /** Action buttons don't store a value; default is ignored for persistence */
  default: boolean;
  /** Label for the button */
  actionLabel: string;
  /** Optional confirmation message before running the action */
  confirmMessage?: string;
}

export interface SectionSettingDefinition extends SettingDefinitionBase {
  type: 'section';
  /** Section header only; no control, no stored value */
  default: boolean;
}

export type SettingDefinition =
  | ToggleSettingDefinition
  | SliderSettingDefinition
  | SelectSettingDefinition
  | SegmentedSettingDefinition
  | ActionSettingDefinition
  | SectionSettingDefinition;

/** Category shown as a group in the UI. */
export interface SettingCategory {
  id: string;
  label: string;
  /** Optional order weight; lower = higher in list. */
  order?: number;
}

/** Full schema: categories and definitions. Optional version for migrations. */
export interface SettingsSchema {
  categories: SettingCategory[];
  definitions: SettingDefinition[];
  /** Optional; used with migrate() when present. */
  version?: number;
}

/** Theme data for rendering. No logic; only layout and style hints. */
export interface SettingsTheme {
  rowHeight: number;
  sectionHeaderHeight: number;
  paddingHorizontal: number;
  paddingVertical: number;
  gapBetweenRows: number;
  gapBetweenSections: number;
  labelFontSize: string;
  labelColor: string;
  helpFontSize: string;
  helpColor: string;
  sectionHeaderFontSize: string;
  sectionHeaderColor: string;
  controlHeight: number;
  rowBackgroundColor?: number;
  sectionBackgroundColor?: number;
}
