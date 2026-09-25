import type { GameConfig } from '../config';
import { rankRacers, type RoomRacers, type Seat } from '../game/model';
import type { FinishRecord } from '../systems/history';

/** Live race panel: positions during the race, finish table, personal best times. */
export class LeaderboardPanel {
  constructor(
    private readonly el: HTMLElement,
    private readonly cfg: GameConfig,
  ) {}

  renderLive(racers: RoomRacers, mySeat: Seat | null, startedAt: number | null): void {
    const ranked = rankRacers(racers);
    const rows = ranked
      .map((r) => {
        const pct = Math.min(100, (r.racer.distance / this.cfg.track.length) * 100);
        const me = r.seat === mySeat ? ' me' : '';
        const status = r.finished
          ? startedAt !== null && r.racer.finishedAt !== undefined
            ? `🏁 ${((r.racer.finishedAt - startedAt) / 1000).toFixed(2)}s`
            : '🏁'
          : `${Math.round(pct)}%`;
        return `<div class="pos-row${me}">
          <span class="rank">#${r.rank}</span>
          <span class="chip" style="background:${this.cfg.seatColors[r.seat - 1]}"></span>
          <span class="pname">${escapeHtml(r.racer.name)}</span>
          <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${this.cfg.seatColors[r.seat - 1]}"></div></div>
          <span class="status">${status}</span>
        </div>`;
      })
      .join('');
    this.el.innerHTML = `<h2>Positions</h2>${rows || '<p>No racers yet.</p>'}`;
  }

  renderFinished(racers: RoomRacers, mySeat: Seat | null, startedAt: number | null): void {
    const ranked = rankRacers(racers);
    const rows = ranked
      .map((r) => {
        const time =
          r.finished && startedAt !== null && r.racer.finishedAt !== undefined
            ? `${((r.racer.finishedAt - startedAt) / 1000).toFixed(2)}s`
            : 'DNF';
        const me = r.seat === mySeat ? ' class="me"' : '';
        return `<tr${me}><td>#${r.rank}</td>
          <td><span class="chip" style="background:${this.cfg.seatColors[r.seat - 1]}"></span> ${escapeHtml(r.racer.name)}</td>
          <td>${time}</td></tr>`;
      })
      .join('');
    this.el.innerHTML = `
      <h2>Finish order</h2>
      <table><thead><tr><th></th><th>Racer</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  renderBestTimes(el: HTMLElement, records: FinishRecord[]): void {
    if (records.length === 0) {
      el.innerHTML = '<h2>My best times</h2><p>Finish a race to record one.</p>';
      return;
    }
    const rows = records
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${r.seconds.toFixed(2)}s</td><td>#${r.rank}</td><td>${new Date(r.date).toLocaleDateString()}</td></tr>`,
      )
      .join('');
    el.innerHTML = `
      <h2>My best times</h2>
      <table><thead><tr><th></th><th>Time</th><th>Rank</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
