import type { SegmentedSettingDefinition } from '../../types.js';
import type { ControlContext, ControlResult, SettingControlProps } from '../types.js';

const SEGMENT_COLOR = 0x333355;
const SEGMENT_ACTIVE = 0x2e7d32;
const SEGMENT_HOVER = 0x444466;

export function createSegmentedControl(
  ctx: ControlContext,
  props: SettingControlProps<SegmentedSettingDefinition>
): ControlResult {
  const { scene, theme, controlWidth } = ctx;
  const { definition, value, disabled, onChange } = props;
  const count = definition.options.length;
  const segmentWidth = Math.max(40, (controlWidth - (count - 1) * 2) / count);
  const gap = 2;

  const children: Phaser.GameObjects.GameObject[] = [];
  definition.options.forEach((opt, i) => {
    const active = opt.value === value;
    const bg = scene.add.graphics();
    const label = scene.add.text(
      i * (segmentWidth + gap) + segmentWidth / 2,
      theme.controlHeight / 2,
      opt.label,
      { fontSize: theme.helpFontSize, color: active ? '#ffffff' : theme.helpColor, fontFamily: 'monospace' }
    ).setOrigin(0.5);

    const draw = (hover: boolean) => {
      bg.clear();
      const col = disabled ? 0x2a2a3a : active ? SEGMENT_ACTIVE : hover ? SEGMENT_HOVER : SEGMENT_COLOR;
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(i * (segmentWidth + gap), 0, segmentWidth, theme.controlHeight, 4);
    };
    draw(false);

    const zone = scene.add.zone(
      i * (segmentWidth + gap) + segmentWidth / 2,
      theme.controlHeight / 2,
      segmentWidth,
      theme.controlHeight
    ).setInteractive({ useHandCursor: true });
    if (!disabled) {
      zone.on('pointerover', () => draw(true));
      zone.on('pointerout', () => draw(false));
      zone.on('pointerdown', () => onChange(opt.value));
    }
    children.push(bg, label, zone);
  });

  const container = scene.add.container(0, 0, children);
  return { container, focusTarget: container };
}
