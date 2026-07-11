import * as Phaser from "phaser";
import { Scene, Math as PhaserMath } from "phaser";
import { EventBus } from "./EventBus";
import { GAME_CONSTANTS } from "../constants";

export class MainGame extends Scene {
  private score: number = 0;
  private timer: number = GAME_CONSTANTS.DURATION;
  private timerEvent?: Phaser.Time.TimerEvent;
  private spawnEvent?: Phaser.Time.TimerEvent;
  private isGameOver: boolean = false;
  private bg!: Phaser.GameObjects.Image;
  private goalkeeper!: Phaser.GameObjects.Sprite;
  private kicker!: Phaser.GameObjects.Sprite;
  private fixedStartX!: number;
  private fixedStartY!: number;
  private gkStartX!: number;
  private gkStartY!: number;
  private gkBaseScale: number = 1.0;
  private gkBreathingTween?: Phaser.Tweens.Tween;
  private isGkDiving: boolean = false;
  private baseSpawnDelay: number = GAME_CONSTANTS.BASE_SPAWN_DELAY;
  private saveZoneYMin!: number;
  private isGameStarted: boolean = false;
  private plusTextPool: Phaser.GameObjects.Text[] = [];
  private footballPool!: Phaser.GameObjects.Group;
  private sharedHitArea!: Phaser.Geom.Circle;
  private isTensionMode: boolean = false;
  private bgTintTween?: Phaser.Tweens.Tween;
  private bgMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super("MainGame");
  }

  create() {
    this.score = 0;
    this.timer = GAME_CONSTANTS.DURATION;
    this.isGameOver = false;
    this.isGameStarted = false;
    this.isTensionMode = false;
    this.bgTintTween = undefined;

    // Load initial mute state from localStorage
    const isMuted = localStorage.getItem("game-muted") === "true";
    this.sound.mute = isMuted;

    // Background music (looping with 0.35 volume)
    this.bgMusic = this.sound.add("bg_music", { loop: true, volume: 0.35 });
    this.bgMusic.play();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.bg = this.add.image(width / 2, height / 2, "bg_stadium");

    // Goalkeeper (at the bottom)
    this.goalkeeper = this.add.sprite(width / 2, height - 150, "goalkeeper", 2);
    this.goalkeeper.setOrigin(0.5, 1); // Anchor at bottom center

    // Kicker (at the middle-top, standing on the pitch)
    this.kicker = this.add.sprite(width / 2, height * 0.6, "kicker", 0);
    this.kicker.setOrigin(0.5, 1);

    // Register kicker animations
    this.anims.create({
      key: "kicker-kick-right",
      frames: [
        { key: "kicker", frame: 0 },
        { key: "kicker", frame: 1 },
        { key: "kicker", frame: 0 },
      ],
      frameRate: 8,
      repeat: 0,
    });

    this.anims.create({
      key: "kicker-kick-left",
      frames: [
        { key: "kicker", frame: 0 },
        { key: "kicker", frame: 3 },
        { key: "kicker", frame: 0 },
      ],
      frameRate: 8,
      repeat: 0,
    });

    // Create a pool of 3 text objects for "+1" score indicators to avoid GC overhead from dynamic instantiation
    this.plusTextPool = [];
    for (let i = 0; i < 3; i++) {
      const txt = this.add.text(0, 0, "+1", {
        fontSize: GAME_CONSTANTS.SCORE_EFFECT_FONT_SIZE,
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
        color: GAME_CONSTANTS.SCORE_EFFECT_FONT_COLOR,
        stroke: GAME_CONSTANTS.SCORE_EFFECT_STROKE_COLOR,
        strokeThickness: GAME_CONSTANTS.SCORE_EFFECT_STROKE_THICKNESS,
        shadow: { blur: 10, color: "#000000", fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(10);
      this.plusTextPool.push(txt);
    }

    // Create a pool for footballs to avoid GC stuttering on mobile
    this.footballPool = this.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: 10,
      runChildUpdate: false
    });

    // Create a single shared hit area to prevent allocating memory for Geometries on every spawn
    const fbTex = this.textures.get("football")?.get();
    const fbWidth = fbTex ? fbTex.width : 2048;
    this.sharedHitArea = new Phaser.Geom.Circle(
      fbWidth / 2,
      fbWidth / 2,
      fbWidth * GAME_CONSTANTS.BALL_HITBOX_SCALE
    );

    this.updateLayout(width, height);

    EventBus.on("start-game", this.startGame, this);
    EventBus.on("restart-game", this.restartGame, this);
    EventBus.on("toggle-mute", this.handleToggleMute, this);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("start-game", this.startGame, this);
      EventBus.off("restart-game", this.restartGame, this);
      EventBus.off("toggle-mute", this.handleToggleMute, this);
      this.scale.off("resize", this.resize, this);
      if (this.bgMusic) {
        this.bgMusic.stop();
        this.bgMusic.destroy();
      }
    });

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize: Phaser.Structs.Size) {
    if (!this.scene.isActive()) return;
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.updateLayout(gameSize.width, gameSize.height);
  }

  private handleToggleMute(muted: boolean) {
    this.sound.mute = muted;
  }

  updateLayout(width: number, height: number) {
    this.bg.setPosition(width / 2, height / 2);
    const scaleX = width / this.bg.width;
    const scaleY = height / this.bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    this.bg.setScale(bgScale);

    const isLandscape = width > height;

    // Adjust goalkeeper size (scale relative to background/goal size to remain proportional across all screen sizes)
    // In landscape, we scale based on height * 0.35, but cap it using bgScale to avoid it getting too large.
    // In portrait, we scale strictly proportional to bgScale so it matches the goal post size perfectly.
    const REF_BG_WIDTH = 2048;
    const bgWidthFactor = this.bg.width / REF_BG_WIDTH;
    const baseGkWidth = this.goalkeeper.width || 1024;
    const gkScaleMultiplier = 1024 / baseGkWidth;
    const gkScale = (isLandscape
      ? Math.min((height * 0.35) / 1024, bgScale * 0.48 * bgWidthFactor)
      : bgScale * 0.48 * bgWidthFactor) * gkScaleMultiplier;
    this.gkBaseScale = gkScale;
    this.goalkeeper.setScale(gkScale);
    
    // Read safe area bottom inset if available
    const safeAreaBottomStr = window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0px';
    const safeAreaBottom = parseFloat(safeAreaBottomStr) || 0;

    // Move goalkeeper position (use height - 15 in landscape to position lower, height - (60 + safeAreaBottom) in portrait)
    const portraitOffset = 60 + safeAreaBottom;
    this.goalkeeper.setPosition(width / 2, height - (isLandscape ? 15 : portraitOffset));

    // Adjust kicker size (scale relative to background to maintain perspective)
    const baseKickerWidth = this.kicker.width || 1024;
    const kickerScaleMultiplier = 1024 / baseKickerWidth;
    const kickerScale = (isLandscape
      ? Math.min((height * 0.15) / 1024, bgScale * 0.22 * bgWidthFactor)
      : bgScale * 0.22 * bgWidthFactor) * kickerScaleMultiplier;
    this.kicker.setScale(kickerScale);
    this.fixedStartX = width / 2;

    // Calculate visual position on the grass based on background scale
    const bgDisplayHeight = this.bg.height * bgScale;
    // Place kicker in front of the goal on the grass (offset set to 0.055)
    let targetY = height / 2 + bgDisplayHeight * 0.055;

    // Ensure kicker is always above goalkeeper (max Y is 60% of screen height to keep distance on wide screens)
    this.fixedStartY = Math.min(targetY, height * 0.6);
    this.kicker.setPosition(this.fixedStartX, this.fixedStartY);

    // Store goalkeeper starting position for dive reset calculations
    this.gkStartX = this.goalkeeper.x;
    this.gkStartY = this.goalkeeper.y;

    // Save Zone is the bottom 38% of the screen with 12px padding (縮小區域避開射門員，對齊視覺框線)
    const saveZonePercent = GAME_CONSTANTS.SAVE_ZONE_HEIGHT_PERCENT;
    const bottomPadding = GAME_CONSTANTS.SAVE_ZONE_BOTTOM_PADDING;
    this.saveZoneYMin = height * (1 - saveZonePercent) - (bottomPadding + safeAreaBottom);

    if (!this.isGameOver && !this.isGkDiving) {
      this.startGoalkeeperBreathing();
    }
  }

  startGame() {
    if (this.isGameStarted) return;
    this.isGameStarted = true;
    this.isGameOver = false;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTimerTick,
      callbackScope: this,
      loop: true,
    });

    this.scheduleNextSpawn();

    EventBus.emit("game-started");
    EventBus.emit("update-score", this.score);
    EventBus.emit("update-timer", this.timer);
  }

  restartGame() {
    this.scene.restart();
  }

  onTimerTick() {
    if (this.isGameOver) return;
    this.timer--;
    EventBus.emit("update-timer", this.timer);

    if (this.timer <= GAME_CONSTANTS.TENSION_TIME_THRESHOLD && this.timer > 0) {
      this.isTensionMode = true;

      // Camera shake: intensity builds up as time runs out
      const remaining = this.timer;
      const intensity = GAME_CONSTANTS.TENSION_SHAKE_BASE_INTENSITY - (remaining * 0.001);
      this.cameras.main.shake(1000, Math.max(0.001, intensity));

      // Background pulsing orange-red (桔紅色) tint tween
      if (!this.bgTintTween) {
        this.bgTintTween = this.tweens.addCounter({
          from: 0,
          to: 100,
          duration: 500, // pulse every 0.5s (yoyo = 1.0s full cycle)
          yoyo: true,
          repeat: -1,
          onUpdate: (tween) => {
            const progress = (tween.getValue() as number) / 100;
            // Red stays 255, Green goes 255 -> 100, Blue goes 255 -> 30 (Vibrant orange-red / 桔紅色)
            const g = Math.floor(255 - progress * 155);
            const b = Math.floor(255 - progress * 225);
            const tint = Phaser.Display.Color.GetColor(255, g, b);
            this.bg.setTint(tint);
          }
        });
      }
    }

    if (this.timer <= 0) {
      this.gameOver();
    }
  }

  scheduleNextSpawn() {
    if (this.isGameOver) return;

    // Difficulty scaling: spawn delay decreases as time runs out
    const progress = 1 - this.timer / GAME_CONSTANTS.DURATION;
    let currentDelay = this.baseSpawnDelay * (1 - progress * GAME_CONSTANTS.SPAWN_MIN_DELAY_FACTOR); // 2000ms -> 800ms

    // Increase kicking frequency in high-tension mode
    if (this.isTensionMode) {
      currentDelay /= GAME_CONSTANTS.TENSION_SPAWN_SPEED_FACTOR;
    }

    this.spawnEvent = this.time.delayedCall(currentDelay, () => {
      this.spawnFootball();
      this.scheduleNextSpawn();
    });
  }

  spawnFootball() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Calculate dynamic constraints based on the football's scale
    const isLandscape = width > height;
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    const REF_BG_WIDTH = 2048;
    const bgWidthFactor = this.bg.width / REF_BG_WIDTH;
    const textureWidth = this.textures.get("football")?.get().width || 2048;
    const ballScaleMultiplier = 2048 / textureWidth;
    const maxScale = (isLandscape
      ? Math.min((height * 0.2 * 0.7) / 1024, bgScale * GAME_CONSTANTS.BALL_MAX_SCALE_FACTOR * bgWidthFactor)
      : bgScale * GAME_CONSTANTS.BALL_MAX_SCALE_FACTOR * bgWidthFactor) * ballScaleMultiplier;
    const minScale = GAME_CONSTANTS.BALL_MIN_SCALE * ballScaleMultiplier;

    const maxBallRadius = (maxScale * textureWidth) / 2;
    const minX = maxBallRadius;
    const maxX = width - maxBallRadius;

    // Choose random target path and kicking direction first (bounded by safety margin)
    const targetX = PhaserMath.Clamp(
      PhaserMath.Between(width * 0.1, width * 0.9),
      minX,
      maxX
    );
    const isRightKick = targetX >= width / 2;

    const startX = this.fixedStartX;
    const startY = this.fixedStartY;

    // Randomly determine if this is a lob ball (arcs upward first before falling)
    const isLob = Math.random() < GAME_CONSTANTS.LOB_BALL_CHANCE;

    // Play the corresponding kicker animation and apply speed factor
    const kickerAnimKey = isRightKick ? "kicker-kick-right" : "kicker-kick-left";
    this.kicker.play(kickerAnimKey);
    if (this.kicker.anims) {
      this.kicker.anims.timeScale = this.isTensionMode ? GAME_CONSTANTS.TENSION_ANIM_SPEED_FACTOR : 1.0;
    }

    // Delay ball spawning to align with physical kick contact frame (adjusted for tension speed)
    const spawnDelayOffset = GAME_CONSTANTS.BALL_SPAWN_DELAY_OFFSET / (this.isTensionMode ? GAME_CONSTANTS.TENSION_ANIM_SPEED_FACTOR : 1.0);
    this.time.delayedCall(spawnDelayOffset, () => {
      if (this.isGameOver) return;

      const targetY = height + 50; // slightly off screen

      let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

      if (isLob) {
        // Lob ball: arc upward first, then curve back down to save zone
        // cp1 is high above the kicker (arc apex), cp2 brings ball back to falling trajectory
        const arcHeight = height * GAME_CONSTANTS.LOB_BALL_ARC_HEIGHT_FACTOR;
        const lobCurveX = PhaserMath.Between(-width * 0.2, width * 0.2);
        cp1x = PhaserMath.Clamp(startX + lobCurveX, minX, maxX);
        cp1y = startY - arcHeight; // Well above kicker — the peak of the lob
        cp2x = PhaserMath.Clamp(targetX + lobCurveX * 0.3, minX, maxX);
        cp2y = startY + (targetY - startY) * 0.3; // Transition back into falling path
      } else {
        // Normal ball: straight downward Bézier curve
        const curveOffset = PhaserMath.Between(-width * 0.5, width * 0.5);
        cp1x = PhaserMath.Clamp(startX + curveOffset, minX, maxX);
        cp1y = startY + (targetY - startY) * 0.3;
        cp2x = PhaserMath.Clamp(targetX + curveOffset * 0.5, minX, maxX);
        cp2y = startY + (targetY - startY) * 0.7;
      }

      const football = this.footballPool.get(startX, startY, "football") as Phaser.GameObjects.Sprite;
      if (!football) return; // safety check if pool is exhausted

      football.setActive(true).setVisible(true).setAlpha(1);
      football.setPosition(startX, startY);
      football.setScale(minScale); // Very small at start
      football.clearTint();
      football.rotation = 0;

      // Hitbox padding for mobile (放寬為寬度的 1.5 倍以降低點擊難度)
      // Reuse the sharedHitArea to prevent Geometry instantiation per spawn
      football.setInteractive(this.sharedHitArea, Phaser.Geom.Circle.Contains);
      if (football.input) {
        football.input.cursor = 'pointer';
      }

      const progress = 1 - this.timer / GAME_CONSTANTS.DURATION;
      const baseDuration = isLob ? GAME_CONSTANTS.LOB_BALL_BASE_DURATION : GAME_CONSTANTS.BALL_BASE_DURATION;
      const duration = baseDuration - progress * (baseDuration * GAME_CONSTANTS.BALL_MIN_DURATION_FACTOR);

      const tween = this.tweens.add({
        targets: football,
        z: 1, // dummy prop
        duration: duration,
        ease: isLob ? "Sine.easeInOut" : "Sine.easeIn",
        onUpdate: (twn) => {
          const t = twn.getValue() || 0;
          
          // Pure math bezier curve calculations (zero memory allocation)
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          const t2 = t * t;
          const t3 = t2 * t;

          const x = mt3 * startX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * targetX;
          const y = mt3 * startY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * targetY;
          football.setPosition(x, y);

          let currentScale: number;
          if (isLob) {
            // Lob ball: always grows small→big, but front-loaded slower growth (ball arcing up)
            // then accelerated growth as it falls back down toward the goalkeeper
            const scaleFactor = Math.pow(t, 1.4);
            currentScale = minScale + scaleFactor * (maxScale - minScale);
          } else {
            currentScale = minScale + t * (maxScale - minScale);
          }
          football.setScale(currentScale);
          football.rotation += GAME_CONSTANTS.BALL_ROTATION_SPEED;
        },
        onComplete: () => {
          football.off("pointerdown");
          football.disableInteractive();
          this.footballPool.killAndHide(football); // Missed
        },
      });

      // Clear previous listeners to avoid duplicates when reusing pooled objects
      football.off("pointerdown");
      football.on("pointerdown", () => {
        if (this.isGameOver) return;

        // Disable further clicks immediately to prevent double-scoring on rapid taps
        football.disableInteractive();

        // Check if in save zone (same zone for both normal and lob balls)
        if (football.y >= this.saveZoneYMin) {
          // Success
          this.score++;
          EventBus.emit("update-score", this.score);
          tween.stop();

          // Play block success sound
          this.sound.play("save_sound", { volume: 0.65 });

          // Show particle / fade effect
          this.tweens.add({
            targets: football,
            alpha: 0,
            scale: football.scale * 1.5,
            duration: 150,
            onComplete: () => {
              football.off("pointerdown");
              this.footballPool.killAndHide(football);
            },
          });

          // Trigger Goalkeeper save animation based on horizontal distance
          const diffX = football.x - this.goalkeeper.x;

          // Reset any pending goalkeeper motion/pose to prevent displacement accumulation
          this.tweens.killTweensOf(this.goalkeeper);
          this.stopGoalkeeperBreathing();
          this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
          this.goalkeeper.setAngle(0);
          this.goalkeeper.setFrame(2);
          this.isGkDiving = true;

          const gkScale = this.gkBaseScale;
          const threshold = GAME_CONSTANTS.GK_DIVE_THRESHOLD * gkScale;
          const diveDistance = GAME_CONSTANTS.GK_DIVE_DISTANCE * gkScale;
          const diveHeight = GAME_CONSTANTS.GK_DIVE_HEIGHT_OFFSET * gkScale;
          const jumpHeight = GAME_CONSTANTS.GK_JUMP_HEIGHT * gkScale;

          // Speed up the goalkeeper movements in tension mode
          const speedFactor = this.isTensionMode ? GAME_CONSTANTS.TENSION_ANIM_SPEED_FACTOR : 1.0;
          const diveDuration = GAME_CONSTANTS.GK_DIVE_DURATION / speedFactor;
          const diveHold = GAME_CONSTANTS.GK_DIVE_HOLD / speedFactor;
          const jumpDuration = GAME_CONSTANTS.GK_JUMP_DURATION / speedFactor;

          if (diffX > threshold) {
            // Dive Right (Frame 1 + position offset tween)
            this.goalkeeper.setFrame(1);
            this.tweens.add({
              targets: this.goalkeeper,
              x: this.gkStartX + diveDistance,
              y: this.gkStartY + diveHeight,
              angle: 12,
              duration: diveDuration,
              yoyo: true,
              hold: diveHold,
              onComplete: () => {
                this.goalkeeper.setFrame(2);
                this.goalkeeper.setAngle(0);
                this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                this.isGkDiving = false;
                this.startGoalkeeperBreathing();
              },
            });
          } else if (diffX < -threshold) {
            // Dive Left (Frame 3 + position offset tween)
            this.goalkeeper.setFrame(3);
            this.tweens.add({
              targets: this.goalkeeper,
              x: this.gkStartX - diveDistance,
              y: this.gkStartY + diveHeight,
              angle: -12,
              duration: diveDuration,
              yoyo: true,
              hold: diveHold,
              onComplete: () => {
                this.goalkeeper.setFrame(2);
                this.goalkeeper.setAngle(0);
                this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                this.isGkDiving = false;
                this.startGoalkeeperBreathing();
              },
            });
          } else {
            // Center block / jump (Frame 0 + vertical bounce)
            this.goalkeeper.setFrame(0);
            this.tweens.add({
              targets: this.goalkeeper,
              y: this.gkStartY - jumpHeight,
              duration: jumpDuration,
              yoyo: true,
              ease: "Quad.easeOut",
              onComplete: () => {
                this.goalkeeper.setFrame(2);
                this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                this.isGkDiving = false;
                this.startGoalkeeperBreathing();
              },
            });
          }

          // Success visual effect (pooled +1 text, zero memory allocation)
          const plusText = this.plusTextPool.find(txt => txt.alpha === 0);
          if (plusText) {
            plusText.setPosition(football.x, football.y);
            plusText.setAlpha(1);
            this.tweens.add({
              targets: plusText,
              y: football.y - GAME_CONSTANTS.SCORE_EFFECT_FLOAT_DISTANCE,
              alpha: 0,
              duration: GAME_CONSTANTS.SCORE_EFFECT_DURATION,
              ease: "Cubic.easeOut",
            });
          }
        } else {
          // Clicked too early
          football.setTint(0xff0000);
          this.time.delayedCall(200, () => {
            if (football.active) {
              football.clearTint();
            }
          });
        }
      });
    });
  }

  gameOver() {
    this.isGameOver = true;
    this.isTensionMode = false;
    this.stopGoalkeeperBreathing();
    if (this.timerEvent) this.timerEvent.destroy();
    if (this.spawnEvent) this.spawnEvent.destroy();

    // Stop background pulsing tint
    if (this.bgTintTween) {
      this.bgTintTween.stop();
      this.bgTintTween = undefined;
    }
    this.bg.clearTint();

    // Reset kicker animation timescale
    if (this.kicker && this.kicker.anims) {
      this.kicker.anims.timeScale = 1.0;
    }

    // Stop camera shake
    if (this.cameras && this.cameras.main) {
      this.cameras.main.shakeEffect.reset();
    }

    // Clean up all in-flight footballs to prevent stale tween callbacks after scene restart
    this.footballPool.getChildren().forEach(child => {
      this.tweens.killTweensOf(child);
      child.off("pointerdown");
      (child as Phaser.GameObjects.Sprite).disableInteractive();
      this.footballPool.killAndHide(child);
    });

    EventBus.emit("game-over", this.score);
  }

  private startGoalkeeperBreathing() {
    this.stopGoalkeeperBreathing();

    this.gkBreathingTween = this.tweens.add({
      targets: this.goalkeeper,
      scaleY: this.gkBaseScale * GAME_CONSTANTS.GK_BREATH_SCALE_Y,
      scaleX: this.gkBaseScale * GAME_CONSTANTS.GK_BREATH_SCALE_X,
      duration: GAME_CONSTANTS.GK_BREATH_DURATION,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private stopGoalkeeperBreathing() {
    if (this.gkBreathingTween) {
      this.gkBreathingTween.stop();
      this.gkBreathingTween = undefined;
    }
    if (this.goalkeeper) {
      this.goalkeeper.setScale(this.gkBaseScale);
    }
  }
}
