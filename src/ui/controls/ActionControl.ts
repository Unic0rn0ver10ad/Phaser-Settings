import type { ActionSettingDefinition } from '../../types.js';
import type { ControlContext, ControlResult, SettingControlProps } from '../types.js';

const BUTTON_COLOR = 0x1a237e;
const BUTTON_HOVER = 0x283593;
const BUTTON_PRESSED = 0x0d1542;

export function createActionControl(
  ctx: ControlContext,
  props: SettingControlProps<ActionSettingDefinition>
): ControlResult {
  const { scene, theme, controlWidth } = ctx;
  const { definition, disabled, onAction } = props;
  const w = Math.min(controlWidth, 200);
  const h = theme.controlHeight;

  const bg = scene.add.graphics();
  const text = scene.add.text(w / 2, h / 2, definition.actionLabel, {
    fontSize: theme.labelFontSize,
    color: '#ffffff',
    fontFamily: 'monospace',
  }).setOrigin(0.5);

  let isHover = false;
  let isPressed = false;
  const draw = () => {
    bg.clear();
    const col = disabled ? 0x2a2a3a : isPressed ? BUTTON_PRESSED : isHover ? BUTTON_HOVER : BUTTON_COLOR;
    bg.fillStyle(col, 1);
    bg.fillRoundedRect(0, 0, w, h, 8);
  };
  draw();

  const zone = scene.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
  if (!disabled) {
    zone.on('pointerover', () => { isHover = true; draw(); });
    zone.on('pointerout', () => { isHover = false; isPressed = false; draw(); });
    zone.on('pointerdown', () => { isPressed = true; draw(); });
    zone.on('pointerup', () => {
      const wasPressed = isPressed;
      isPressed = false;
      draw();
      if (wasPressed && onAction) onAction();
    });
  }

  const container = scene.add.container(0, 0, [bg, text, zone]);
  return { container };
}
