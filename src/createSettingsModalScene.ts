/**
 * Factory that returns a Phaser.Scene class for the settings modal.
 * App registers the returned class with a scene key and launches it (e.g. scene.launch('SettingsScene')).
 * App is responsible for initializing SettingsManager.create() before registering this scene.
 */
import Phaser from 'phaser';
import type { SettingsManager } from './SettingsManager.js';
import type { SettingsTheme } from './types.js';
import { renderSettingsList } from './ui/SettingsListRenderer.js';
import type { RenderedRow } from './ui/SettingsListRenderer.js';
import { VERSION } from './version.js';

const SCROLL_SPEED = 24;
const MODAL_MARGIN = 24;
const MODAL_BORDER = 10;
const MODAL_RADIUS = 16;
const OVERLAY_ALPHA = 0.6;
const PANEL_FILL = 0x0d1326;
const PANEL_BORDER_COLOR = 0x4fc3f7;
const CLOSE_BUTTON_SIZE = 36;
const CLOSE_BUTTON_INSET = 12;
const SCREEN_PADDING = 16;
const DEFAULT_TITLE = 'SETTINGS';

export interface CreateSettingsModalSceneOptions {
  /** Manager must already be initialized (SettingsManager.create() at bootstrap). */
  manager: SettingsManager;
  theme?: Partial<SettingsTheme>;
  title?: string;
  /** Called when user triggers an action (e.g. restoreDefaults, deleteSave, credits). App handles confirm, side effects, then requestClose() and/or navigation. */
  onAction?: (args: {
    settingId: string;
    manager: SettingsManager;
    scene: Phaser.Scene;
    requestClose: () => void;
  }) => void;
  /** Called when modal is closed (click outside, ESC, or X). Receives scene so app can e.g. play sound. Scene then stops. */
  onClose?: (scene: Phaser.Scene) => void;
  /** Phaser scene key. Default 'SettingsScene'. */
  sceneKey?: string;
}

