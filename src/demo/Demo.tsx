import { useMemo, useState } from 'react';
import { TimeSeriesChart, type TimeSeriesChartProps } from '../components/TimeSeriesChart';
import {
  alternateData,
  createPerformanceData,
  edgeCaseData,
  referenceData,
} from './demoData';

const datasets: Record<string, TimeSeriesChartProps> = {
  'Референсные данные': referenceData,
  'Альтернативные данные': alternateData,
  ...edgeCaseData,
};

const performanceSizes: Record<string, number> = {
  'Performance: 100 × 4': 100,
  'Performance: 1 000 × 4': 1_000,
};

export function Demo() {
  const [datasetName, setDatasetName] = useState('Референсные данные');
  const [width, setWidth] = useState(592);
  const dataset = useMemo(() => {
    const performanceSize = performanceSizes[datasetName];
    if (performanceSize !== undefined) return createPerformanceData(performanceSize);
    return datasets[datasetName] ?? referenceData;
  }, [datasetName]);

  return (
    <main className="demo">
      <section className="demo__intro">
        <p className="demo__eyebrow">React · TypeScript · ECharts</p>
        <h1>TimeSeriesChart</h1>
        <p>
          Четыре независимые серии и календарные даты без времени и часовых поясов.
          Перемещайте курсор по графику, чтобы проверить общий tooltip.
        </p>
      </section>

      <section className="demo__controls" aria-label="Настройки демо">
        <label>
          Набор данных
          <select value={datasetName} onChange={(event) => setDatasetName(event.target.value)}>
            {Object.keys(datasets).map((name) => (
              <option key={name}>{name}</option>
            ))}
            {Object.keys(performanceSizes).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Ширина контейнера: {width} px
          <input
            type="range"
            min="320"
            max="900"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="demo__stage" data-chart-interaction-area>
        <div className="demo__chart-shell" style={{ width }}>
          <TimeSeriesChart {...dataset} />
        </div>
      </section>
    </main>
  );
}
