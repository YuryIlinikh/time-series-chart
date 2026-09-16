# Time Series Chart

Переиспользуемый React-компонент для отображения четырёх временных рядов: `area`, `spline`, `line` и `bar`.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Usage

```ts
interface TimeSeriesPoint {
  readonly date: string;
  readonly value: number;
}

interface TimeSeriesChartProps {
  readonly area: readonly TimeSeriesPoint[];
  readonly spline: readonly TimeSeriesPoint[];
  readonly line: readonly TimeSeriesPoint[];
  readonly bar: readonly TimeSeriesPoint[];
}
```

`date` — календарная дата в формате `YYYY-MM-DD`.

```tsx
<TimeSeriesChart area={area} spline={spline} line={line} bar={bar} />
```

## Demo data

Demo загружает данные из `src/demo/data/area.json`, `spline.json`, `line.json` и `bar.json`. Чтобы проверить компонент со своими данными, замените содержимое этих четырёх файлов данными того же формата.

Готовые наборы находятся в `src/demo/data/samples/reference/` и `src/demo/data/samples/1000-points/`. По умолчанию используются данные `reference`.

При 1 000 точек на серию график и tooltip остаются рабочими, но столбцы визуально становятся плотными.

## Tests

```bash
npm test
npx playwright install
npm run test:e2e
```

E2E-тесты запускаются через Playwright projects в Chromium, Firefox и WebKit. В них входят smoke-проверки отрисовки и runtime errors, tooltip interaction, а также responsive-прогоны для 1440 × 900, 768 × 1024 и 390 × 844.

## Browser support

Поддерживаются актуальные desktop-версии Chrome, Firefox, Edge и Safari; Internet Explorer и устаревшие браузеры не поддерживаются. График занимает 100% ширины родительского контейнера и адаптируется к его resize без remount. Контрольные viewport: 1440 × 900, 768 × 1024 и 390 × 844; горизонтального overflow страницы быть не должно.
