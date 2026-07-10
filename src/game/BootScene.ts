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
    this.load.spritesheet("goalkeeper", `/assets/goalkeeper_sheet.png?v=${v}`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet("kicker", `/assets/striker_sheet.png?v=${v}`, {
      frameWidth: 512,
      frameHeight: 512,
    });
  }

  create() {
    this.scene.start("MainGame");
  }
}
