import { describe, expect, it } from 'vitest';
import { buildModel, nearestDay, optionFor, pointAt, tooltipValue } from './chartAdapter';

const point = (date: string, value: number) => ({ date, value });

describe('chart adapter', () => {
  it('maps all four public series to the chart layer', () => {
    const model = buildModel({
      area: [point('2026-06-10', 2.04)],
      spline: [point('2026-06-10', 610.78)],
      line: [point('2026-06-10', 3)],
      bar: [point('2026-06-10', 0.68)],
    });
    const series = optionFor(model).series as Array<{ id: string; data: number[][] }>;
    expect(series.map(({ id }) => id)).toEqual(['area', 'bar', 'spline', 'line']);
    expect(Object.fromEntries(series.map(({ id, data }) => [id, data[0]?.[1]]))).toEqual({
      area: 2.04, bar: 0.68, spline: 610.78, line: 3,
    });
  });

  it('keeps sparse series aligned by their actual calendar day', () => {
    const model = buildModel({
      area: [point('2026-06-10', 1), point('2026-06-11', 2), point('2026-06-12', 3)],
      line: [point('2026-06-10', 10), point('2026-06-12', 30)],
      bar: [point('2026-06-11', 20), point('2026-06-12', 30)],
      spline: [point('2026-06-10', 100), point('2026-06-11', 200), point('2026-06-12', 300)],
    });
    const middle = model.allDays[1]!;
    expect(pointAt(model.line, middle)).toBeUndefined();
    expect(pointAt(model.bar, middle)?.value).toBe(20);
    expect(nearestDay(model.allDays, middle - 0.5)).toBe(model.allDays[0]);
  });

  it('handles one empty series and a fully empty dataset with finite domains', () => {
    const partial = buildModel({ area: [], spline: [point('2026-06-10', 1)], line: [], bar: [] });
    expect(partial.area).toEqual([]);
    expect(partial.allDays).toHaveLength(1);
    const empty = buildModel({ area: [], spline: [], line: [], bar: [] });
    expect(empty.allDays).toEqual([]);
    expect([empty.xMin, empty.xMax, ...empty.areaRange]).toEqual([0, 1, 0, 1]);
  });

  it('formats tooltip values according to their series', () => {
    expect(tooltipValue('area', -2.5)).toBe('-2.50');
    expect(tooltipValue('bar', 0)).toBe('0.00');
    expect(tooltipValue('line', 3.5)).toBe('3.5');
    expect(tooltipValue('spline', 1e12)).toBe('1.00e+12');
  });
});
