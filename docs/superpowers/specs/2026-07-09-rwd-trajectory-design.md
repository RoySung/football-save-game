# Design Spec: RWD Trajectory Adjustment for Football

This document specifies the design for adjusting the football trajectory calculation in the Phaser game to prevent it from going out of the visible screen bounds (RWD issue).

## Goal
Ensure the football sprite (including its visual bounds/radius) never clips outside the horizontal boundaries of the screen (`0` to `width`) on any device size (especially mobile screens).

## Analysis of the Problem
In the current implementation of `spawnFootball()` in [MainGame.ts](file:///Users/roysung/projects/football-game/src/game/MainGame.ts):
- `targetX` is randomly chosen between `width * 0.1` and `width * 0.9`.
- The curve control points `cp1x` and `cp2x` are computed with a random `curveOffset` of up to `±width * 0.5`.
- This causes the control points (and consequently the Bezier curve) to bulge significantly off-screen.
- The ball's scale increases as it moves closer to the screen. At its maximum, it can have a radius of up to ~73px on mobile screens.
- When the trajectory is near the edge, the ball's radius causes it to clip out of bounds, making it difficult or impossible for players to tap it.

## Proposed Solution (Approach 1: Dynamic Bounding)
We will compute the maximum horizontal boundaries dynamically based on the screen width and the maximum possible scale/radius of the football.

1. **Calculate the Maximum Ball Radius**:
   We will determine the maximum scale of the ball on the current layout:
   ```typescript
   const isLandscape = width > height;
   const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
   const maxScale = isLandscape
     ? Math.min((height * 0.2 * 0.7) / 1024, bgScale * GAME_CONSTANTS.BALL_MAX_SCALE_FACTOR)
     : bgScale * GAME_CONSTANTS.BALL_MAX_SCALE_FACTOR;
   const maxBallRadius = (maxScale * 2048) / 2; // Football texture has width/height of 2048px
   ```

2. **Define Horizontal Boundaries**:
   Using the maximum ball radius, we define the safe bounds:
   ```typescript
   const minX = maxBallRadius;
   const maxX = width - maxBallRadius;
   ```

3. **Clamp Target and Control Points**:
   Ensure `targetX` and the Bezier curve control points `cp1x` and `cp2x` are clamped to `[minX, maxX]`:
   ```typescript
   const targetX = Phaser.Math.Clamp(
     Phaser.Math.Between(width * 0.1, width * 0.9),
     minX,
     maxX
   );

   const cp1x = Phaser.Math.Clamp(startX + curveOffset, minX, maxX);
   const cp2x = Phaser.Math.Clamp(targetX + curveOffset * 0.5, minX, maxX);
   ```

By the convex hull property of Bezier curves, if the start point, target point, and control points are all within `[minX, maxX]`, the entire trajectory will stay within `[minX, maxX]`. Since the ball's radius at any point is less than or equal to `maxBallRadius`, no part of the ball will ever clip out of the screen.

## Verification Plan
1. **Developer Tooling & Logs**: Verify the coordinates generated for the curve do not exceed `[maxBallRadius, width - maxBallRadius]`.
2. **Visual Verification**: Use the browser subagent to play the game on simulated mobile viewports and verify the ball stays fully on-screen during high-curving kicks.
