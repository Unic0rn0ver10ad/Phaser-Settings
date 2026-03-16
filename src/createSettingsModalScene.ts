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

/** When provided, the modal is confined to this rectangle (e.g. game viewport). Enables showing other UI (e.g. live values) outside the modal. */
export interface SettingsModalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateSettingsModalSceneOptions {
  /** Manager must already be initialized (SettingsManager.create() at bootstrap). */
  manager: SettingsManager;
  theme?: Partial<SettingsTheme>;
  title?: string;
  /** When set, overlay and panel are drawn and constrained to this rectangle. Use to open the modal inside a game viewport so the rest of the canvas stays visible. */
  bounds?: SettingsModalBounds;
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
    private settingsListWidth = 0;
    private versionContainer: Phaser.GameObjects.Container | null = null;
    private versionRowY = 0;
    /** Bounds passed via scene.launch(key, { bounds }) when not in options. */
    private launchBounds: SettingsModalBounds | undefined;
    /** Touch/drag scroll: start Y, start scrollY, pointer id, and whether we actually scrolled (to avoid stealing taps). */
    private scrollDrag: { startY: number; startScrollY: number; pointerId: number; didDrag: boolean } | null = null;
    /** While > 0, scroll is suspended (e.g. slider or other control is being dragged). */
    private scrollBlockCount = 0;
    constructor() {
      super({ key: sceneKey });
    }

    init(data?: Record<string, unknown>) {
      if (data && typeof data.bounds === 'object' && data.bounds !== null) {
        const br = data.bounds as Record<string, number>;
        if (typeof br.x === 'number' && typeof br.y === 'number' && typeof br.width === 'number' && typeof br.height === 'number') {
          this.launchBounds = { x: br.x, y: br.y, width: br.width, height: br.height };
        }
      }
    }

