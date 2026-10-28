import { formatNumber, formatX, niceStep, truncate, type XValue } from "../index.js";
import { ChartFigure } from "./Figure.js";

export interface ColumnPoint {
  /** The period: "2025", "2025-Q2", "FY2025". Drawn left to right in the order given. */
  x: XValue;
  /** `null` when the source gives no figure for the period: no column, "—" in the table. */
  y: number | null;
  /** Where the figure was read: the column is a link to it. */
  href?: string;
  note?: string;
}

export interface ColumnSeries {
  id: string;
  label: string;
  points: ColumnPoint[];
}

export interface ColumnChartProps {
  /** One series, or a few side by side per period. Same unit, one axis. */
  series: ColumnSeries[];
  /** "USD", "EUR m": shown with every value. */
  unit?: string;
  caption: string;
  /** Plot height in CSS px. The width is the container's. */
  height?: number;
  locale?: string;
  periodLabel?: string;
  /** Stack positive and negative values separately around zero. Missing data remains missing. */
  stacked?: boolean;
}

/** Period labels longer than this get an ellipsis and keep the full text in `title`. */
const PERIOD_MAX = 8;

/**
 * A value axis that always holds zero, on round steps, below zero as well as
 * above: a loss is a column that goes down, not a short column going up.
 */
