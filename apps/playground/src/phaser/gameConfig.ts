import Phaser from 'phaser';
import { PlaygroundScene } from './scenes/PlaygroundScene';

export function getGameConfig(
  container: HTMLElement,
  additionalScenes: (typeof Phaser.Scene)[] = []
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: container,
    width: 800,
    height: 450,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    backgroundColor: '#1a1a2e',
    scene: [PlaygroundScene, ...additionalScenes],
    physics: { default: 'arcade' },
    audio: { noAudio: true },
  };
}
