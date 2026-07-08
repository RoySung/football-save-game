import { Scene } from "phaser";

export class BootScene extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const v = Date.now() + 2; // force fresh cache
    this.load.image("bg_stadium", `/assets/bg_stadium.png?v=${v}`);
    this.load.image("football", `/assets/football.png?v=${v}`);
    this.load.spritesheet("goalkeeper", `/assets/goalkeeper_sheet.png?v=${v}`, {
      frameWidth: 1024,
      frameHeight: 1024,
    });
    this.load.spritesheet("kicker", `/assets/striker_sheet.png?v=${v}`, {
      frameWidth: 1024,
      frameHeight: 1024,
    });
  }

  create() {
    this.scene.start("MainGame");
  }
}
