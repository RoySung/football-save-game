import * as Phaser from 'phaser';
import { Scene, Math as PhaserMath, Curves } from 'phaser';
import { EventBus } from './EventBus';

export class MainGame extends Scene {
    private score: number = 0;
    private timer: number = 30;
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
    private baseSpawnDelay: number = 2000;
    private saveZoneYMin!: number;
    private isGameStarted: boolean = false;

    constructor() {
        super('MainGame');
    }

    create() {
        this.score = 0;
        this.timer = 30;
        this.isGameOver = false;
        this.isGameStarted = false;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.bg = this.add.image(width / 2, height / 2, 'bg_stadium');
        
        // Goalkeeper (at the bottom)
        this.goalkeeper = this.add.sprite(width / 2, height - 150, 'goalkeeper', 0);
        this.goalkeeper.setOrigin(0.5, 1); // Anchor at bottom center

        // Kicker (at the middle-top, standing on the pitch)
        this.kicker = this.add.sprite(width / 2, height * 0.6, 'kicker', 0);
        this.kicker.setOrigin(0.5, 1);

        // Register kicker animations
        this.anims.create({
            key: 'kicker-kick-right',
            frames: [{ key: 'kicker', frame: 0 }, { key: 'kicker', frame: 1 }, { key: 'kicker', frame: 0 }],
            frameRate: 8,
            repeat: 0
        });

        this.anims.create({
            key: 'kicker-kick-left',
            frames: [{ key: 'kicker', frame: 0 }, { key: 'kicker', frame: 3 }, { key: 'kicker', frame: 0 }],
            frameRate: 8,
            repeat: 0
        });

        this.updateLayout(width, height);

        EventBus.on('start-game', this.startGame, this);
        EventBus.on('restart-game', this.restartGame, this);

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('start-game', this.startGame, this);
            EventBus.off('restart-game', this.restartGame, this);
        });

        this.scale.on('resize', this.resize, this);
    }

    resize(gameSize: Phaser.Structs.Size) {
        if (!this.scene.isActive()) return;
        this.cameras.main.setSize(gameSize.width, gameSize.height);
        this.updateLayout(gameSize.width, gameSize.height);
    }

    updateLayout(width: number, height: number) {
        this.bg.setPosition(width / 2, height / 2);
        const scaleX = width / this.bg.width;
        const scaleY = height / this.bg.height;
        this.bg.setScale(Math.max(scaleX, scaleY));

        const isLandscape = width > height;

        // Adjust goalkeeper size (max 35% of height on landscape to avoid blocking kicker)
        const gkTargetSize = isLandscape ? height * 0.35 : width * 0.6;
        const gkScale = gkTargetSize / 1024; 
        this.goalkeeper.setScale(gkScale);
        this.goalkeeper.setPosition(width / 2, height - (isLandscape ? 20 : 40));

        // Adjust kicker size (max 15% of height on landscape)
        const kickerTargetSize = isLandscape ? height * 0.15 : width * 0.25;
        const kickerScale = kickerTargetSize / 1024;
        this.kicker.setScale(kickerScale);
        this.fixedStartX = width / 2;
        
        // Calculate visual position on the grass based on background scale
        const bgScale = Math.max(scaleX, scaleY);
        const bgDisplayHeight = this.bg.height * bgScale;
        // Place kicker slightly below the background's visual center
        let targetY = (height / 2) + (bgDisplayHeight * 0.08);
        
        // Ensure kicker is always above goalkeeper (max Y is 75% of screen height)
        this.fixedStartY = Math.min(targetY, height * 0.75);
        this.kicker.setPosition(this.fixedStartX, this.fixedStartY);

        // Store goalkeeper starting position for dive reset calculations
        this.gkStartX = this.goalkeeper.x;
        this.gkStartY = this.goalkeeper.y;

        // Save Zone is the bottom 50% of the screen (放寬判定區域，降低難度)
        this.saveZoneYMin = height * 0.5;
    }

    startGame() {
        if (this.isGameStarted) return;
        this.isGameStarted = true;
        this.isGameOver = false;

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onTimerTick,
            callbackScope: this,
            loop: true
        });

        this.scheduleNextSpawn();
        
        EventBus.emit('game-started');
        EventBus.emit('update-score', this.score);
        EventBus.emit('update-timer', this.timer);
    }

    restartGame() {
        this.scene.restart();
    }

    onTimerTick() {
        if (this.isGameOver) return;
        this.timer--;
        EventBus.emit('update-timer', this.timer);

        if (this.timer <= 0) {
            this.gameOver();
        }
    }

    scheduleNextSpawn() {
        if (this.isGameOver) return;
        
        // Difficulty scaling: spawn delay decreases as time runs out
        const progress = 1 - (this.timer / 30);
        const currentDelay = this.baseSpawnDelay * (1 - progress * 0.6); // 2000ms -> 800ms

        this.spawnEvent = this.time.delayedCall(currentDelay, () => {
            this.spawnFootball();
            this.scheduleNextSpawn();
        });
    }

    spawnFootball() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Choose random target path and kicking direction first
        const targetX = PhaserMath.Between(width * 0.1, width * 0.9);
        const isRightKick = targetX >= width / 2;

        // Play the corresponding kicker animation
        if (isRightKick) {
            this.kicker.play('kicker-kick-right');
        } else {
            this.kicker.play('kicker-kick-left');
        }

        // Delay ball spawning by 150ms to align with physical kick contact frame
        this.time.delayedCall(150, () => {
            if (this.isGameOver) return;

            const startX = this.fixedStartX;
            const startY = this.fixedStartY;
            const targetY = height + 50; // slightly off screen

            // Curve control points
            const curveOffset = PhaserMath.Between(-width * 0.5, width * 0.5);
            const cp1x = startX + curveOffset;
            const cp1y = startY + (targetY - startY) * 0.3;
            const cp2x = targetX + curveOffset * 0.5;
            const cp2y = startY + (targetY - startY) * 0.7;

            const curve = new Curves.CubicBezier(
                new Phaser.Math.Vector2(startX, startY),
                new Phaser.Math.Vector2(cp1x, cp1y),
                new Phaser.Math.Vector2(cp2x, cp2y),
                new Phaser.Math.Vector2(targetX, targetY)
            );

            const football = this.add.sprite(startX, startY, 'football');
            football.setScale(0.05); // Very small at start
            football.setInteractive({ useHandCursor: true });
            
            // Hitbox padding for mobile (放寬為寬度的 1.5 倍以降低點擊難度)
            const hitArea = new Phaser.Geom.Circle(football.width/2, football.height/2, football.width * 1.5);
            football.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

            const progress = 1 - (this.timer / 30);
            const duration = 2000 - (progress * 1000); // 2000ms -> 1000ms speed

            const isLandscape = width > height;
            const maxBallSize = isLandscape ? height * 0.2 : width * 0.3; // Ball max size
            const maxScale = maxBallSize / 200; // Base texture is 200px
            const minScale = 0.05;

            const tween = this.tweens.add({
                targets: football,
                z: 1, // dummy prop
                duration: duration,
                ease: 'Sine.easeIn',
                onUpdate: (twn) => {
                    const t = twn.getValue() || 0;
                    const pos = curve.getPoint(t);
                    football.setPosition(pos.x, pos.y);
                    const currentScale = minScale + t * (maxScale - minScale);
                    football.setScale(currentScale); 
                    football.rotation += 0.15;
                },
                onComplete: () => {
                    football.destroy(); // Missed
                }
            });

            football.on('pointerdown', () => {
                if (this.isGameOver) return;
                
                // Check if in save zone
                if (football.y >= this.saveZoneYMin) {
                    // Success
                    this.score++;
                    EventBus.emit('update-score', this.score);
                    tween.stop();
                    
                    // Show particle / fade effect
                    this.tweens.add({
                        targets: football,
                        alpha: 0,
                        scale: football.scale * 1.5,
                        duration: 150,
                        onComplete: () => football.destroy()
                    });

                    // Trigger Goalkeeper save animation based on horizontal distance
                    const diffX = football.x - this.goalkeeper.x;
                    
                    // Reset any pending goalkeeper motion/pose to prevent displacement accumulation
                    this.tweens.killTweensOf(this.goalkeeper);
                    this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                    this.goalkeeper.setAngle(0);
                    this.goalkeeper.setFrame(0);

                    if (diffX > 50) {
                        // Dive Right (Frame 1 + position offset tween)
                        this.goalkeeper.setFrame(1);
                        this.tweens.add({
                            targets: this.goalkeeper,
                            x: this.gkStartX + 80,
                            y: this.gkStartY + 15,
                            angle: 12,
                            duration: 250,
                            yoyo: true,
                            hold: 80,
                            onComplete: () => {
                                this.goalkeeper.setFrame(0);
                                this.goalkeeper.setAngle(0);
                                this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                            }
                        });
                    } else if (diffX < -50) {
                        // Dive Left (Frame 3 + position offset tween)
                        this.goalkeeper.setFrame(3);
                        this.tweens.add({
                            targets: this.goalkeeper,
                            x: this.gkStartX - 80,
                            y: this.gkStartY + 15,
                            angle: -12,
                            duration: 250,
                            yoyo: true,
                            hold: 80,
                            onComplete: () => {
                                this.goalkeeper.setFrame(0);
                                this.goalkeeper.setAngle(0);
                                this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                            }
                        });
                    } else {
                        // Center block / jump (Frame 0 + vertical bounce)
                        this.tweens.add({
                            targets: this.goalkeeper,
                            y: this.gkStartY - 60,
                            duration: 180,
                            yoyo: true,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                                this.goalkeeper.setFrame(0);
                                this.goalkeeper.setPosition(this.gkStartX, this.gkStartY);
                            }
                        });
                    }

                    // Success visual effect (+1 text)
                    const plusText = this.add.text(football.x, football.y, '+1', {
                        fontSize: '64px',
                        fontStyle: 'bold',
                        color: '#10b981', // emerald-500
                        stroke: '#ffffff',
                        strokeThickness: 8,
                        shadow: { blur: 15, color: '#000000', fill: true }
                    }).setOrigin(0.5);

                    this.tweens.add({
                        targets: plusText,
                        y: plusText.y - 120,
                        alpha: 0,
                        duration: 800,
                        ease: 'Cubic.easeOut',
                        onComplete: () => plusText.destroy()
                    });
                } else {
                    // Clicked too early
                    football.setTint(0xff0000);
                    this.time.delayedCall(200, () => football.clearTint());
                }
            });
        });
    }

    gameOver() {
        this.isGameOver = true;
        if (this.timerEvent) this.timerEvent.destroy();
        if (this.spawnEvent) this.spawnEvent.destroy();
        EventBus.emit('game-over', this.score);
    }
}
