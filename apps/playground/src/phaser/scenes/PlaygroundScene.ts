import Phaser from 'phaser';
import { SettingsManager } from 'phaser-settings';

const SCENE_KEY = 'PlaygroundScene';
const SETTINGS_SCENE_KEY = 'SettingsScene';

export class PlaygroundScene extends Phaser.Scene {
  private stateText: Phaser.GameObjects.Text | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEY });
  }

  create() {
    const { width, height } = this.scale;
    const manager = SettingsManager.getInstance();

    this.add
      .text(width / 2, 36, 'Phaser Settings Playground', {
        fontSize: '22px',
        color: '#4fc3f7',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 72, 'Touch the button to open Settings. Use the panel below to see live values.', {
        fontSize: '14px',
        color: '#8b9dc3',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: width - 48 },
      })
      .setOrigin(0.5);

    const openBtn = this.add
      .text(width / 2, 140, ' Open Settings ', {
        fontSize: '18px',
        color: '#fff',
        fontFamily: 'monospace',
        backgroundColor: '#1a237e',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    openBtn.on('pointerdown', () => this.scene.launch(SETTINGS_SCENE_KEY));
    openBtn.on('pointerover', () => openBtn.setStyle({ backgroundColor: '#283593' }));
    openBtn.on('pointerout', () => openBtn.setStyle({ backgroundColor: '#1a237e' }));

    this.stateText = this.add
      .text(width / 2, height / 2 + 20, '', {
        fontSize: '13px',
        color: '#a0aec0',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: width - 64 },
      })
      .setOrigin(0.5);

    const sceneRef = this;
    const updateOverlay = () => {
      try {
        if (!sceneRef.stateText) return;
        const tapDrag = manager.getOrDefault('tapDragThreshold');
        const scrollSens = manager.getOrDefault('scrollSensitivity');
        const joystick = manager.getOrDefault('virtualJoystick');
        const deadZone = manager.getOrDefault('deadZone');
        const btnSize = manager.getOrDefault('buttonSize');
        const btnSpacing = manager.getOrDefault('buttonSpacing');
        const opacity = manager.getOrDefault('touchOpacity');
        const str = [
          `tapDragThreshold: ${tapDrag}px`,
          `scrollSensitivity: ${scrollSens}x`,
          `virtualJoystick: ${joystick}`,
          `deadZone: ${deadZone}px`,
          `buttonSize: ${btnSize}px`,
          `buttonSpacing: ${btnSpacing}px`,
          `touchOpacity: ${opacity}`,
        ].join('\n');
        const s = str;
        sceneRef.time.delayedCall(0, () => {
          try {
            if (sceneRef.stateText) sceneRef.stateText.setText(s);
          } catch {
            // Scene or texture torn down
          }
        });
      } catch {
        // Ignore if scene ref or manager is invalid
      }
    };

    updateOverlay();
    this.unsubscribe = manager.subscribe(updateOverlay);
  }

  shutdown() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.stateText = null;
    super.shutdown();
  }
}
