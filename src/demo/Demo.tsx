import { TimeSeriesChart } from '../components/TimeSeriesChart';
import area from './data/area.json';
import bar from './data/bar.json';
import line from './data/line.json';
import spline from './data/spline.json';

export function Demo() {
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

      <section className="demo__stage" data-chart-interaction-area>
        <div className="demo__chart-shell">
          <TimeSeriesChart area={area} spline={spline} line={line} bar={bar} />
        </div>
      </section>
    </main>
  );
}
