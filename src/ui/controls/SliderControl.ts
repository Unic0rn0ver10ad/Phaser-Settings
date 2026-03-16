import Phaser from 'phaser';
import type { SliderSettingDefinition } from '../../types.js';
import type { ControlContext, ControlResult, SettingControlProps } from '../types.js';

const SLIDER_TRACK_HEIGHT = 8;
const SLIDER_THUMB_RADIUS = 10;
const TRACK_COLOR = 0x444466;
const FILL_COLOR = 0x4fc3f7;
const THUMB_COLOR = 0xe0e0e0;

export function createSliderControl(
  ctx: ControlContext,
  props: SettingControlProps<SliderSettingDefinition>
): ControlResult {
  const { scene, theme, controlWidth } = ctx;
  const { definition, value, disabled, onChange } = props;
  const { slider } = definition;
  const numVal = Number(value);
  const range = slider.max - slider.min;
  const trackWidth = Math.max(80, controlWidth - 20);

  let current = Math.max(slider.min, Math.min(slider.max, Number.isNaN(numVal) ? slider.min : numVal));
  let pct = range === 0 ? 0 : (current - slider.min) / range;
  let dragging = false;
  let dragPointerId: number | null = null;

  const trackBg = scene.add.graphics();
  const trackFill = scene.add.graphics();
  const thumb = scene.add.graphics();
  const valueText = scene.add.text(trackWidth + 8, theme.controlHeight / 2, formatSliderValue(current, slider.suffix), {
    fontSize: theme.helpFontSize,
    color: theme.helpColor,
    fontFamily: 'monospace',
  }).setOrigin(0, 0.5);

  function draw() {
    trackBg.clear();
    trackBg.fillStyle(disabled ? 0x333344 : TRACK_COLOR, 1);
    trackBg.fillRoundedRect(0, (theme.controlHeight - SLIDER_TRACK_HEIGHT) / 2, trackWidth, SLIDER_TRACK_HEIGHT, 4);
    trackFill.clear();
    trackFill.fillStyle(disabled ? 0x555566 : FILL_COLOR, 1);
    trackFill.fillRoundedRect(0, (theme.controlHeight - SLIDER_TRACK_HEIGHT) / 2, trackWidth * pct, SLIDER_TRACK_HEIGHT, 4);
    thumb.clear();
    thumb.fillStyle(THUMB_COLOR, 1);
    thumb.fillCircle(trackWidth * pct, theme.controlHeight / 2, SLIDER_THUMB_RADIUS);
    valueText.setText(formatSliderValue(current, slider.suffix));
  }
  draw();

  function applyPointer(ptrX: number) {
    const mat = container.getWorldTransformMatrix();
    const localX = ptrX - mat.tx;
    const newPct = Phaser.Math.Clamp(localX / trackWidth, 0, 1);
    const raw = slider.min + newPct * range;
    const stepped = Math.round(raw / slider.step) * slider.step;
    current = Math.max(slider.min, Math.min(slider.max, stepped));
    pct = range === 0 ? 0 : (current - slider.min) / range;
    draw();
    onChange(current);
  }

  const endDrag = () => {
    if (dragging) scene.events.emit('settings:scrollUnblock');
    dragging = false;
    dragPointerId = null;
  };

  const zone = scene.add.zone(trackWidth / 2, theme.controlHeight / 2, trackWidth, theme.controlHeight)
    .setInteractive({ useHandCursor: true });
  if (!disabled) {
    zone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      dragging = true;
      dragPointerId = ptr.id;
      scene.events.emit('settings:scrollBlock');
      applyPointer(ptr.x);
    });
    zone.on('pointerup', endDrag);
    zone.on('pointerout', endDrag);
    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (dragging && dragPointerId !== null && ptr.id === dragPointerId) applyPointer(ptr.x);
    });
    scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (dragging && (dragPointerId === null || ptr.id === dragPointerId)) endDrag();
    });
  }

  const container = scene.add.container(0, 0, [trackBg, trackFill, thumb, valueText, zone]);
  return { container, focusTarget: zone };
}

function formatSliderValue(n: number, suffix?: string): string {
  const s = n % 1 === 0 ? String(n) : n.toFixed(2);
  return suffix ? `${s}${suffix}` : s;
}
