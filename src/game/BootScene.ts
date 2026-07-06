import * as Phaser from 'phaser';
import { Scene } from 'phaser';

export class BootScene extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        const v = Date.now() + 2; // force fresh cache
        this.load.image('bg_stadium', `/assets/bg_stadium.jpg?v=${v}`);
        this.load.spritesheet('goalkeeper', `/assets/goalkeeper_sheet.png?v=${v}`, { frameWidth: 1024, frameHeight: 1024 });
        this.load.spritesheet('kicker', `/assets/striker_sheet.png?v=${v}`, { frameWidth: 1024, frameHeight: 1024 });
    }

    create() {
        const g = this.add.graphics();
        
        g.fillStyle(0xffffff, 1);
        g.fillCircle(100, 100, 96);
        
        g.lineStyle(6, 0x000000, 1);
        g.strokeCircle(100, 100, 96);
        
        g.fillStyle(0x000000, 1);
        const Vector2 = Phaser.Math.Vector2;
        g.fillPoints([
            new Vector2(100, 50), new Vector2(148, 84), new Vector2(130, 140), new Vector2(70, 140), new Vector2(52, 84)
        ], true);
        
        g.beginPath();
        g.moveTo(100, 50); g.lineTo(100, 4);
        g.moveTo(148, 84); g.lineTo(190, 70);
        g.moveTo(130, 140); g.lineTo(160, 186);
        g.moveTo(70, 140); g.lineTo(40, 186);
        g.moveTo(52, 84); g.lineTo(10, 70);
        g.strokePath();

        g.generateTexture('football', 200, 200);
        g.destroy();

        this.scene.start('MainGame');
    }
}
