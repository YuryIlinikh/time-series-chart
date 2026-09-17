import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { init, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { TimeSeriesChartProps } from './TimeSeriesChart.types';
import { formatCalendarDate } from './calendar';
import { buildModel, COLORS, nearestDay, optionFor, pointAt, tooltipValue, type SeriesKey } from './chartAdapter';
import './TimeSeriesChart.css';

use([LineChart, BarChart, GridComponent, CanvasRenderer]);

const DETAILED_POINT_LIMIT = 1_000;
type ChartInstance = ReturnType<typeof init>;

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

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      cancelHide();
      hideTimerRef.current = window.setTimeout(() => {
        setHover((current) => (current ? { ...current, visible: false } : null));
        clearTimerRef.current = window.setTimeout(() => setHover(null), 150);
      }, 200);
    };

    const onDocumentPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !interactionArea.contains(event.target as Node)) {
        cancelHide();
        setHover(null);
      }
    };

    interactionArea.addEventListener('pointerdown', onMove);
    interactionArea.addEventListener('pointermove', onMove);
    interactionArea.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    return () => {
      cancelHide();
      interactionArea.removeEventListener('pointerdown', onMove);
      interactionArea.removeEventListener('pointermove', onMove);
      interactionArea.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
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
