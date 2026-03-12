import type { SectionSettingDefinition } from '../../types.js';
import type { ControlContext, ControlResult, SettingControlProps } from '../types.js';

export function createSectionHeader(
  ctx: ControlContext,
  props: SettingControlProps<SectionSettingDefinition>
): ControlResult {
  const { scene, theme } = ctx;
  const { definition } = props;
  const bg = scene.add.graphics();
  const label = scene.add.text(theme.paddingHorizontal, theme.sectionHeaderHeight / 2, definition.label, {
    fontSize: theme.sectionHeaderFontSize,
    color: theme.sectionHeaderColor,
    fontFamily: 'monospace',
  }).setOrigin(0, 0.5);

  if (theme.sectionBackgroundColor !== undefined) {
    bg.fillStyle(theme.sectionBackgroundColor, 0.6);
    bg.fillRect(0, 0, 2000, theme.sectionHeaderHeight);
  }

  const container = scene.add.container(0, 0, [bg, label]);
  container.setSize(2000, theme.sectionHeaderHeight);
  return { container };
}
