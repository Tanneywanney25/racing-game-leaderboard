import { describe, expect, it } from 'vitest';
import { BestTimes, type StorageLike } from '../src/systems/history';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

const rec = (seconds: number, rank = 1): { date: string; seconds: number; rank: number } => ({
  date: '2026-09-25T00:00:00.000Z',
  seconds,
  rank,
});

describe('BestTimes', () => {
  it('keeps records sorted fastest first', () => {
    const bt = new BestTimes(memoryStorage(), 10);
    bt.add(rec(30));
    bt.add(rec(12));
    bt.add(rec(20));
    expect(bt.load().map((r) => r.seconds)).toEqual([12, 20, 30]);
    expect(bt.best?.seconds).toBe(12);
  });

  it('enforces the limit by dropping the slowest', () => {
    const bt = new BestTimes(memoryStorage(), 2);
    bt.add(rec(30));
    bt.add(rec(12));
    bt.add(rec(20));
    expect(bt.load().map((r) => r.seconds)).toEqual([12, 20]);
  });

  it('best is null with no records', () => {
    expect(new BestTimes(memoryStorage(), 5).best).toBeNull();
  });

  it('survives corrupt and malformed stored data', () => {
    const bt = new BestTimes(memoryStorage({ 'racer.best-times': '{nope' }), 5);
    expect(bt.load()).toEqual([]);
    const partial = JSON.stringify([rec(9), { junk: 1 }, 'x']);
    const bt2 = new BestTimes(memoryStorage({ 'racer.best-times': partial }), 5);
    expect(bt2.load().map((r) => r.seconds)).toEqual([9]);
  });
});