export function createSettingsModalScene(options: CreateSettingsModalSceneOptions): typeof Phaser.Scene {
  const opts = options;
  const sceneKey = opts.sceneKey ?? 'SettingsScene';

  const DRAG_THRESHOLD_PX = 4;

  class SettingsModalScene extends Phaser.Scene {
    private settingsRows: RenderedRow[] = [];
    private settingsRowYs: number[] = [];
    private settingsListX = 0;
    private settingsListYBase = 0;
    private scrollY = 0;
    private maxScroll = 0;
    private viewportHeight = 0;
    /** Touch/drag scroll: start Y, start scrollY, pointer id, and whether we actually scrolled (to avoid stealing taps). */
    private scrollDrag: { startY: number; startScrollY: number; pointerId: number; didDrag: boolean } | null = null;

    constructor() {
      super({ key: sceneKey });
    }

    init(_data?: Record<string, unknown>) {
      // Launched as overlay; no transition
    }

    create() {
      const W = this.scale.width;
      const H = this.scale.height;

      this.scene.bringToTop(this.scene.key);
      this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

      const panelLeft = MODAL_MARGIN;
      const panelTop = MODAL_MARGIN;
      const panelWidth = W - 2 * MODAL_MARGIN;
      const panelHeight = H - 2 * MODAL_MARGIN;

      const contentLeft = panelLeft + MODAL_BORDER;
      const contentTop = panelTop + MODAL_BORDER;
      const contentWidth = panelWidth - 2 * MODAL_BORDER;
      const contentHeight = panelHeight - 2 * MODAL_BORDER;

      const requestClose = () => {
        opts.onClose?.(this);
        this.scene.stop();
      };

      const overlayGfx = this.add.graphics();
      overlayGfx.fillStyle(0x000000, OVERLAY_ALPHA);
      overlayGfx.fillRect(0, 0, W, H);
      overlayGfx.setDepth(0);

      const overlayZone = this.add.zone(W / 2, H / 2, W, H).setInteractive(
        new Phaser.Geom.Rectangle(0, 0, W, H),
        (_hitArea: Phaser.Geom.Rectangle, x: number, y: number) => {
          return !(
            x >= panelLeft && x <= panelLeft + panelWidth &&
            y >= panelTop && y <= panelTop + panelHeight
          );
        }
      );
      overlayZone.on('pointerdown', () => requestClose());
      overlayZone.setDepth(0);

      const panelBg = this.add.graphics();
      panelBg.fillStyle(PANEL_FILL, 0.98);
      panelBg.fillRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, MODAL_RADIUS);
      panelBg.lineStyle(MODAL_BORDER, PANEL_BORDER_COLOR, 1);
      panelBg.strokeRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, MODAL_RADIUS);
      panelBg.setDepth(1);

      const titleY = contentTop + 28;
      const title = opts.title ?? DEFAULT_TITLE;
      this.add.text(panelLeft + contentWidth / 2, titleY, title, {
        fontSize: W < 400 ? '22px' : '26px',
        color: '#4fc3f7',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(2);

      const closeX = panelLeft + panelWidth - MODAL_BORDER - CLOSE_BUTTON_INSET - CLOSE_BUTTON_SIZE / 2;
      const closeY = contentTop + CLOSE_BUTTON_SIZE / 2 + CLOSE_BUTTON_INSET;
      this.createCloseButton(closeX, closeY, requestClose);

      const listAreaTop = titleY + 32;
      const listAreaHeight = contentTop + contentHeight - listAreaTop - MODAL_BORDER;
      const listWidth = Math.min(contentWidth - 2 * SCREEN_PADDING, Math.max(200, W - 2 * MODAL_MARGIN - 2 * SCREEN_PADDING));
      this.viewportHeight = Math.max(100, listAreaHeight - 24);

      const { rows, rowYs, totalHeight } = renderSettingsList({
        scene: this,
        listWidth,
        viewportHeight: this.viewportHeight,
        theme: opts.theme,
        onAction: (id) => {
          opts.onAction?.({
            settingId: id,
            manager: opts.manager,
            scene: this,
            requestClose,
          });
        },
      });
      this.settingsRows = rows;
      this.settingsRowYs = rowYs;
      this.settingsListX = contentLeft + SCREEN_PADDING;
      this.settingsListYBase = listAreaTop + 8;
      this.maxScroll = Math.max(0, totalHeight - this.viewportHeight);

      const maskGraphics = this.add.graphics().setVisible(false);
      maskGraphics.fillStyle(0xffffff, 1);
      maskGraphics.fillRect(this.settingsListX, this.settingsListYBase, listWidth, this.viewportHeight);
      const listMask = maskGraphics.createGeometryMask();

      rows.forEach((r, i) => {
        r.container.setPosition(this.settingsListX, this.settingsListYBase + rowYs[i]);
        r.container.setDepth(2);
        r.container.setMask(listMask);
      });

      this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
        this.applyScroll(dy);
      });

      // Touch/drag scrolling: use scene-level pointer events with list bounds so touch always works
      // (a zone on top can miss touches on some devices; bounds check is reliable)
      const listLeft = this.settingsListX;
      const listTop = this.settingsListYBase;
      const listRight = listLeft + listWidth;
      const listBottom = listTop + this.viewportHeight;
      const isInListBounds = (x: number, y: number) =>
        x >= listLeft && x <= listRight && y >= listTop && y <= listBottom;

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!isInListBounds(pointer.x, pointer.y)) return;
        this.scrollDrag = {
          startY: pointer.y,
          startScrollY: this.scrollY,
          pointerId: pointer.id,
          didDrag: false,
        };
      });

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!this.scrollDrag || pointer.id !== this.scrollDrag.pointerId) return;
        const deltaY = this.scrollDrag.startY - pointer.y;
        if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) this.scrollDrag.didDrag = true;
        const newScrollY = Phaser.Math.Clamp(
          this.scrollDrag.startScrollY + deltaY,
          0,
          this.maxScroll
        );
        this.setScrollY(newScrollY);
        this.scrollDrag.startY = pointer.y;
        this.scrollDrag.startScrollY = this.scrollY;
      });

      const clearScrollDrag = (pointer: Phaser.Input.Pointer) => {
        if (!this.scrollDrag || pointer.id !== this.scrollDrag.pointerId) return;
        this.scrollDrag = null;
      };

      this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => clearScrollDrag(pointer));
      this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => clearScrollDrag(pointer));
      this.input.on('pointerout', (pointer: Phaser.Input.Pointer) => clearScrollDrag(pointer));
      this.input.on('gameout', () => { this.scrollDrag = null; });

      const keys = this.input.keyboard?.addKeys('UP,DOWN,ESC');
      if (keys && 'UP' in keys && 'DOWN' in keys && 'ESC' in keys) {
        (keys.UP as Phaser.Input.Keyboard.Key).on('down', () => this.applyScroll(-SCROLL_SPEED));
        (keys.DOWN as Phaser.Input.Keyboard.Key).on('down', () => this.applyScroll(SCROLL_SPEED));
        (keys.ESC as Phaser.Input.Keyboard.Key).on('down', () => requestClose());
      }

      const versionLabel = `phaser-settings v${VERSION}`;
      this.add.text(panelLeft + panelWidth / 2, panelTop + panelHeight - 14, versionLabel, {
        fontSize: '12px',
        color: '#6b7a99',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 1).setDepth(2);
    }

    private setScrollY(y: number) {
      this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
      this.settingsRows.forEach((r, i) => {
        r.container.setPosition(
          this.settingsListX,
          this.settingsListYBase + this.settingsRowYs[i] - this.scrollY
        );
      });
    }

    private applyScroll(delta: number) {
      this.setScrollY(this.scrollY + delta);
    }

    private createCloseButton(x: number, y: number, onClick: () => void) {
      const size = CLOSE_BUTTON_SIZE;
      const bg = this.add.graphics();
      const draw = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? 0x333366 : 0x1a237e, 1);
        bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 8);
        bg.lineStyle(2, 0x4fc3f7, 1);
        bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 8);
      };
      draw(false);
      bg.setDepth(2);

      const pad = 10;
      const line = this.add.graphics();
      line.lineStyle(2, 0xe0e0e0, 1);
      line.lineBetween(x - size / 2 + pad, y - size / 2 + pad, x + size / 2 - pad, y + size / 2 - pad);
      line.lineBetween(x + size / 2 - pad, y - size / 2 + pad, x - size / 2 + pad, y + size / 2 - pad);
      line.setDepth(2);

      const zone = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true });
      zone.setDepth(3);
      zone.on('pointerover', () => draw(true));
      zone.on('pointerout', () => draw(false));
      zone.on('pointerdown', () => onClick());
    }
  }

  return SettingsModalScene as typeof Phaser.Scene;
}
