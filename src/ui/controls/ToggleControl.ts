import type { ToggleSettingDefinition } from '../../types.js';
import type { ControlContext, ControlResult, SettingControlProps } from '../types.js';

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const THUMB_RADIUS = 10;
const TRACK_COLOR_OFF = 0x444466;
const TRACK_COLOR_ON = 0x2e7d32;
const THUMB_COLOR = 0xe0e0e0;

export function createToggleControl(
  ctx: ControlContext,
  props: SettingControlProps<ToggleSettingDefinition>
): ControlResult {
  const { scene, theme } = ctx;
  const { value, disabled, onChange } = props;
  let on = Boolean(value);

  const track = scene.add.graphics();
  const thumb = scene.add.graphics();
  const draw = () => {
    track.clear();
    track.fillStyle(disabled ? 0x333344 : on ? TRACK_COLOR_ON : TRACK_COLOR_OFF, 1);
    track.fillRoundedRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT, TRACK_HEIGHT / 2);
    thumb.clear();
    thumb.fillStyle(THUMB_COLOR, 1);
    const cx = on ? TRACK_WIDTH - THUMB_RADIUS - 2 : THUMB_RADIUS + 2;
    thumb.fillCircle(cx, TRACK_HEIGHT / 2, THUMB_RADIUS);
  };
  draw();

  const zone = scene.add.zone(TRACK_WIDTH / 2, theme.controlHeight / 2, TRACK_WIDTH, theme.controlHeight)
    .setInteractive({ useHandCursor: true });
  if (!disabled) {
    zone.on('pointerdown', () => {
      on = !on;
      draw();
      onChange(on);
    });
  }

  const container = scene.add.container(0, 0, [track, thumb, zone]);
  return { container };
}
