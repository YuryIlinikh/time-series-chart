import { describe, expect, it } from 'vitest';
import { formatCalendarDate, normalizeSeries, parseCalendarDate } from './calendar';

describe('calendar data contract', () => {
  it('accepts valid calendar dates and rejects malformed or impossible ones', () => {
    expect(parseCalendarDate('2024-02-29')).toEqual(expect.any(Number));
    expect(parseCalendarDate('2023-02-29')).toBeNull();
    expect(parseCalendarDate('2026-6-10')).toBeNull();
    expect(parseCalendarDate('2026-06-10T00:00:00Z')).toBeNull();
  });

  it('sorts a copy without mutating input and keeps the last duplicate', () => {
    const input = [
      { date: '2026-06-12', value: 12 },
      { date: '2026-06-10', value: 1 },
      { date: '2026-06-10', value: 10 },
    ];
    expect(normalizeSeries(input).map(({ date, value }) => ({ date, value }))).toEqual([
      { date: '2026-06-10', value: 10 },
      { date: '2026-06-12', value: 12 },
    ]);
    expect(input.map((point) => point.date)).toEqual(['2026-06-12', '2026-06-10', '2026-06-10']);
  });

  it('keeps finite zero, negative, fractional and large values while dropping invalid runtime data', () => {
    const input = [
      { date: '2026-06-10', value: 0 },
      { date: '2026-06-11', value: -2.5 },
      { date: '2026-06-12', value: 1e12 },
      { date: 'bad', value: 4 },
      { date: '2026-06-13', value: Number.NaN },
    ];
    expect(normalizeSeries(input).map((point) => point.value)).toEqual([0, -2.5, 1e12]);
  });

  it('formats a calendar date without timezone conversion', () => {
    expect(formatCalendarDate('2026-06-12')).toBe('12.06.2026');
  });
});
