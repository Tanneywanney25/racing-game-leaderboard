import { describe, expect, it } from 'vitest';
import { crossedFinish, stepCar, type CarState } from '../src/game/model';

const physics = { accel: 420, decay: 300, maxSpeed: 520 };
const still: CarState = { distance: 0, speed: 0 };

describe('stepCar', () => {
  it('accelerates while the throttle is held', () => {
    const next = stepCar(still, true, 0.5, physics);
    expect(next.speed).toBeCloseTo(210);
    expect(next.distance).toBeCloseTo(105);
  });

  it('caps speed at maxSpeed', () => {
    let state = still;
    for (let i = 0; i < 100; i++) state = stepCar(state, true, 0.1, physics);
    expect(state.speed).toBe(physics.maxSpeed);
  });

  it('decays while coasting and never goes below zero', () => {
    let state: CarState = { distance: 0, speed: 300 };
    state = stepCar(state, false, 0.5, physics);
    expect(state.speed).toBeCloseTo(150);
    state = stepCar(state, false, 5, physics);
    expect(state.speed).toBe(0);
  });

  it('is pure — the input state is not mutated', () => {
    const input: CarState = { distance: 10, speed: 20 };
    stepCar(input, true, 1, physics);
    expect(input).toEqual({ distance: 10, speed: 20 });
  });

  it('distance integrates speed over time', () => {
    let state = still;
    for (let i = 0; i < 60; i++) state = stepCar(state, true, 1 / 60, physics);
    // After 1s of accel from rest with per-step Euler integration,
    // distance ≈ ½at² = 210, slightly above due to end-of-step integration.
    expect(state.distance).toBeGreaterThan(200);
    expect(state.distance).toBeLessThan(225);
  });
});

describe('crossedFinish', () => {
  it('triggers exactly at the line', () => {
    expect(crossedFinish(3999.9, 4000)).toBe(false);
    expect(crossedFinish(4000, 4000)).toBe(true);
    expect(crossedFinish(4200, 4000)).toBe(true);
  });
});