export function columnScale(values: readonly number[], tickCount = 3) {
  const finite = values.filter((v) => Number.isFinite(v));
  const lo = Math.min(0, ...finite);
  const hi = Math.max(0, ...finite);
  const span = hi - lo || Math.abs(hi) || 1;
  const step = niceStep(span, tickCount);
  const min = Math.floor(lo / step) * step;
  const max = Math.max(step, Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { min, max, ticks };
}

/**
 * Columns by period: revenue by year, a loss below the zero line. Periods
 * read left to right in the order the caller gives (fiscal labels such as
 * "FY2025" are not dates, so nothing re-sorts them), and several series sit
 * side by side in each period, each after the first told apart by its tone.
 * Every column with a figure is focusable, with its value, period and note
 * on hover and focus; a link when it has a source. The table carries every
 * figure, a missing one as "—".
 */
export function ColumnChart({
  series,
  unit,
  caption,
  height = 176,
  locale,
  periodLabel = "Period",
  stacked = false,
}: ColumnChartProps) {
  const periods: XValue[] = [];
  for (const s of series)
    for (const p of s.points) if (!periods.some((q) => q === p.x)) periods.push(p.x);
  const values = series.flatMap((s) => s.points.flatMap((p) => (p.y === null ? [] : [p.y])));
  const stacks = periods.map((x) => {
    let positive = 0,
      negative = 0;
    return series.map((s) => {
      const value = s.points.find((p) => p.x === x)?.y;
      if (value == null) return null;
      if (!Number.isFinite(value)) throw new RangeError("Column values must be finite");
      const start = value >= 0 ? positive : negative;
      const end = start + value;
      if (!Number.isFinite(end)) throw new RangeError("Column totals must be finite");
      if (value >= 0) positive = end;
      else negative = end;
      return { start, end };
    });
  });
  const scale = columnScale(
    stacked ? stacks.flatMap((row) => row.flatMap((s) => (s ? [s.start, s.end] : []))) : values,
  );
  const pct = (v: number) => ((scale.max - v) / (scale.max - scale.min)) * 100;
  const zero = pct(0);
  const yTicks = scale.ticks.map((v) => ({ pos: pct(v), label: formatNumber(v, locale) }));
  const gutter = Math.max(...yTicks.map((t) => t.label.length)) + 1;
  const unitText = unit ? ` ${unit}` : "";
  const table = {
    head: [periodLabel, ...series.map((s) => (unit ? `${s.label} (${unit})` : s.label))],
    rows: periods.map((x) => [
      formatX(x, locale),
      ...series.map((s) => {
        const p = s.points.find((q) => q.x === x);
        return p && p.y !== null ? formatNumber(p.y, locale) : "—";
      }),
    ]),
  };
  return (
    <ChartFigure
      kind="columns"
      caption={caption}
      table={table}
      style={{
        "--ck-gutter": `${gutter}ch`,
        "--ck-plot-height": `${height}px`,
        "--ck-periods": periods.length,
      }}
    >
      <div className="ck-col-plot">
        {yTicks.map((tick) => (
          <div
            key={tick.label}
            className={`ck-line-grid${tick.label === "0" ? " ck-col-zero" : ""}`}
            style={{ top: `${tick.pos}%` }}
            aria-hidden="true"
          >
            <span className="ck-line-tick">{tick.label}</span>
          </div>
        ))}
        {unit && (
          <span className="ck-line-unit" aria-hidden="true">
            {unit}
          </span>
        )}
        <div className="ck-col-groups">
          {periods.map((x, at) => (
            <div key={String(x)} className={`ck-col-group${stacked ? " ck-col-stacked" : ""}`}>
              {series.map((s, i) => {
                const p = s.points.find((q) => q.x === x);
                if (!p || p.y === null) return <span key={s.id} className="ck-col-gap" />;
                const segment = stacks[at][i];
                const start = stacked && segment ? pct(segment.start) : zero;
                const end = stacked && segment ? pct(segment.end) : pct(p.y);
                const top = Math.min(start, end);
                const size = Math.abs(end - start);
                return (
                  <Column
                    key={s.id}
                    point={p}
                    locale={locale}
                    index={(i % 6) + 1}
                    top={top}
                    stacked={stacked}
                    size={size}
                    negative={p.y < 0}
                    unit={unitText}
                    label={series.length > 1 ? s.label : undefined}
                    end={at >= periods.length / 2}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="ck-col-axis" aria-hidden="true">
        {periods.map((x) => (
          <span key={String(x)} className="ck-col-xtick" title={formatX(x, locale)}>
            {truncate(formatX(x, locale), PERIOD_MAX)}
          </span>
        ))}
      </div>
      {series.length > 1 && (
        <ol className="ck-legend" aria-hidden="true">
          {series.map((s, i) => (
            <li key={s.id} className="ck-legend-item">
              <span className="ck-legend-swatch" data-series={(i % 6) + 1} />
              {s.label}
            </li>
          ))}
        </ol>
      )}
    </ChartFigure>
  );
}

function Column({
  point,
  index,
  top,
  size,
  negative,
  unit,
  label,
  end,
  locale,
  stacked,
}: {
  stacked?: boolean;
  locale?: string;
  point: ColumnPoint;
  index: number;
  top: number;
  size: number;
  negative: boolean;
  unit: string;
  label?: string;
  end: boolean;
}) {
  const value = formatNumber(point.y as number, locale);
  const period = formatX(point.x, locale);
  const text = `${value}${unit}, ${period}${label ? ` — ${label}` : ""}${point.note ? `. ${point.note}` : ""}`;
  const className = `ck-col${negative ? " ck-col-neg" : ""}${end ? " ck-pt-end" : ""}`;
  const style = { top: `${top}%`, height: `${Math.max(size, stacked ? 0 : 0.5)}%` };
  const tip = (
    <span className="ck-tip" role="tooltip">
      <strong>
        {value}
        {unit}
      </strong>
      <span>
        {label ? `${label} · ` : ""}
        {period}
      </span>
      {point.note && <span>{point.note}</span>}
    </span>
  );
  const out = point.href && /^https?:\/\//.test(point.href);
  return (
    <span className="ck-col-slot">
      {point.href ? (
        <a
          href={point.href}
          className={className}
          data-series={index}
          style={style}
          aria-label={text}
          {...(out ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {tip}
        </a>
      ) : (
        <span
          className={className}
          data-series={index}
          style={style}
          tabIndex={0}
          aria-label={text}
        >
          {tip}
        </span>
      )}
    </span>
  );
}
