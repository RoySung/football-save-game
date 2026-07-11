import { Scene } from "phaser";

declare const APP_VERSION: string;

export class BootScene extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const v = APP_VERSION; // use package.json version to allow browser caching
    this.load.image("bg_stadium", `/assets/bg_stadium.png?v=${v}`);
    this.load.image("football", `/assets/football.png?v=${v}`);
    this.load.image("clouds", `/assets/cloud-sprite.png?v=${v}`);
    this.load.spritesheet("goalkeeper", `/assets/goalkeeper_sheet.png?v=${v}`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet("kicker", `/assets/striker_sheet.png?v=${v}`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.audio("bg_music", `/music/bg.wav?v=${v}`);
    this.load.audio("save_sound", `/music/save-1.mp3?v=${v}`);
  }

  create() {
    const texture = this.textures.get("clouds");
    if (texture) {
      // Define custom frames to avoid clipping the sleeping cat (Frame 3)
      // and align the clouds perfectly based on pixel bounds analysis
      texture.add(0, 0, 310, 122, 598, 396);
      texture.add(1, 0, 1364, 112, 928, 406);
      texture.add(2, 0, 75, 712, 1068, 558);
      texture.add(3, 0, 1334, 609, 981, 663);
    }
    this.scene.start("MainGame");
  }
}
