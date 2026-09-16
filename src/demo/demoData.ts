import type { TimeSeriesChartProps, TimeSeriesPoint } from '../components/TimeSeriesChart';

export const referenceData: TimeSeriesChartProps = {
  area: [
    { date: '2026-06-10', value: 2.04 },
    { date: '2026-06-11', value: 25.85 },
    { date: '2026-06-12', value: 44.36 },
    { date: '2026-06-13', value: 55.65 },
    { date: '2026-06-14', value: 63.75 },
  ],
  spline: [
    { date: '2026-06-10', value: 610.78 },
    { date: '2026-06-11', value: 180.5 },
    { date: '2026-06-12', value: 161.47 },
    { date: '2026-06-13', value: 56.33 },
    { date: '2026-06-14', value: 357.25 },
  ],
  line: [
    { date: '2026-06-10', value: 3 },
    { date: '2026-06-11', value: 30 },
    { date: '2026-06-12', value: 36 },
    { date: '2026-06-13', value: 70 },
    { date: '2026-06-14', value: 90 },
  ],
  bar: [
    { date: '2026-06-10', value: 0.68 },
    { date: '2026-06-11', value: 0.86 },
    { date: '2026-06-12', value: 1.23 },
    { date: '2026-06-13', value: 0.79 },
    { date: '2026-06-14', value: 0.71 },
  ],
};

/** A deliberately different range, point count and set of missing dates. */
export const alternateData: TimeSeriesChartProps = {
  area: [
    { date: '2025-11-02', value: 18.4 },
    { date: '2025-11-05', value: 14.2 },
    { date: '2025-11-09', value: 31.8 },
    { date: '2025-11-16', value: 24.6 },
    { date: '2025-11-23', value: 48.1 },
    { date: '2025-12-01', value: 42.7 },
    { date: '2025-12-12', value: 59.3 },
  ],
  spline: [
    { date: '2025-11-02', value: 120 },
    { date: '2025-11-09', value: 385 },
    { date: '2025-11-16', value: 240 },
    { date: '2025-12-01', value: 510 },
    { date: '2025-12-12', value: 330 },
  ],
  line: [
    { date: '2025-11-05', value: 8 },
    { date: '2025-11-16', value: 26 },
    { date: '2025-11-23', value: 19 },
    { date: '2025-12-12', value: 47 },
  ],
  bar: [
    { date: '2025-11-02', value: 1.8 },
    { date: '2025-11-05', value: 2.1 },
    { date: '2025-11-09', value: 1.6 },
    { date: '2025-11-23', value: 2.7 },
    { date: '2025-12-01', value: 2.3 },
  ],
};

export const edgeCaseData: Record<string, TimeSeriesChartProps> = {
  'Пустая area': {
    ...alternateData,
    area: [],
  },
  'Все серии пусты': {
    area: [],
    spline: [],
    line: [],
    bar: [],
  },
  'Несортированные и с дублем': {
    area: [
      { date: '2026-03-07', value: 40 },
      { date: '2026-03-01', value: 10 },
      { date: '2026-03-04', value: 25 },
      { date: '2026-03-04', value: 30 },
    ],
    spline: [
      { date: '2026-03-08', value: 80 },
      { date: '2026-03-02', value: 220 },
    ],
    line: [{ date: '2026-03-06', value: 14 }],
    bar: [
      { date: '2026-03-01', value: 1.2 },
      { date: '2026-03-05', value: 0.7 },
      { date: '2026-03-08', value: 1.5 },
    ],
  },
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function performanceDates(pointCount: number): string[] {
  const dates: string[] = [];
  let year = 2000;
  let month = 1;
  let day = 1;
  const lengthOfMonth = () => {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
  };

  for (let index = 0; index < pointCount; index += 1) {
    dates.push(`${year}-${pad(month)}-${pad(day)}`);
    day += 1;
    if (day > lengthOfMonth()) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  return dates;
}

export function createPerformanceData(pointCount: number): TimeSeriesChartProps {
  const dates = performanceDates(pointCount);
  const create = (offset: number, amplitude: number): TimeSeriesPoint[] =>
    dates.map((date, index) => ({
      date,
      value: offset + Math.sin(index / 12) * amplitude + (index % 17) / 10,
    }));

  return {
    area: create(50, 24),
    spline: create(400, 180),
    line: create(70, 35),
    bar: create(1.5, 0.8),
  };
}
