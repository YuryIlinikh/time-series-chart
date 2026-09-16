import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { init, use, type EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { TimeSeriesChartProps } from './TimeSeriesChart.types';
import {
  formatCalendarDate,
  normalizeSeries,
  type NormalizedPoint,
} from './calendar';
import './TimeSeriesChart.css';

use([LineChart, BarChart, GridComponent, CanvasRenderer]);

const COLORS = {
  area: '#fff36f',
  bar: '#3b70ff',
  spline: '#0c8400',
  line: '#b500fe',
} as const;

const DETAILED_POINT_LIMIT = 1_000;
const ANIMATED_POINT_LIMIT = 4_000;

type SeriesKey = keyof typeof COLORS;
type ChartInstance = ReturnType<typeof init>;

interface ChartModel {
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

interface TooltipItem {
  readonly key: SeriesKey;
  readonly label: string;
  readonly value: number;
}

interface Halo {
  readonly key: SeriesKey;
  readonly x: number;
  readonly y: number;
}

interface HoverState {
  readonly date: string;
  readonly x: number;
  readonly y: number;
  readonly items: TooltipItem[];
  readonly halos: Halo[];
  readonly visible: boolean;
}

const SERIES_META: readonly {
  key: SeriesKey;
  label: string;
  yAxisIndex: number;
}[] = [
  { key: 'area', label: 'Cost', yAxisIndex: 0 },
  { key: 'bar', label: 'CPA', yAxisIndex: 3 },
  { key: 'spline', label: 'ROI confirmed', yAxisIndex: 1 },
  { key: 'line', label: 'Conversions', yAxisIndex: 2 },
];

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

function buildModel(props: TimeSeriesChartProps): ChartModel {
  const area = normalizeSeries(props.area);
  const spline = normalizeSeries(props.spline);
  const line = normalizeSeries(props.line);
  const bar = normalizeSeries(props.bar);
  const allDays = [...new Set([...area, ...spline, ...line, ...bar].map((point) => point.day))].sort(
    (a, b) => a - b,
  );
  const [xMin, xMax] = xDomain(allDays);

  return {
    area,
    spline,
    line,
    bar,
    allDays,
    xMin,
    xMax,
    areaRange: valueRange(area.map((point) => point.value), 1.1),
    barRange: valueRange(bar.map((point) => point.value), 40),
    splineRange: valueRange(spline.map((point) => point.value), 1.1),
    lineRange: valueRange(line.map((point) => point.value), 1.25),
  };
}

function optionFor(model: ChartModel): EChartsCoreOption {
  const pointCount = model.area.length + model.spline.length + model.line.length + model.bar.length;
  const showSymbols = pointCount <= DETAILED_POINT_LIMIT;

  const hiddenAxis = (range: readonly [number, number]) => ({
    type: 'value' as const,
    min: range[0],
    max: range[1],
    show: false,
    scale: false,
  });

  return {
    animation: pointCount <= ANIMATED_POINT_LIMIT,
    animationDuration: 350,
    animationDurationUpdate: 220,
    grid: { left: 0, top: 0, right: 0, bottom: 0, containLabel: false },
    xAxis: {
      type: 'value',
      min: model.xMin,
      max: model.xMax,
      show: false,
      scale: true,
    },
    yAxis: [
      hiddenAxis(model.areaRange),
      hiddenAxis(model.splineRange),
      hiddenAxis(model.lineRange),
      hiddenAxis(model.barRange),
    ],
    series: [
      {
        id: 'area',
        name: 'Cost',
        type: 'line',
        yAxisIndex: 0,
        data: model.area.map((point) => [point.day, point.value]),
        smooth: 0.5,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: showSymbols,
        silent: true,
        clip: true,
        lineStyle: { color: COLORS.area, width: 1.5 },
        itemStyle: { color: COLORS.area, borderColor: '#fff', borderWidth: 1 },
        areaStyle: { color: COLORS.area, opacity: 0.35 },
        emphasis: { disabled: true },
        z: 1,
      },
      {
        id: 'bar',
        name: 'CPA',
        type: 'bar',
        yAxisIndex: 3,
        data: model.bar.map((point) => [point.day, point.value]),
        barWidth: 37,
        barMaxWidth: 37,
        barMinHeight: 2,
        silent: true,
        clip: true,
        itemStyle: {
          color: COLORS.bar,
          borderColor: '#f8f8ff',
          borderWidth: 1,
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: { disabled: true },
        z: 2,
      },
      {
        id: 'spline',
        name: 'ROI confirmed',
        type: 'line',
        yAxisIndex: 1,
        data: model.spline.map((point) => [point.day, point.value]),
        smooth: 0.45,
        smoothMonotone: 'x',
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: showSymbols,
        silent: true,
        clip: true,
        lineStyle: { color: COLORS.spline, width: 5, cap: 'round', join: 'round' },
        itemStyle: { color: COLORS.spline },
        emphasis: { disabled: true },
        z: 3,
      },
      {
        id: 'line',
        name: 'Conversions',
        type: 'line',
        yAxisIndex: 2,
        data: model.line.map((point) => [point.day, point.value]),
        smooth: false,
        symbol: 'rect',
        symbolSize: 12,
        showSymbol: showSymbols,
        silent: true,
        clip: true,
        lineStyle: { color: COLORS.line, width: 2 },
        itemStyle: { color: COLORS.line },
        emphasis: { disabled: true },
        z: 4,
      },
    ],
  };
}

function nearestDay(days: readonly number[], target: number): number | null {
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

function pointAt(points: readonly NormalizedPoint[], day: number): NormalizedPoint | undefined {
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

function tooltipValue(key: SeriesKey, value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e9 || (magnitude > 0 && magnitude < 0.01)) return value.toExponential(2);
  if (key === 'line') return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return value.toFixed(2);
}

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const hideTimerRef = useRef<number>();
  const clearTimerRef = useRef<number>();
  const resizeFrameRef = useRef<number>();
  const [hover, setHover] = useState<HoverState | null>(null);
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 336, height: 178 });

  const model = useMemo(
    () => buildModel(props),
    [props.area, props.spline, props.line, props.bar],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const chart = init(canvas, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(optionFor(model), { notMerge: true });
    setHover(null);
  }, [model]);

  useEffect(() => {
    const pointCount = model.area.length + model.spline.length + model.line.length + model.bar.length;
    if (pointCount > DETAILED_POINT_LIMIT) return;
    chartRef.current?.setOption({
      series: [{ id: 'spline', lineStyle: { width: hover?.visible ? 2 : 5 } }],
    });
  }, [hover?.visible, model]);

  useEffect(() => {
    const host = hostRef.current;
    const chart = chartRef.current;
    if (!host || !chart) return;

    const updateSize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setHostSize({ width, height });
      chart.resize({ width, height });
      setHover(null);
    };
    updateSize();

    const observer = new ResizeObserver(() => {
      if (resizeFrameRef.current !== undefined) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(updateSize);
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== undefined) cancelAnimationFrame(resizeFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const chart = chartRef.current;
    if (!host || !chart || model.allDays.length === 0) return;
    const interactionArea = host.closest<HTMLElement>('[data-chart-interaction-area]') ?? host;

    const cancelHide = () => {
      if (hideTimerRef.current !== undefined) window.clearTimeout(hideTimerRef.current);
      if (clearTimerRef.current !== undefined) window.clearTimeout(clearTimerRef.current);
    };

    const onMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right) {
        cancelHide();
        setHover(null);
        return;
      }
      const x = event.clientX - bounds.left;
      const y = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height));
      cancelHide();

      const width = Math.max(chart.getWidth(), 1);
      const targetDay = model.xMin + (x / width) * (model.xMax - model.xMin);
      const day = nearestDay(model.allDays, targetDay);
      if (day === null) return;

      const items: TooltipItem[] = [];
      const halos: Halo[] = [];
      let date = '';
      for (const meta of SERIES_META) {
        const point = pointAt(model[meta.key], day);
        if (!point) continue;
        date ||= point.date;
        items.push({ key: meta.key, label: meta.label, value: point.value });
        const pixel = chart.convertToPixel(
          { xAxisIndex: 0, yAxisIndex: meta.yAxisIndex },
          [point.day, point.value],
        ) as number[];
        if (meta.key !== 'bar' && Number.isFinite(pixel[0]) && Number.isFinite(pixel[1])) {
          halos.push({ key: meta.key, x: pixel[0]!, y: pixel[1]! });
        }
      }
      if (date) setHover({ date, x, y, items, halos, visible: true });
    };

    const onLeave = () => {
      cancelHide();
      hideTimerRef.current = window.setTimeout(() => {
        setHover((current) => (current ? { ...current, visible: false } : null));
        clearTimerRef.current = window.setTimeout(() => setHover(null), 150);
      }, 200);
    };

    interactionArea.addEventListener('pointermove', onMove);
    interactionArea.addEventListener('pointerleave', onLeave);
    return () => {
      cancelHide();
      interactionArea.removeEventListener('pointermove', onMove);
      interactionArea.removeEventListener('pointerleave', onLeave);
    };
  }, [model]);

  useEffect(
    () => () => {
      if (hideTimerRef.current !== undefined) window.clearTimeout(hideTimerRef.current);
      if (clearTimerRef.current !== undefined) window.clearTimeout(clearTimerRef.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!hover || !tooltipRef.current) return;
    const { width, height } = tooltipRef.current.getBoundingClientRect();
    if (width !== tooltipSize.width || height !== tooltipSize.height) {
      setTooltipSize({ width, height });
    }
  }, [hover, tooltipSize.height, tooltipSize.width]);

  const tooltipPosition = useMemo(() => {
    if (!hover) return { left: 0, top: 0 };
    const gap = 16;
    const availableWidth = Math.max(hostSize.width, 0);
    const availableHeight = Math.max(hostSize.height, 0);
    let left = hover.x + gap;
    let top = hover.y + gap;
    if (left + tooltipSize.width > availableWidth) left = hover.x - tooltipSize.width - gap;
    if (top + tooltipSize.height > availableHeight) top = hover.y - tooltipSize.height - gap;
    return {
      left: Math.max(0, Math.min(left, Math.max(availableWidth - tooltipSize.width, 0))),
      top: Math.max(0, Math.min(top, Math.max(availableHeight - tooltipSize.height, 0))),
    };
  }, [hostSize, hover, tooltipSize]);

  return (
    <div
      ref={hostRef}
      className="time-series-chart"
      role="img"
      aria-label="Time series chart with Cost, CPA, ROI confirmed and Conversions"
    >
      <div ref={canvasRef} className="time-series-chart__canvas" />

      {model.allDays.length === 0 && (
        <div className="time-series-chart__empty">Нет данных</div>
      )}

      {hover?.halos.map((halo) => (
        <span
          key={halo.key}
          className={`time-series-chart__halo time-series-chart__halo--${halo.key}`}
          style={{ left: halo.x, top: halo.y }}
        >
          <span className="time-series-chart__halo-marker" />
        </span>
      ))}

      {hover && (
        <div
          ref={tooltipRef}
          className={`time-series-chart__tooltip${hover.visible ? ' is-visible' : ''}`}
          style={tooltipPosition}
          aria-hidden="true"
        >
          <div className="time-series-chart__tooltip-date">{formatCalendarDate(hover.date)}</div>
          {hover.items.map((item) => (
            <div key={item.key} className="time-series-chart__tooltip-row">
              <span
                className="time-series-chart__tooltip-dot"
                style={{ backgroundColor: COLORS[item.key] }}
              />
              <span>{item.label}:&nbsp;</span>
              <strong>{tooltipValue(item.key, item.value)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
