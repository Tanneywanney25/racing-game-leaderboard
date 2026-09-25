import { describe, expect, it } from 'vitest';
import { rankRacers, type RoomRacers } from '../src/game/model';

const racer = (name: string, distance: number, finishedAt?: number): { name: string; distance: number; updatedAt: number; finishedAt?: number } => ({
  name,
  distance,
  updatedAt: 0,
  ...(finishedAt !== undefined ? { finishedAt } : {}),
});

describe('rankRacers at the finish', () => {
  it('orders finished racers by finishedAt ascending', () => {
    const room: RoomRacers = {
      player1: racer('A', 4000, 3000),
      player2: racer('B', 4000, 1000),
      player3: racer('C', 4000, 2000),
    };
    const ranked = rankRacers(room);
    expect(ranked.map((r) => r.racer.name)).toEqual(['B', 'C', 'A']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('finished racers always outrank unfinished ones, regardless of distance', () => {
    const room: RoomRacers = {
      player1: racer('Slowpoke', 4000, 9000),
      player2: racer('AlmostThere', 3999),
    };
    const ranked = rankRacers(room);
    expect(ranked[0]!.racer.name).toBe('Slowpoke');
    expect(ranked[1]!.racer.name).toBe('AlmostThere');
  });

  it('empty seats are skipped', () => {
    const room: RoomRacers = { player3: racer('Solo', 120) };
    const ranked = rankRacers(room);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.seat).toBe(3);
    expect(ranked[0]!.rank).toBe(1);
  });
});

describe('live position sort (distance)', () => {
  it('sorts unfinished racers by distance descending', () => {
    const room: RoomRacers = {
      player1: racer('Low', 100),
      player2: racer('High', 900),
      player3: racer('Mid', 500),
    };
    expect(rankRacers(room).map((r) => r.racer.name)).toEqual(['High', 'Mid', 'Low']);
  });

  it('assigns sequential ranks to distinct distances', () => {
    const room: RoomRacers = {
      player1: racer('A', 10),
      player2: racer('B', 20),
      player3: racer('C', 30),
      player4: racer('D', 40),
    };
    expect(rankRacers(room).map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
});

describe('tie handling (competition ranking)', () => {
  it('identical finish times share a rank and the next racer skips', () => {
    const room: RoomRacers = {
      player1: racer('A', 4000, 1000),
      player2: racer('B', 4000, 1000),
      player3: racer('C', 4000, 2000),
    };
    const ranked = rankRacers(room);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('identical distances among unfinished racers share a rank', () => {
    const room: RoomRacers = {
      player1: racer('A', 500),
      player2: racer('B', 500),
      player3: racer('C', 100),
    };
    const ranked = rankRacers(room);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('a finished and an unfinished racer never tie', () => {
    const room: RoomRacers = {
      player1: racer('F', 4000, 5000),
      player2: racer('U', 4000),
    };
    expect(rankRacers(room).map((r) => r.rank)).toEqual([1, 2]);
  });
});
