import { SEATS, type RoomRacers, type Seat } from '../game/model';
import type { GameConfig } from '../config';

export interface LobbyHooks {
  onJoin: (name: string) => void;
  onStart: () => void;
  onRematch: () => void;
}

/** DOM lobby overlay for up to four racers. */
export class Lobby {
  constructor(
    private readonly root: HTMLElement,
    private readonly cfg: GameConfig,
    private readonly hooks: LobbyHooks,
  ) {}

  showUnconfigured(): void {
    this.root.hidden = false;
    this.root.innerHTML = `
      <h2>Firebase not configured</h2>
      <p>This is the online multiplayer build. Copy <code>.env.example</code> to
      <code>.env</code>, add your Firebase Realtime Database credentials, and restart.
      Full steps are in the README.</p>`;
  }

  showJoin(): void {
    this.root.hidden = false;
    this.root.innerHTML = `
      <h2>Join the race</h2>
      <form id="join-form">
        <input id="join-name" type="text" placeholder="Your name" maxlength="16" required />
        <button type="submit">Join</button>
      </form>
      <p class="hint">Up to four racers. Hold ↑ / W to accelerate.</p>`;
    this.root.querySelector<HTMLFormElement>('#join-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.root.querySelector<HTMLInputElement>('#join-name')?.value.trim();
      if (name) this.hooks.onJoin(name);
    });
  }

  showSeats(racers: RoomRacers, mySeat: Seat): void {
    this.root.hidden = false;
    const rows = SEATS.map((seat) => {
      const r = racers[`player${seat}`];
      const you = seat === mySeat ? ' <em>(you)</em>' : '';
      const chip = `<span class="chip" style="background:${this.cfg.seatColors[seat - 1]}"></span>`;
      return `<li>${chip} Lane ${seat}: ${r ? `<strong>${escapeHtml(r.name)}</strong>${you}` : '<span class="empty">open</span>'}</li>`;
    }).join('');
    const controls =
      mySeat === 1
        ? '<button id="start-btn" type="button">Start race</button><p class="hint">You are the host — solo time-trial is allowed.</p>'
        : '<p class="hint">Waiting for the host (lane 1) to start…</p>';
    this.root.innerHTML = `<h2>Starting grid</h2><ul class="seats">${rows}</ul>${controls}`;
    this.root.querySelector('#start-btn')?.addEventListener('click', () => this.hooks.onStart());
  }

  showRematch(mySeat: Seat | null): void {
    this.root.hidden = false;
    const controls =
      mySeat === 1
        ? '<button id="again-btn" type="button">Rematch</button>'
        : '<p class="hint">Waiting for the host to start a rematch…</p>';
    this.root.innerHTML = `<h2>Race complete</h2>
      <p>Full results are in the leaderboard panel.</p>${controls}`;
    this.root.querySelector('#again-btn')?.addEventListener('click', () => this.hooks.onRematch());
  }

  showRoomFull(): void {
    this.root.hidden = false;
    this.root.innerHTML = '<h2>Grid is full</h2><p>All four lanes are taken.</p>';
  }

  hide(): void {
    this.root.hidden = true;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
