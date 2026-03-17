import type Phaser from 'phaser';
import type { SelectSettingDefinition } from '../../types.js';
import type { ControlContext, ControlResult, SettingControlProps } from '../types.js';

const OPTION_HEIGHT = 32;
const DROPDOWN_COLOR = 0x333355;
const DROPDOWN_HOVER = 0x444466;
const TEXT_COLOR = '#e0e0e0';

export function createSelectControl(
  ctx: ControlContext,
  props: SettingControlProps<SelectSettingDefinition>
): ControlResult {
  const { scene, theme, controlWidth } = ctx;
  const { definition, value, disabled, onChange } = props;
  if (definition.options.length === 0) {
    const container = scene.add.container(0, 0, []);
    return { container };
  }
  const selectedOption = definition.options.find((o) => o.value === value) ?? definition.options[0];

  const bg = scene.add.graphics();
  const text = scene.add.text(8, theme.controlHeight / 2, String(selectedOption.label), {
    fontSize: theme.labelFontSize,
    color: TEXT_COLOR,
    fontFamily: theme.controlFontFamily ?? theme.fontFamily ?? 'monospace',
    wordWrap: { width: controlWidth - 32 },
  }).setOrigin(0, 0.5);

  const w = Math.min(controlWidth, 180);
  const h = theme.controlHeight;
  const drawBg = (hover: boolean) => {
    bg.clear();
    bg.fillStyle(disabled ? 0x2a2a3a : hover ? DROPDOWN_HOVER : DROPDOWN_COLOR, 1);
    bg.fillRoundedRect(0, 0, w, h, 6);
  };
  drawBg(false);

  const zone = scene.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
  const container = scene.add.container(0, 0, [bg, text, zone]);

  if (!disabled) {
    let open = false;
    let dropdownContainer: Phaser.GameObjects.Container | null = null;

    const destroyDropdown = () => {
      if (dropdownContainer) {
        dropdownContainer.destroy(true);
        dropdownContainer = null;
      }
      open = false;
    };

    zone.on('pointerover', () => drawBg(true));
    zone.on('pointerout', () => drawBg(false));
    zone.on('pointerdown', () => {
      if (open) {
        destroyDropdown();
        return;
      }

      const mat = container.getWorldTransformMatrix();
      const worldX = mat.tx;
      const worldY = mat.ty;
      const dropdownY = worldY + h + 4;
      const totalH = definition.options.length * OPTION_HEIGHT;

      dropdownContainer = scene.add.container(worldX, dropdownY);
      dropdownContainer.setDepth(20);

      const dropBg = scene.add.graphics();
      dropBg.fillStyle(0x1a1a2e, 0.98);
      dropBg.fillRoundedRect(0, 0, w, totalH, 6);
      dropBg.lineStyle(1, 0x4fc3f7);
      dropBg.strokeRoundedRect(0, 0, w, totalH, 6);
      dropdownContainer.add(dropBg);

      const dropdownHitSet = new Set<Phaser.GameObjects.GameObject>([dropdownContainer, dropBg]);

      definition.options.forEach((opt, i) => {
        const optY = i * OPTION_HEIGHT;
        const optText = scene.add.text(8, optY + OPTION_HEIGHT / 2, opt.label, {
          fontSize: theme.helpFontSize,
          color: opt.value === value ? '#4fc3f7' : TEXT_COLOR,
          fontFamily: theme.controlFontFamily ?? theme.fontFamily ?? 'monospace',
        }).setOrigin(0, 0.5);
        dropdownContainer!.add(optText);
        dropdownHitSet.add(optText);

        const optZone = scene.add.zone(w / 2, optY + OPTION_HEIGHT / 2, w, OPTION_HEIGHT)
          .setInteractive({ useHandCursor: true });
        optZone.on('pointerdown', () => {
          onChange(opt.value);
          text.setText(opt.label);
          destroyDropdown();
        });
        dropdownContainer!.add(optZone);
        dropdownHitSet.add(optZone);
      });

      open = true;

      scene.time.delayedCall(0, () => {
        scene.input.once('pointerdown', (_ptr: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
          if (!open) return;
          const hitDropdown = currentlyOver && currentlyOver.some((obj) => dropdownHitSet.has(obj));
          if (!hitDropdown) destroyDropdown();
        });
      });
    });
  }

  return { container };
}
