export interface TimeSeriesPoint {
  /** A timezone-free calendar date in the strict YYYY-MM-DD format. */
  readonly date: string;
  readonly value: number;
}

export interface TimeSeriesChartProps {
  readonly area: readonly TimeSeriesPoint[];
  readonly spline: readonly TimeSeriesPoint[];
  readonly line: readonly TimeSeriesPoint[];
  readonly bar: readonly TimeSeriesPoint[];
}
