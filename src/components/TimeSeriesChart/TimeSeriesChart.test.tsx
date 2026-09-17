import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResizeObserverMock } from '../../test/setup';
import { TimeSeriesChart } from './TimeSeriesChart';

const chart = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  getWidth: vi.fn(() => 592),
  convertToPixel: vi.fn(() => [0, 0]),
}));
const init = vi.hoisted(() => vi.fn(() => chart));

vi.mock('echarts/core', () => ({ init, use: vi.fn() }));
vi.mock('echarts/charts', () => ({ BarChart: {}, LineChart: {} }));
vi.mock('echarts/components', () => ({ GridComponent: {} }));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));

const p = (date: string, value: number) => ({ date, value });
const data = {
  area: [p('2026-06-10', 2.04)],
  spline: [p('2026-06-10', 610.78)],
  line: [p('2026-06-10', 3)],
  bar: [p('2026-06-10', 0.68)],
};

describe('TimeSeriesChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ResizeObserverMock.instances.length = 0;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 592, height: 296, top: 0, left: 0, right: 592, bottom: 296, x: 0, y: 0,
      toJSON: () => ({}),
    });
  });

  it('mounts and passes all public series to ECharts', () => {
    render(<TimeSeriesChart {...data} />);
    expect(init).toHaveBeenCalledOnce();
    const option = chart.setOption.mock.calls[0]?.[0] as { series: Array<{ id: string; data: number[][] }> };
    expect(Object.fromEntries(option.series.map(({ id, data }) => [id, data[0]?.[1]]))).toEqual({
      area: 2.04, bar: 0.68, spline: 610.78, line: 3,
    });
  });

  it('updates the chart when props change', () => {
    const { rerender } = render(<TimeSeriesChart {...data} />);
    rerender(<TimeSeriesChart {...data} line={[p('2026-06-10', 99)]} />);
    const update = chart.setOption.mock.calls.find((call) =>
      (call[0] as { series?: Array<{ id: string; data?: number[][] }> }).series?.some(
        (series) => series.id === 'line' && series.data?.[0]?.[1] === 99,
      ),
    );
    expect(update).toBeDefined();
  });

  it('renders with an empty series and shows a neutral state for an empty dataset', () => {
    const { rerender } = render(<TimeSeriesChart {...data} area={[]} />);
    expect(screen.queryByText('Нет данных')).not.toBeInTheDocument();
    rerender(<TimeSeriesChart area={[]} spline={[]} line={[]} bar={[]} />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('resizes through ResizeObserver', () => {
    render(<TimeSeriesChart {...data} />);
    chart.resize.mockClear();
    ResizeObserverMock.instances[0]?.trigger();
    expect(chart.resize).toHaveBeenCalledWith({ width: 592, height: 296 });
  });

  it('shows the tooltip on touch', () => {
    render(<TimeSeriesChart {...data} />);
    const host = screen.getByRole('img', { name: /time series chart/i });

    fireEvent.pointerDown(host, { clientX: 296, clientY: 148, pointerType: 'touch' });

    expect(screen.getByText('10.06.2026')).toBeVisible();
    expect(screen.getByText('2.04')).toBeVisible();
  });

  it('disposes the chart and observer on unmount', () => {
    const { unmount } = render(<TimeSeriesChart {...data} />);
    const observer = ResizeObserverMock.instances[0]!;
    unmount();
    expect(chart.dispose).toHaveBeenCalledOnce();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});
