export const GAME_CONSTANTS = {
  // Time and Countdown settings
  DURATION: 30, // seconds
  COUNTDOWN_DURATION: 3, // seconds

  // Spawn parameters
  BASE_SPAWN_DELAY: 2000, // ms
  SPAWN_MIN_DELAY_FACTOR: 0.6, // progress multiplier (1 - progress * 0.6 => min delay 800ms)
  BALL_SPAWN_DELAY_OFFSET: 150, // ms, aligned with striker kick contact frame

  // Ball physics & scaling
  BALL_MIN_SCALE: 0.035,
  BALL_MAX_SCALE_FACTOR: 0.18,
  BALL_HITBOX_SCALE: 0.75,
  BALL_BASE_DURATION: 2000, // ms
  BALL_MIN_DURATION_FACTOR: 0.5, // progress multiplier (1 - progress * 0.5 => min duration 1000ms)

  // Layout & Save Zone
  SAVE_ZONE_HEIGHT_PERCENT: 0.38,
  SAVE_ZONE_BOTTOM_PADDING: 12, // pixels

  // Goalkeeper dive and jump settings
  GK_DIVE_THRESHOLD: 220,
  GK_DIVE_DISTANCE: 360,
  GK_DIVE_HEIGHT_OFFSET: 70,
  GK_JUMP_HEIGHT: 270,
  GK_DIVE_DURATION: 250, // ms
  GK_DIVE_HOLD: 80, // ms
  GK_JUMP_DURATION: 180, // ms

  // Success floating text (+1 text)
  SCORE_EFFECT_FONT_SIZE: "36px",
  SCORE_EFFECT_FONT_COLOR: "#FFF9C4",
  SCORE_EFFECT_STROKE_COLOR: "#4E342E",
  SCORE_EFFECT_STROKE_THICKNESS: 6,
  SCORE_EFFECT_FLOAT_DISTANCE: 120, // pixels
  SCORE_EFFECT_DURATION: 800, // ms

  // Logo interactions
  LOGO_ANGRY_THRESHOLD: 5,
  LOGO_ANGRY_TIMEOUT: 3000, // ms
  LOGO_SHOCKED_TIMEOUT: 1000, // ms

  // Leaderboard settings
  LEADERBOARD_LIMIT: 10,
  LEADERBOARD_MAX_SCORE: 50,
  LEADERBOARD_MAX_NAME_LENGTH: 12,
  LEADERBOARD_COLLECTION: "leaderboard",
  LEADERBOARD_SALT: "f00tb4ll_s4v3_s3cr3t",

  // Game Feedback thresholds
  FEEDBACK_AMAZING: 15,
  FEEDBACK_GREAT: 10,
  FEEDBACK_GOOD: 5,
} as const;
