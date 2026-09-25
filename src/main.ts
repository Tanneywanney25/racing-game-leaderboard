import p5 from 'p5';
import { defaultConfig } from './config';
import {
  crossedFinish,
  stepCar,
  type RoomRacers,
} from './game/model';
import { Net, readNetEnv } from './net/firebase';
import { createSketch, type RenderState } from './sketch';
import { BestTimes, type StorageLike } from './systems/history';
import { LeaderboardPanel } from './ui/leaderboard';
import { Lobby } from './ui/lobby';

function safeStorage(): StorageLike {
  try {
    const probe = '__racer_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}

function require<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const cfg = defaultConfig;
const storage = safeStorage();
const bestTimes = new BestTimes(storage, cfg.history.limit);
const panel = new LeaderboardPanel(require('#leaderboard'), cfg);
const bestEl = require<HTMLElement>('#best-times');
const speedEl = require<HTMLElement>('#hud-speed');
const distEl = require<HTMLElement>('#hud-distance');
const connEl = require<HTMLElement>('#hud-conn');

const state: RenderState = {
  phase: 'lobby',
  mySeat: null,
  myCar: { distance: 0, speed: 0 },
  racers: {},
};

let net: Net | null = null;
let myName = '';
let startedAt: number | null = null;
let finishedAtLocal: number | null = null;
let lastWriteAt = 0;

const lobby = new Lobby(require('#lobby'), cfg, {
  onJoin: (name) => {
    if (!net) return;
    myName = name;
    void net.claimSeat(name).then((seat) => {
      if (seat === null) lobby.showRoomFull();
      else state.mySeat = seat;
    });
  },
  onStart: () => net?.startRace(),
  onRematch: () => net?.resetToLobby(state.racers),
});

function syncLobby(): void {
  if (!net) return;
  if (state.phase === 'racing') {
    lobby.hide();
  } else if (state.phase === 'finished') {
    lobby.showRematch(state.mySeat);
  } else if (state.mySeat === null) {
    lobby.showJoin();
  } else {
    lobby.showSeats(state.racers, state.mySeat);
  }
}

panel.renderBestTimes(bestEl, bestTimes.load());

const env = readNetEnv(import.meta.env as Record<string, string | undefined>);
if (env) {
  net = new Net(env);
  net.watchConnection((online) => {
    connEl.textContent = online ? '● online' : '● offline';
    connEl.dataset['state'] = online ? 'online' : 'offline';
  });
  net.watchRoom((room) => {
    state.racers = room.players ?? {};
    startedAt = room.startedAt ?? null;
    const next = room.phase ?? 'lobby';
    if (next === 'racing' && state.phase !== 'racing') {
      state.myCar = { distance: 0, speed: 0 };
      finishedAtLocal = null;
    }
    state.phase = next;
    if (state.mySeat !== null && !state.racers[`player${state.mySeat}`]) {
      if (next === 'lobby') state.mySeat = null;
    }
    syncLobby();
  });
  syncLobby();
} else {
  connEl.textContent = '○ offline build';
  lobby.showUnconfigured();
}

function allPresentFinished(racers: RoomRacers): boolean {
  const entries = Object.values(racers);
  return entries.length > 0 && entries.every((r) => r.finishedAt !== undefined);
}

new p5(
  createSketch({
    cfg,
    state,
    onFrame: (p, dtMs) => {
      const now = Date.now();
      if (state.phase === 'racing' && state.mySeat !== null && net) {
        const throttle = p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87);
        if (finishedAtLocal === null) {
          state.myCar = stepCar(state.myCar, throttle, dtMs / 1000, cfg.car.physics);
        }

        if (finishedAtLocal === null && crossedFinish(state.myCar.distance, cfg.track.length)) {
          finishedAtLocal = now;
          if (startedAt !== null) {
            // Rank at the moment of finishing is provisional; the final table uses finishedAt order.
            const seconds = (finishedAtLocal - startedAt) / 1000;
            const finishedCount = Object.values(state.racers).filter(
              (r) => r.finishedAt !== undefined,
            ).length;
            bestTimes.add({ date: new Date().toISOString(), seconds, rank: finishedCount + 1 });
            panel.renderBestTimes(bestEl, bestTimes.load());
          }
        }

        if (now - lastWriteAt >= cfg.net.writeIntervalMs) {
          lastWriteAt = now;
          net.writeRacer(state.mySeat, {
            name: myName,
            distance: state.myCar.distance,
            updatedAt: now,
            ...(finishedAtLocal !== null ? { finishedAt: finishedAtLocal } : {}),
          });
        }

        speedEl.textContent = `Speed: ${Math.round(state.myCar.speed)} px/s`;
        distEl.textContent = `Distance: ${Math.min(cfg.track.length, Math.round(state.myCar.distance))} / ${cfg.track.length}`;
        panel.renderLive(state.racers, state.mySeat, startedAt);

        if (state.mySeat === 1 && allPresentFinished(state.racers)) {
          net.finishRace();
        }
      } else if (state.phase === 'finished') {
        panel.renderFinished(state.racers, state.mySeat, startedAt);
      } else {
        panel.renderLive(state.racers, state.mySeat, startedAt);
      }
    },
  }),
);
