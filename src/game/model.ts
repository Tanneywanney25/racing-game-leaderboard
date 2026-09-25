/** Pure race model — ranking, sorting, car physics. No p5, no Firebase. */

import type { CarPhysics } from '../config';

export type Seat = 1 | 2 | 3 | 4;
export const SEATS: Seat[] = [1, 2, 3, 4];

export type RacePhase = 'lobby' | 'racing' | 'finished';

export interface RacerData {
  name: string;
  /** Distance covered from the start line, px. */
  distance: number;
  /** Set once the finish line is crossed — ms timestamp. */
  finishedAt?: number;
  updatedAt: number;
}

export type RoomRacers = Partial<Record<`player${Seat}`, RacerData>>;

export interface RankedRacer {
  seat: Seat;
  racer: RacerData;
  /** 1-based rank; ties share a rank (competition ranking: 1,1,3). */
  rank: number;
  finished: boolean;
}

/**
 * Rank all present racers:
 * finished racers first (earlier finishedAt wins), then unfinished by distance.
 * Ties — identical finishedAt, or identical distance among the unfinished —
 * share a rank, and the following racer skips ahead (1,1,3).
 */
export function rankRacers(racers: RoomRacers): RankedRacer[] {
  const entries = SEATS.flatMap((seat) => {
    const racer = racers[`player${seat}`];
    return racer ? [{ seat, racer, finished: racer.finishedAt !== undefined }] : [];
  });

  entries.sort((a, b) => {
    if (a.finished && b.finished) return (a.racer.finishedAt ?? 0) - (b.racer.finishedAt ?? 0);
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.racer.distance - a.racer.distance;
  });

  const ranked: RankedRacer[] = [];
  entries.forEach((entry, i) => {
    let rank = i + 1;
    const prev = ranked[i - 1];
    if (prev && tiedWith(entry, prev)) rank = prev.rank;
    ranked.push({ ...entry, rank });
  });
  return ranked;
}

function tiedWith(
  entry: { finished: boolean; racer: RacerData },
  prev: { finished: boolean; racer: RacerData },
): boolean {
  if (entry.finished && prev.finished) return entry.racer.finishedAt === prev.racer.finishedAt;
  if (!entry.finished && !prev.finished) return entry.racer.distance === prev.racer.distance;
  return false;
}

/** Live position sort used by the side panel (same comparator as ranking). */
export function sortByProgress(racers: RoomRacers): RankedRacer[] {
  return rankRacers(racers);
}

// --- Car physics -------------------------------------------------------------

export interface CarState {
  distance: number;
  speed: number;
}

/**
 * Hold-to-accelerate physics: accelerate while the throttle is held, decay while
 * coasting, clamp to [0, maxSpeed]. Returns a new state (pure).
 */
export function stepCar(state: CarState, throttle: boolean, dtSeconds: number, physics: CarPhysics): CarState {
  const accel = throttle ? physics.accel : -physics.decay;
  const speed = Math.min(physics.maxSpeed, Math.max(0, state.speed + accel * dtSeconds));
  return { speed, distance: state.distance + speed * dtSeconds };
}

/** Has this car crossed the finish line? */
export function crossedFinish(distance: number, trackLength: number): boolean {
  return distance >= trackLength;
}
