import type p5 from 'p5';
import type { GameConfig } from './config';
import type { CarState, RoomRacers, Seat } from './game/model';
import { SEATS } from './game/model';

export interface RenderState {
  phase: 'lobby' | 'racing' | 'finished';
  mySeat: Seat | null;
  myCar: CarState;
  racers: RoomRacers;
}

export interface SketchDeps {
  cfg: GameConfig;
  state: RenderState;
  onFrame: (p: p5, dtMs: number) => void;
}

/** p5 render layer: tiled vertical track, follow camera, four lanes of cars. */
export function createSketch(deps: SketchDeps): (p: p5) => void {
  return (p: p5): void => {
    const { cfg, state } = deps;
    let trackImg: p5.Image | undefined;
    const carImgs = new Map<Seat, p5.Image>();

    p.preload = () => {
      trackImg = p.loadImage('/assets/track.png');
      for (const seat of SEATS) carImgs.set(seat, p.loadImage(`/assets/car${seat}.png`));
    };

    p.setup = () => {
      p.createCanvas(cfg.canvas.width, cfg.canvas.height).parent('stage');
      p.imageMode(p.CENTER);
      p.textFont('Segoe UI, system-ui, sans-serif');
    };

    /** Screen y for a world distance, with my car pinned at 62% height. */
    function screenY(distance: number, cameraDistance: number): number {
      return cfg.canvas.height * 0.62 - (distance - cameraDistance);
    }

    function drawTrack(cameraDistance: number): void {
      const { width, height } = cfg.canvas;
      const trackLeft = (width - cfg.track.width) / 2;
      p.background(34, 40, 34);

      // Repeating asphalt tiles across the visible distance window.
      const tile = cfg.track.tilePx;
      const first = Math.floor((cameraDistance - height) / tile) * tile;
      for (let d = first; d < cameraDistance + height; d += tile) {
        const y = screenY(d, cameraDistance);
        if (trackImg) {
          p.image(trackImg, width / 2, y - tile / 2, cfg.track.width, tile);
        }
      }

      // Lane separators.
      p.stroke(255, 255, 255, 70);
      p.strokeWeight(2);
      for (let i = 1; i < 4; i++) {
        const x = trackLeft + (cfg.track.width / 4) * i;
        p.line(x, 0, x, height);
      }
      p.noStroke();

      // Start and finish lines.
      for (const [d, label] of [
        [0, 'START'],
        [cfg.track.length, 'FINISH'],
      ] as const) {
        const y = screenY(d, cameraDistance);
        if (y < -40 || y > height + 40) continue;
        p.fill(255);
        for (let x = 0; x < cfg.track.width; x += 32) {
          p.rect(trackLeft + x, y - 6, 16, 12);
        }
        p.textAlign(p.LEFT);
        p.textSize(14);
        p.text(label, trackLeft + cfg.track.width + 10, y + 5);
      }
    }

    function drawCars(cameraDistance: number): void {
      for (const seat of SEATS) {
        const racer = state.racers[`player${seat}`];
        if (!racer) continue;
        const isMe = seat === state.mySeat;
        const distance = isMe ? state.myCar.distance : racer.distance;
        const x = cfg.track.laneX[seat - 1] ?? 0;
        const y = screenY(distance, cameraDistance);
        if (y < -80 || y > cfg.canvas.height + 80) continue;

        if (isMe) {
          p.noFill();
          p.stroke(cfg.seatColors[seat - 1] ?? "#ffffff");
          p.strokeWeight(3);
          p.circle(x, y, cfg.car.height + 18);
          p.noStroke();
        }
        const img = carImgs.get(seat);
        if (img) p.image(img, x, y, cfg.car.width, cfg.car.height);
        p.fill(255);
        p.stroke(0);
        p.strokeWeight(3);
        p.textAlign(p.CENTER);
        p.textSize(13);
        p.text(racer.name, x, y - cfg.car.height / 2 - 10);
        p.noStroke();
      }
    }

    p.draw = () => {
      const dtMs = Math.min(p.deltaTime, 100);
      deps.onFrame(p, dtMs);

      const camera = state.mySeat !== null ? state.myCar.distance : cfg.track.length / 2;
      drawTrack(camera);
      if (state.phase !== 'lobby') drawCars(camera);

      if (state.phase === 'lobby') {
        p.fill(255);
        p.textAlign(p.CENTER);
        p.textSize(40);
        p.text('Top-Down Racer', cfg.canvas.width / 2, 180);
        p.textSize(16);
        p.text('Join a seat, then hold ↑ / W to race to the finish line.', cfg.canvas.width / 2, 220);
      }
    };
  };
}
