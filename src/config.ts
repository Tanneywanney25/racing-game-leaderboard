/** Central configuration for the four-player top-down racer. */

export interface TrackConfig {
  /** Race distance from start line to finish line, px. */
  length: number;
  /** Lane center x positions (one per seat). */
  laneX: [number, number, number, number];
  /** Visible track width, px. */
  width: number;
  /** Vertical size of one repeating track tile, px. */
  tilePx: number;
}

export interface CarPhysics {
  /** Acceleration while UP/W is held, px/s². */
  accel: number;
  /** Passive decay when coasting, px/s². */
  decay: number;
  /** Speed cap, px/s. */
  maxSpeed: number;
}

export interface GameConfig {
  canvas: { width: number; height: number };
  track: TrackConfig;
  car: { width: number; height: number; physics: CarPhysics };
  seatColors: [string, string, string, string];
  net: { writeIntervalMs: number };
  history: { limit: number };
}

export const defaultConfig: GameConfig = {
  canvas: { width: 900, height: 600 },
  track: {
    length: 4000,
    laneX: [210, 370, 530, 690],
    width: 640,
    tilePx: 256,
  },
  car: {
    width: 56,
    height: 96,
    physics: { accel: 420, decay: 300, maxSpeed: 520 },
  },
  seatColors: ['#ff5d5d', '#58a6ff', '#7ddc7d', '#ffd75c'],
  net: { writeIntervalMs: 120 },
  history: { limit: 15 },
};
