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
  if (definition.options.length === 0) {
    const container = scene.add.container(0, 0, []);
    return { container };
  }
  const count = definition.options.length;
  const segmentWidth = Math.max(40, (controlWidth - (count - 1) * 2) / count);
  const gap = 2;

  let currentValue: string | number | boolean = value;
  let hoveredIndex = -1;
  let refreshScheduled = false;

  const segments: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; opt: { value: string | number | boolean; label: string }; update: (active: boolean, hover: boolean) => void }[] = [];
  const children: Phaser.GameObjects.GameObject[] = [];

  const refreshAll = () => {
    segments.forEach((seg, idx) => {
      seg.update(seg.opt.value === currentValue, idx === hoveredIndex);
    });
  };

  const scheduleRefresh = () => {
    if (refreshScheduled) return;
    refreshScheduled = true;
    scene.time.delayedCall(0, () => {
      refreshScheduled = false;
      refreshAll();
    });
  };

  definition.options.forEach((opt, i) => {
    const bg = scene.add.graphics();
    const label = scene.add.text(
      i * (segmentWidth + gap) + segmentWidth / 2,
      theme.controlHeight / 2,
      opt.label,
      { fontSize: theme.helpFontSize, color: theme.helpColor, fontFamily: theme.controlFontFamily ?? theme.fontFamily ?? 'monospace' }
    ).setOrigin(0.5);

    const update = (active: boolean, hover: boolean) => {
      label.setColor(active ? '#ffffff' : theme.helpColor);
      bg.clear();
      const col = disabled ? 0x2a2a3a : active ? SEGMENT_ACTIVE : hover ? SEGMENT_HOVER : SEGMENT_COLOR;
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(i * (segmentWidth + gap), 0, segmentWidth, theme.controlHeight, 4);
    };

    segments.push({ bg, label, opt, update });
    children.push(bg, label);

    const zone = scene.add.zone(
      i * (segmentWidth + gap) + segmentWidth / 2,
      theme.controlHeight / 2,
      segmentWidth,
      theme.controlHeight
    ).setInteractive({ useHandCursor: true });
    children.push(zone);

    if (!disabled) {
      zone.on('pointerover', () => { hoveredIndex = i; scheduleRefresh(); });
      zone.on('pointerout', () => { hoveredIndex = -1; scheduleRefresh(); });
      zone.on('pointerdown', () => { hoveredIndex = i; scheduleRefresh(); });
      zone.on('pointerup', () => {
        onChange(opt.value);
        currentValue = opt.value;
        refreshAll();
      });
    }
  });

  refreshAll();

  const container = scene.add.container(0, 0, children);
  return { container };
}
