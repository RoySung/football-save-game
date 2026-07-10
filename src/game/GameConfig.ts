import * as Phaser from 'phaser';
import type { Types } from 'phaser';
import { BootScene } from './BootScene';
import { MainGame } from './MainGame';

export const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    backgroundColor: '#000000',
    transparent: false,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MainGame]
};
