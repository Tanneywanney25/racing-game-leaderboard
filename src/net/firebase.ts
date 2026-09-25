/** Typed Firebase Realtime Database layer — the only Firebase-aware module. */

import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  set,
  update,
  type Database,
} from 'firebase/database';
import { SEATS, type RacePhase, type RacerData, type RoomRacers, type Seat } from '../game/model';

export interface NetEnv {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
}

export function readNetEnv(env: Record<string, string | undefined>): NetEnv | null {
  const apiKey = env['VITE_FIREBASE_API_KEY'];
  const databaseURL = env['VITE_FIREBASE_DATABASE_URL'];
  if (!apiKey || !databaseURL) return null;
  return {
    apiKey,
    databaseURL,
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'] ?? '',
    projectId: env['VITE_FIREBASE_PROJECT_ID'] ?? '',
    appId: env['VITE_FIREBASE_APP_ID'] ?? '',
  };
}

const ROOM = 'races/default';

export interface RoomSnapshot {
  phase?: RacePhase;
  startedAt?: number;
  players?: RoomRacers;
}

export class Net {
  private readonly db: Database;

  constructor(env: NetEnv) {
    const app = initializeApp(env);
    this.db = getDatabase(app);
  }

  watchConnection(cb: (online: boolean) => void): void {
    onValue(ref(this.db, '.info/connected'), (snap) => cb(snap.val() === true));
  }

  watchRoom(cb: (room: RoomSnapshot) => void): void {
    onValue(ref(this.db, ROOM), (snap) => cb((snap.val() as RoomSnapshot | null) ?? {}));
  }

  /** Atomically claim the lowest free seat (max 4); null when the grid is full. */
  async claimSeat(name: string): Promise<Seat | null> {
    let claimed: Seat | null = null;
    await runTransaction(ref(this.db, `${ROOM}/players`), (current: RoomRacers | null) => {
      const players = current ?? {};
      const seat = SEATS.find((s) => !players[`player${s}`]) ?? null;
      claimed = seat;
      if (seat === null) return players;
      const me: RacerData = { name, distance: 0, updatedAt: Date.now() };
      return { ...players, [`player${seat}`]: me };
    });
    if (claimed !== null) {
      void onDisconnect(ref(this.db, `${ROOM}/players/player${claimed}`)).remove();
    }
    return claimed;
  }

  writeRacer(seat: Seat, data: RacerData): void {
    void set(ref(this.db, `${ROOM}/players/player${seat}`), data);
  }

  startRace(): void {
    void update(ref(this.db, ROOM), { phase: 'racing' satisfies RacePhase, startedAt: Date.now() });
  }

  finishRace(): void {
    void update(ref(this.db, ROOM), { phase: 'finished' satisfies RacePhase });
  }

  /** Reset for a rematch: zero distances, clear finish times, back to lobby. */
  resetToLobby(players: RoomRacers): void {
    const cleared: RoomRacers = {};
    for (const seat of SEATS) {
      const p = players[`player${seat}`];
      if (p) cleared[`player${seat}`] = { name: p.name, distance: 0, updatedAt: Date.now() };
    }
    void update(ref(this.db, ROOM), { phase: 'lobby' satisfies RacePhase, players: cleared });
  }
}