    create() {
      const b = opts.bounds ?? this.launchBounds;
      const W = b ? b.width : this.scale.width;
      const H = b ? b.height : this.scale.height;
      const offsetX = b ? b.x : 0;
      const offsetY = b ? b.y : 0;

      this.scene.bringToTop(this.scene.key);
      this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

      const margin = b ? 0 : MODAL_MARGIN;
      const panelLeft = offsetX + margin;
      const panelTop = offsetY + margin;
      const panelWidth = W - 2 * margin;
      const panelHeight = H - 2 * margin;

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
      overlayGfx.fillRect(offsetX, offsetY, W, H);
      overlayGfx.setDepth(0);

      const boundsRect = new Phaser.Geom.Rectangle(offsetX, offsetY, W, H);
      const panelRect = new Phaser.Geom.Rectangle(panelLeft, panelTop, panelWidth, panelHeight);
      const overlayZone = this.add.zone(offsetX + W / 2, offsetY + H / 2, W, H).setInteractive(
        new Phaser.Geom.Rectangle(-W / 2, -H / 2, W, H),
        (_hitArea: Phaser.Geom.Rectangle, x: number, y: number) =>
          Phaser.Geom.Rectangle.Contains(boundsRect, x, y) && !Phaser.Geom.Rectangle.Contains(panelRect, x, y)
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
        theme: opts.theme,
        manager: opts.manager,
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
      this.settingsListWidth = listWidth;

      const versionGap = 24;
      const versionLabel = `phaser-settings v${VERSION}`;
      const versionText = this.add.text(0, 0, versionLabel, {
        fontSize: '12px',
        color: '#6b7a99',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.versionContainer = this.add.container(0, 0);
      this.versionContainer.add(versionText);
      this.versionRowY = totalHeight + versionGap;
      const totalHeightWithVersion = this.versionRowY + 20;
      this.maxScroll = Math.max(0, totalHeightWithVersion - this.viewportHeight);

      const maskGraphics = this.add.graphics().setVisible(false);
      maskGraphics.fillStyle(0xffffff, 1);
      maskGraphics.fillRect(this.settingsListX, this.settingsListYBase, listWidth, this.viewportHeight);
      const listMask = maskGraphics.createGeometryMask();

      rows.forEach((r, i) => {
        r.container.setPosition(this.settingsListX, this.settingsListYBase + rowYs[i]);
        r.container.setDepth(2);
        r.container.setMask(listMask);
      });
      this.versionContainer.setPosition(this.settingsListX + listWidth / 2, this.settingsListYBase + this.versionRowY);
      this.versionContainer.setDepth(2);
      this.versionContainer.setMask(listMask);

      const onWheel = (_ptr: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
        this.applyScroll(dy);
      };
      this.input.on('wheel', onWheel);

      // Touch/drag scrolling: use scene-level pointerdown so touch and mouse both work. When the
      // pointer is in the list bounds, hit-test: if topmost is a control, it already got the event;
      // otherwise start scroll drag (empty area or label).
      const listLeft = this.settingsListX;
      const listTop = this.settingsListYBase;
      const listRight = listLeft + listWidth;
      const listBottom = listTop + this.viewportHeight;
      const scrollZone = this.add
        .zone(listLeft + listWidth / 2, listTop + this.viewportHeight / 2, listWidth, this.viewportHeight)
        .setInteractive(
          new Phaser.Geom.Rectangle(-listWidth / 2, -this.viewportHeight / 2, listWidth, this.viewportHeight),
          Phaser.Geom.Rectangle.Contains
        );
      scrollZone.setDepth(2.5);

      this.events.on('settings:scrollBlock', () => { this.scrollBlockCount++; });
      this.events.on('settings:scrollUnblock', () => { this.scrollBlockCount = Math.max(0, this.scrollBlockCount - 1); });

      const startScrollDrag = (pointer: Phaser.Input.Pointer) => {
        if (this.scrollBlockCount > 0) return;
        if (pointer.event && typeof pointer.event.preventDefault === 'function') pointer.event.preventDefault();
        const y = pointer.worldX !== undefined ? pointer.worldY : pointer.y;
        this.scrollDrag = { startY: y, startScrollY: this.scrollY, pointerId: pointer.id, didDrag: false };
      };

      const onListPointerDown = (pointer: Phaser.Input.Pointer) => {
        if (this.scrollDrag || this.scrollBlockCount > 0) return;
        const x = pointer.worldX ?? pointer.x;
        const y = pointer.worldY ?? pointer.y;
        if (x < listLeft || x > listRight || y < listTop || y > listBottom) return;
        const hits = this.input.hitTestPointer(pointer);
        const top = hits[0];
        if (top && top !== scrollZone && !(top instanceof Phaser.GameObjects.Container)) return;
        startScrollDrag(pointer);
      };

      this.input.on('pointerdown', onListPointerDown);

      const onPointerMove = (pointer: Phaser.Input.Pointer) => {
        if (this.scrollBlockCount > 0 || !this.scrollDrag || pointer.id !== this.scrollDrag.pointerId) return;
        if (pointer.event && typeof pointer.event.preventDefault === 'function') pointer.event.preventDefault();
        const y = pointer.worldX !== undefined ? pointer.worldY : pointer.y;
        const deltaY = this.scrollDrag.startY - y;
        if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) this.scrollDrag.didDrag = true;
        const newScrollY = Phaser.Math.Clamp(
          this.scrollDrag.startScrollY + deltaY,
          0,
          this.maxScroll
        );
        this.setScrollY(newScrollY);
        this.scrollDrag.startY = y;
        this.scrollDrag.startScrollY = this.scrollY;
      };
      this.input.on('pointermove', onPointerMove);

      const clearScrollDrag = (pointer: Phaser.Input.Pointer) => {
        if (this.scrollDrag && pointer.id === this.scrollDrag.pointerId) this.scrollDrag = null;
      };

      this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => clearScrollDrag(pointer));

      const keys = this.input.keyboard?.addKeys('UP,DOWN,ESC');
      const onKeyUp = () => this.applyScroll(-SCROLL_SPEED);
      const onKeyDown = () => this.applyScroll(SCROLL_SPEED);
      const onKeyEsc = () => requestClose();
      if (keys && 'UP' in keys && 'DOWN' in keys && 'ESC' in keys) {
        (keys.UP as Phaser.Input.Keyboard.Key).on('down', onKeyUp);
        (keys.DOWN as Phaser.Input.Keyboard.Key).on('down', onKeyDown);
        (keys.ESC as Phaser.Input.Keyboard.Key).on('down', onKeyEsc);
      }

      this.events.once('shutdown', () => {
        this.input.off('wheel', onWheel);
        this.input.off('pointerdown', onListPointerDown);
        this.input.off('pointermove', onPointerMove);
        this.input.off('pointerup', clearScrollDrag);
        if (keys && 'UP' in keys && 'DOWN' in keys && 'ESC' in keys) {
          (keys.UP as Phaser.Input.Keyboard.Key).off('down', onKeyUp);
          (keys.DOWN as Phaser.Input.Keyboard.Key).off('down', onKeyDown);
          (keys.ESC as Phaser.Input.Keyboard.Key).off('down', onKeyEsc);
        }
      });
    }

    private setScrollY(y: number) {
      this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
      this.settingsRows.forEach((r, i) => {
        r.container.setPosition(
          this.settingsListX,
          this.settingsListYBase + this.settingsRowYs[i] - this.scrollY
        );
      });
      if (this.versionContainer) {
        this.versionContainer.setPosition(
          this.settingsListX + this.settingsListWidth / 2,
          this.settingsListYBase + this.versionRowY - this.scrollY
        );
      }
    }

    private applyScroll(delta: number) {
      this.setScrollY(this.scrollY + delta);
    }

    private createCloseButton(x: number, y: number, onClick: () => void) {
      const size = CLOSE_BUTTON_SIZE;
      const half = size / 2;
      const pad = 10;

      const bg = this.add.graphics();
      const draw = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? 0x333366 : 0x1a237e, 1);
        bg.fillRoundedRect(-half, -half, size, size, 8);
        bg.lineStyle(2, 0x4fc3f7, 1);
        bg.strokeRoundedRect(-half, -half, size, size, 8);
      };
      draw(false);

      const line = this.add.graphics();
      line.lineStyle(2, 0xe0e0e0, 1);
      line.lineBetween(-half + pad, -half + pad, half - pad, half - pad);
      line.lineBetween(half - pad, -half + pad, -half + pad, half - pad);

      const zone = this.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => draw(true));
      zone.on('pointerout', () => draw(false));
      zone.on('pointerdown', () => onClick());

      const btn = this.add.container(x, y, [bg, line, zone]);
      btn.setDepth(2);
    }
  }

  return SettingsModalScene as typeof Phaser.Scene;
}
