import type { TimeSeriesPoint } from './TimeSeriesChart.types';

export interface NormalizedPoint {
  readonly date: string;
  readonly day: number;
  readonly value: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1] ?? 0;
}

/** Converts a proleptic Gregorian civil date to an integer day without Date/timezone APIs. */
function civilToDay(year: number, month: number, day: number): number {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra;
}

export function parseCalendarDate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return civilToDay(year, month, day);
}

export function normalizeSeries(points: readonly TimeSeriesPoint[]): NormalizedPoint[] {
  if (!Array.isArray(points)) return [];

  const byDay = new Map<number, NormalizedPoint>();
  for (const candidate of points as readonly unknown[]) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const { date, value } = candidate as Partial<TimeSeriesPoint>;
    const day = parseCalendarDate(date);
    if (day === null || typeof value !== 'number' || !Number.isFinite(value)) continue;
    byDay.set(day, { date: date as string, day, value });
  }

  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

export function formatCalendarDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}
