import type { EChartsCoreOption } from 'echarts/core';
import type { TimeSeriesChartProps } from './TimeSeriesChart.types';
import { normalizeSeries, type NormalizedPoint } from './calendar';

export const COLORS = {
  area: '#fff36f',
  bar: '#3b70ff',
  spline: '#0c8400',
  line: '#b500fe',
} as const;

export type SeriesKey = keyof typeof COLORS;

export interface ChartModel {
  readonly area: NormalizedPoint[];
  readonly spline: NormalizedPoint[];
  readonly line: NormalizedPoint[];
  readonly bar: NormalizedPoint[];
  readonly allDays: number[];
  readonly xMin: number;
  readonly xMax: number;
  readonly areaRange: readonly [number, number];
  readonly barRange: readonly [number, number];
  readonly splineRange: readonly [number, number];
  readonly lineRange: readonly [number, number];
}

const DETAILED_POINT_LIMIT = 1_000;
const ANIMATED_POINT_LIMIT = 4_000;

function niceCeil(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const steps = [1, 1.2, 1.5, 2, 2.5, 5, 7.5, 10];
  const step = steps.find((candidate) => normalized <= candidate) ?? 10;
  const result = step * magnitude;
  return Number.isFinite(result) ? result : Number.MAX_VALUE;
}

function valueRange(values: readonly number[], upperPadding: number): readonly [number, number] {
  if (values.length === 0) return [0, 1];
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  if (low === high) {
    const padding = Math.max(Math.abs(low) * 0.1, 1);
    return [low - padding, high + padding];
  }
  const paddedHigh = high > 0 ? high * upperPadding : Math.abs(low) * 0.05;
  const paddedLow = low < 0 ? -niceCeil(Math.abs(low) * 1.1) : 0;
  return [paddedLow, niceCeil(paddedHigh)];
}

function xDomain(days: readonly number[]): readonly [number, number] {
  if (days.length === 0) return [0, 1];
  if (days.length === 1) return [days[0]! - 1, days[0]! + 1];
  return [days[0]!, days[days.length - 1]!];
}

export function buildModel(props: TimeSeriesChartProps): ChartModel {
  const area = normalizeSeries(props.area);
  const spline = normalizeSeries(props.spline);
  const line = normalizeSeries(props.line);
  const bar = normalizeSeries(props.bar);
  const allDays = [...new Set([...area, ...spline, ...line, ...bar].map((point) => point.day))]
    .sort((a, b) => a - b);
  const [xMin, xMax] = xDomain(allDays);
  return {
    area, spline, line, bar, allDays, xMin, xMax,
    areaRange: valueRange(area.map((point) => point.value), 1.1),
    barRange: valueRange(bar.map((point) => point.value), 40),
    splineRange: valueRange(spline.map((point) => point.value), 1.1),
    lineRange: valueRange(line.map((point) => point.value), 1.25),
  };
}

export function optionFor(model: ChartModel): EChartsCoreOption {
  const pointCount = model.area.length + model.spline.length + model.line.length + model.bar.length;
  const showSymbols = pointCount <= DETAILED_POINT_LIMIT;
  const hiddenAxis = (range: readonly [number, number]) => ({
    type: 'value' as const, min: range[0], max: range[1], show: false, scale: false,
  });
  return {
    animation: pointCount <= ANIMATED_POINT_LIMIT,
    animationDuration: 350,
    animationDurationUpdate: 220,
    grid: { left: 0, top: 0, right: 0, bottom: 0, containLabel: false },
    xAxis: { type: 'value', min: model.xMin, max: model.xMax, show: false, scale: true },
    yAxis: [hiddenAxis(model.areaRange), hiddenAxis(model.splineRange), hiddenAxis(model.lineRange), hiddenAxis(model.barRange)],
    series: [
      { id: 'area', name: 'Cost', type: 'line', yAxisIndex: 0, data: model.area.map((point) => [point.day, point.value]), smooth: 0.5, symbol: 'circle', symbolSize: 4, showSymbol: showSymbols, silent: true, clip: true, lineStyle: { color: COLORS.area, width: 1.5 }, itemStyle: { color: COLORS.area, borderColor: '#fff', borderWidth: 1 }, areaStyle: { color: COLORS.area, opacity: 0.35 }, emphasis: { disabled: true }, z: 1 },
      { id: 'bar', name: 'CPA', type: 'bar', yAxisIndex: 3, data: model.bar.map((point) => [point.day, point.value]), barWidth: 37, barMaxWidth: 37, barMinHeight: 2, silent: true, clip: true, itemStyle: { color: COLORS.bar, borderColor: '#f8f8ff', borderWidth: 1, borderRadius: [4, 4, 0, 0] }, emphasis: { disabled: true }, z: 2 },
      { id: 'spline', name: 'ROI confirmed', type: 'line', yAxisIndex: 1, data: model.spline.map((point) => [point.day, point.value]), smooth: 0.45, smoothMonotone: 'x', symbol: 'circle', symbolSize: 4, showSymbol: showSymbols, silent: true, clip: true, lineStyle: { color: COLORS.spline, width: 5, cap: 'round', join: 'round' }, itemStyle: { color: COLORS.spline }, emphasis: { disabled: true }, z: 3 },
      { id: 'line', name: 'Conversions', type: 'line', yAxisIndex: 2, data: model.line.map((point) => [point.day, point.value]), smooth: false, symbol: 'rect', symbolSize: 12, showSymbol: showSymbols, silent: true, clip: true, lineStyle: { color: COLORS.line, width: 2 }, itemStyle: { color: COLORS.line }, emphasis: { disabled: true }, z: 4 },
    ],
  };
}

export function nearestDay(days: readonly number[], target: number): number | null {
  if (days.length === 0) return null;
  let low = 0;
  let high = days.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (days[middle]! < target) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return days[0]!;
  if (low === days.length) return days[days.length - 1]!;
  const before = days[low - 1]!;
  const after = days[low]!;
  return target - before <= after - target ? before : after;
}

export function pointAt(points: readonly NormalizedPoint[], day: number): NormalizedPoint | undefined {
  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const point = points[middle]!;
    if (point.day === day) return point;
    if (point.day < day) low = middle + 1;
    else high = middle - 1;
  }
  return undefined;
}

export function tooltipValue(key: SeriesKey, value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e9 || (magnitude > 0 && magnitude < 0.01)) return value.toExponential(2);
  if (key === 'line') return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return value.toFixed(2);
}
