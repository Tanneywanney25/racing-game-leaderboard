export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FinishRecord {
  date: string;
  /** Race time in seconds. */
  seconds: number;
  rank: number;
}

const KEY = 'racer.best-times';

/** Local best-times history for this player, sorted fastest first. */
export class BestTimes {
  constructor(
    private readonly storage: StorageLike,
    private readonly limit: number,
  ) {}

  load(): FinishRecord[] {
    const raw = this.storage.getItem(KEY);
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is FinishRecord =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as FinishRecord).seconds === 'number' &&
          typeof (e as FinishRecord).rank === 'number' &&
          typeof (e as FinishRecord).date === 'string',
      );
    } catch {
      return [];
    }
  }

  add(record: FinishRecord): void {
    const entries = [...this.load(), record]
      .sort((a, b) => a.seconds - b.seconds)
      .slice(0, this.limit);
    this.storage.setItem(KEY, JSON.stringify(entries));
  }

  get best(): FinishRecord | null {
    return this.load()[0] ?? null;
  }
}
