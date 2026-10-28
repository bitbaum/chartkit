import {
  areaPath,
  formatNumber,
  hitColumns,
  formatX,
  isDate,
  linePath,
  numberTicks,
  resolveMarkers,
  timeTicks,
  valueScale,
  xExtent,
  xPercent,
  xPosition,
  yPercent,
  type LineMarkers,
  type LinePoint,
  type LineSeries,
  type Tick,
} from "../index.js";
import { ChartFigure } from "./Figure.js";

export interface LineChartProps {
  series: LineSeries[];
  /** "GW", "weeks", "USD m": shown with every value. */
  unit?: string;
  caption: string;
  /**
   * Where the value axis starts. `zero` always, `data` at the data's rounded
   * floor; left out, zero when the data sits near it and the floor otherwise.
   */
  yFrom?: "zero" | "data";
  /** Plot height in CSS px. The width is the container's. */
  height?: number;
  /**
   * Which values carry a dot. `all` (the default) marks every value; `none`
   * draws the line alone; `ends` marks only each series' last value; `auto`
   * is `all` up to 60 points on a series and `none` above — a year of daily
   * closes reads as a line, not a string of beads. Whatever is drawn, every
   * value can still be pointed at or tabbed to: its dot, value and period
   * appear on hover and on keyboard focus, and the table holds them all.
   */
  markers?: LineMarkers;
  /** A light fill under each line, in the series' own token colour. */
  area?: boolean;
  /** Explicit BCP 47 locale; omitted preserves the existing English output. */
  locale?: string;
  /** Translate visible/accessibility words with the product's own dictionary. */
  periodLabel?: string;
  preliminaryLabel?: string;
}

/** Points with more than this many on one series draw smaller dots. */
const DENSE = 40;

/**
 * One or more series on shared axes. The line is an SVG stretched to the
 * plot (`preserveAspectRatio="none"`, non-scaling stroke), so it is drawn by
 * the browser at any width; the axis labels and the points are HTML laid
 * over it in per cent, so the text is in rem and never shrinks with the
 * plot. Every point is an anchor to the page its number came from, with its
 * value, period and note on hover and on keyboard focus.
 */
export function LineChart({
  series,
  unit,
  caption,
  yFrom,
  height = 208,
  markers = "all",
  area = false,
  locale,
  periodLabel = "Period",
  preliminaryLabel = "preliminary",
}: LineChartProps) {
  const scale = valueScale(
    series.flatMap((s) => s.points.map((p) => p.y)),
    yFrom ?? "auto",
  );
  const extent = xExtent(series);
  const dated = series.some((s) => s.points.some((p) => isDate(p.x)));
  const xTicks: Tick[] = dated
    ? timeTicks(extent[0], extent[1], 5, locale)
    : numberTicks(extent[0], extent[1], 5, locale);
  const yTicks = scale.ticks.map((v) => ({
    pos: yPercent(v, scale),
    label: formatNumber(v, locale),
  }));
  const gutter = Math.max(...yTicks.map((t) => t.label.length)) + 1;
  const placed = series.map((s) =>
    s.points.map((p) => ({ point: p, x: xPercent(p.x, extent), y: yPercent(p.y, scale) })),
  );
  const unitText = unit ? ` ${unit}` : "";
  const shown = resolveMarkers(markers, Math.max(0, ...series.map((s) => s.points.length)));
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort(
    (a, b) => xPosition(a) - xPosition(b),
  );
  const table = {
    head: [periodLabel, ...series.map((s) => (unit ? `${s.label} (${unit})` : s.label))],
    rows: xs.map((x) => [
      formatX(x, locale),
      ...series.map((s) => {
        const p = s.points.find((q) => q.x === x);
        return p
          ? `${formatNumber(p.y, locale)}${p.preliminary ? ` (${preliminaryLabel})` : ""}`
          : "";
      }),
    ]),
  };
  return (
    <ChartFigure
      kind="line"
      caption={caption}
      table={table}
      style={{ "--ck-gutter": `${gutter}ch`, "--ck-plot-height": `${height}px` }}
    >
      <div className="ck-line-plot">
        {yTicks.map((tick) => (
          <div
            key={tick.label}
            className="ck-line-grid"
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
        <svg
          className="ck-line-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {area &&
            placed.map((pts, i) => (
              <path
                key={`${series[i].id}:area`}
                className="ck-line-area"
                data-series={(i % 6) + 1}
                d={areaPath(pts)}
              />
            ))}
          {placed.map((pts, i) => (
            <path
              key={series[i].id}
              className="ck-line-path"
              data-series={(i % 6) + 1}
              d={linePath(pts)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {placed.map((pts, i) => {
          const columns = shown === "all" ? undefined : hitColumns(pts);
          return pts.map(({ point, x, y }, j) => (
            <Point
              key={`${series[i].id}:${String(point.x)}`}
              point={point}
              locale={locale}
              preliminaryLabel={preliminaryLabel}
              x={x}
              y={y}
              index={(i % 6) + 1}
              dense={pts.length > DENSE}
              unit={unitText}
              label={series.length > 1 ? series[i].label : undefined}
              column={columns?.[j]}
              marked={shown === "ends" && j === pts.length - 1}
            />
          ));
        })}
      </div>
      <div className="ck-line-axis" aria-hidden="true">
        {xTicks.map((tick) => (
          <span
            key={tick.label + tick.pos}
            className={`ck-line-xtick${tick.pos < 8 ? " ck-at-start" : tick.pos > 92 ? " ck-at-end" : ""}`}
            style={{ left: `${tick.pos}%` }}
          >
            {tick.label}
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

function Point({
  point,
  x,
  y,
  index,
  dense,
  unit,
  label,
  column,
  marked,
  locale,
  preliminaryLabel,
}: {
  locale?: string;
  preliminaryLabel: string;
  point: LinePoint;
  x: number;
  y: number;
  index: number;
  dense: boolean;
  unit: string;
  label?: string;
  /** Set when dots are hidden: the strip of the plot this value answers for. */
  column?: { left: number; width: number };
  /** With `column`, the dot is drawn anyway (the last value under `ends`). */
  marked?: boolean;
}) {
  const period = `${formatX(point.x, locale)}${point.preliminary ? ` · ${preliminaryLabel}` : ""}`;
  const text = `${formatNumber(point.y, locale)}${unit}, ${period}${label ? ` — ${label}` : ""}${point.note ? `. ${point.note}` : ""}`;
  const edge = x > 66 ? " ck-pt-end" : column && x < 33 ? " ck-pt-start" : "";
  const className = column
    ? `ck-pt ck-pt-col${marked ? " ck-pt-marked" : ""}${edge}`
    : `ck-pt${dense ? " ck-pt-dense" : ""}${edge}`;
  // A hidden dot's target is a full-height strip of the plot (they tile it),
  // with the dot and the tooltip placed inside it at the value.
  const style: Record<string, string> = column
    ? {
        left: `${column.left.toFixed(3)}%`,
        width: `${column.width.toFixed(3)}%`,
        "--ck-mx": `${(column.width > 0 ? ((x - column.left) / column.width) * 100 : 50).toFixed(2)}%`,
        "--ck-y": `${y.toFixed(2)}%`,
      }
    : { left: `${x}%`, top: `${y}%` };
  const tip = (
    <span className="ck-tip" role="tooltip">
      <strong>
        {formatNumber(point.y, locale)}
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
  return point.href ? (
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
    <span className={className} data-series={index} style={style} tabIndex={0} aria-label={text}>
      {tip}
    </span>
  );
}
