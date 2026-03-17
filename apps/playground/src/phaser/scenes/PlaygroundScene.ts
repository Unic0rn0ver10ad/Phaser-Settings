import Phaser from 'phaser';
import { SettingsManager } from 'phaser-settings';
import type { SettingDefinition, SettingValue } from 'phaser-settings';
import { APP_FONT_FAMILY } from '../../appTheme';

const SCENE_KEY = 'PlaygroundScene';
const SETTINGS_SCENE_KEY = 'SettingsScene';

const TITLE_COLOR = '#4fc3f7';
const STROKE_COLOR = 0x4fc3f7;
const STROKE_WIDTH = 4;
const MARGIN = 16;
const HEADER_BOTTOM = 78;
const BORDER_RADIUS = 12;
const GAME_AREA_STROKE = 0xff9800;
const GAME_BG = 0xe0e0e0;
const HAMBURGER_PAD = 12;
const HAMBURGER_LINE_W = 20;
const HAMBURGER_LINE_H = 2;
const HAMBURGER_GAP = 4;

export class PlaygroundScene extends Phaser.Scene {
  private liveValuesText: Phaser.GameObjects.Text | null = null;
  private buttonMessageText: Phaser.GameObjects.Text | null = null;
  private unsubscribe: (() => void) | null = null;
  private pendingOverlayText: string | null = null;

  constructor() {
    super({ key: SCENE_KEY });
  }

  create() {
    const { width, height } = this.scale;
    const manager = SettingsManager.getInstance();

    this.add
      .text(width / 2, 28, 'Phaser Settings Playground App', {
        fontSize: '22px',
        color: TITLE_COLOR,
        fontFamily: APP_FONT_FAMILY,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 58, 'The right side shows live values from settings. Use the menu to open Settings.', {
        fontSize: '14px',
        color: '#8b9dc3',
        fontFamily: APP_FONT_FAMILY,
        align: 'center',
        wordWrap: { width: width - 48 },
      })
      .setOrigin(0.5);

    const contentLeft = MARGIN + STROKE_WIDTH / 2;
    const contentTop = HEADER_BOTTOM + STROKE_WIDTH / 2;
    const contentWidth = width - 2 * contentLeft;
    const contentHeight = height - contentTop - MARGIN - STROKE_WIDTH / 2;

    const borderGfx = this.add.graphics();
    borderGfx.lineStyle(STROKE_WIDTH, STROKE_COLOR, 1);
    borderGfx.strokeRoundedRect(contentLeft, contentTop, contentWidth, contentHeight, BORDER_RADIUS);

    const gamePad = 8;
    const leftColRight = contentLeft + contentWidth * 0.55;
    const gameLeft = contentLeft + gamePad;
    const gameTop = contentTop + gamePad;
    const gameWidth = leftColRight - contentLeft - gamePad * 2;
    const gameHeight = contentHeight - gamePad * 2;

    const gameBg = this.add.graphics();
    gameBg.fillStyle(GAME_BG, 1);
    gameBg.fillRoundedRect(gameLeft, gameTop, gameWidth, gameHeight, 8);
    gameBg.lineStyle(STROKE_WIDTH, GAME_AREA_STROKE, 1);
    gameBg.strokeRoundedRect(gameLeft, gameTop, gameWidth, gameHeight, 8);

    const hamburgerX = gameLeft + HAMBURGER_PAD;
    const hamburgerY = gameTop + HAMBURGER_PAD;
    const hamburgerGfx = this.add.graphics();
    hamburgerGfx.fillStyle(0x000000, 1);
    for (let i = 0; i < 3; i++) {
      const y = hamburgerY + i * (HAMBURGER_LINE_H + HAMBURGER_GAP);
      hamburgerGfx.fillRect(hamburgerX, y, HAMBURGER_LINE_W, HAMBURGER_LINE_H);
    }
    const hamburgerZone = this.add
      .zone(hamburgerX + HAMBURGER_LINE_W / 2, hamburgerY + (3 * HAMBURGER_LINE_H + 2 * HAMBURGER_GAP) / 2, HAMBURGER_LINE_W + 8, 3 * HAMBURGER_LINE_H + 2 * HAMBURGER_GAP + 8)
      .setInteractive({ useHandCursor: true });
    hamburgerZone.on('pointerdown', () => {
      this.scene.launch(SETTINGS_SCENE_KEY, {
        bounds: { x: gameLeft, y: gameTop, width: gameWidth, height: gameHeight },
      });
    });

    this.add
      .text(gameLeft + gameWidth / 2, gameTop + gameHeight / 2, 'GAME', {
        fontSize: '18px',
        color: '#000000',
        fontFamily: APP_FONT_FAMILY,
      })
      .setOrigin(0.5);

    const rightColLeft = leftColRight + 12;
    const rightPanelWidth = contentWidth - (rightColLeft - contentLeft) - 16;
    const rightCenterX = rightColLeft + rightPanelWidth / 2;
    const rightCenterY = contentTop + contentHeight / 2;

    this.add
      .text(rightCenterX, rightCenterY - 80, 'Live values from settings', {
        fontSize: '14px',
        color: TITLE_COLOR,
        fontFamily: APP_FONT_FAMILY,
      })
      .setOrigin(0.5, 0.5);

    this.liveValuesText = this.add
      .text(rightCenterX, rightCenterY, '', {
        fontSize: '12px',
        color: '#a0aec0',
        fontFamily: APP_FONT_FAMILY,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: rightPanelWidth - 16 },
      })
      .setOrigin(0.5, 0.5);

    this.buttonMessageText = this.add
      .text(rightCenterX, rightCenterY + 100, '', {
        fontSize: '12px',
        color: '#4fc3f7',
        fontFamily: APP_FONT_FAMILY,
        align: 'center',
        wordWrap: { width: rightPanelWidth - 16 },
      })
      .setOrigin(0.5, 0.5);
    this.events.on('buttonPressed', (data: { label: string }) => {
      if (this.buttonMessageText) this.buttonMessageText.setText(`Button pressed: ${data.label}`);
    });

    const sceneRef = this;
    const updateOverlay = () => {
      try {
        const schema = manager.getSchema();
        const valueDefs = schema.definitions.filter(
          (d: SettingDefinition) => d.type !== 'section' && d.type !== 'action'
        );
        const lines = valueDefs.map((def: SettingDefinition) => {
          const v = manager.getOrDefault(def.id);
          const valueStr = formatDisplayValue(def, v);
          return `${def.label}: ${valueStr}`;
        });
        sceneRef.pendingOverlayText = lines.join('\n');
      } catch {
        // ignore
      }
    };

    updateOverlay();
    this.unsubscribe = manager.subscribe(updateOverlay);

    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.liveValuesText = null;
      this.buttonMessageText = null;
      this.pendingOverlayText = null;
    });
  }

  update() {
    if (this.pendingOverlayText !== null) {
      const str = this.pendingOverlayText;
      this.pendingOverlayText = null;
      try {
        this.liveValuesText?.setText(str);
      } catch {
        // scene torn down
      }
    }
  }
}

function formatDisplayValue(def: SettingDefinition, v: SettingValue): string {
  if (def.type === 'select' && 'options' in def && def.options) {
    const opt = def.options.find((o) => o.value === v);
    return opt ? opt.label : String(v);
  }
  if (def.type === 'segmented' && 'options' in def && def.options) {
    const opt = def.options.find((o) => o.value === v);
    return opt ? opt.label : String(v);
  }
  if (def.type === 'slider' && 'slider' in def && def.slider?.suffix) {
    return `${v}${def.slider.suffix}`;
  }
  return String(v);
}
