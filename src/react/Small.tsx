import { linePath, valueScale, xExtent, xPercent, yPercent, type XValue } from "../index.js";
import { DataTable, MaybeLink } from "./Figure.js";

/** A status colour, drawn from the app's tokens: `--ck-up`, `--ck-warning`, `--ck-down`, `--ck-ink`. */
export type ChartTone = "positive" | "warning" | "negative" | "neutral";

export interface SparkPoint {
  x: XValue;
  /** `null` when there is no value for `x`: the line breaks there rather than dropping to zero. */
  y: number | null;
  /** Colours this point's dot (a good day, a bad one). Say what the colours mean in `label`. */
  tone?: ChartTone;
}

export interface SparklineProps {
  points: SparkPoint[];
  /**
   * What the line is: its accessible name. When points carry tones, say what
   * they mean here too ("… 3 good days, 2 bad") — colour is never the only sign.
   */
  label: string;
  /** CSS px. */
  width?: number;
  height?: number;
}

/**
 * The shape of a series in a line of text: no axes, the last point marked.
 * An SVG stretched to its box with a non-scaling stroke, so the line is the
 * same weight at every size. A `null` breaks the line (a value standing
 * alone between two gaps is a dot); a point with a `tone` gets a dot in that
 * tone's token colour.
 */
export function Sparkline({ points, label, width = 88, height = 28 }: SparklineProps) {
  const present = points.filter((p): p is SparkPoint & { y: number } => isValue(p.y));
  if (points.length < 2 || present.length === 0) return null;
  const scale = valueScale(
    present.map((p) => p.y),
    "data",
  );
  const extent = xExtent([{ points }]);
  const place = (p: SparkPoint & { y: number }) => ({
    x: xPercent(p.x, extent),
    y: yPercent(p.y, scale),
  });
  // Runs of consecutive values, split wherever one is missing.
  const runs: (SparkPoint & { y: number })[][] = [[]];
  for (const p of points) {
    if (isValue(p.y)) runs[runs.length - 1].push(p as SparkPoint & { y: number });
    else if (runs[runs.length - 1].length) runs.push([]);
  }
  const d = runs
    .filter((r) => r.length > 1)
    .map((r) => linePath(r.map(place)))
    .join(" ");
  const last = present[present.length - 1];
  // A dot is a stroke of no length with a round cap: the one mark a stretched
  // SVG keeps round, at the stroke's width whatever the box.
  const dot = (p: SparkPoint & { y: number }, className: string, key?: string | number) => {
    const at = place(p);
    return (
      <path
        key={key}
        className={className}
        data-tone={p.tone}
        d={`M${at.x.toFixed(2)} ${at.y.toFixed(2)}h0`}
        vectorEffect="non-scaling-stroke"
      />
    );
  };
  return (
    <svg
      className="ck-spark"
      viewBox="-3 -8 106 116"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {d && <path className="ck-spark-line" d={d} vectorEffect="non-scaling-stroke" />}
      {runs.map((r, i) =>
        r.length === 1 && r[0] !== last ? dot(r[0], "ck-spark-solo", `solo:${i}`) : null,
      )}
      {present.map((p, i) => (p.tone && p !== last ? dot(p, "ck-spark-dot", i) : null))}
      {dot(last, "ck-spark-end")}
    </svg>
  );
}

function isValue(y: number | null | undefined): y is number {
  return typeof y === "number" && Number.isFinite(y);
}

export interface MeterProps {
  value: number;
  max: number;
  label: string;
  href?: string;
  /**
   * The fill's colour, by token: `accent` (the default, as before), `neutral`
   * (the ink), or a status — `positive`, `warning`, `negative`.
   */
  tone?: "accent" | ChartTone;
  /**
   * `false` draws the track alone, for a caller that already prints the
   * figure beside it. The value stays in the meter's role, name and title.
   */
  showValue?: boolean;
}

/**
 * A horizontal meter with the number beside it — Substrata's severity 12/12.
 * The number is the figure; the bar is how much of the scale it is.
 */
export function Meter({ value, max, label, href, tone, showValue = true }: MeterProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <MaybeLink
      href={href}
      className="ck-chart ck-meter"
      title={`${label}: ${value} of ${max}`}
      style={{ "--ck-meter": `${pct}%` }}
    >
      {showValue && <span className="ck-meter-value">{value}</span>}
      <span
        className="ck-meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        data-tone={tone}
      >
        <span className="ck-meter-fill" />
      </span>
    </MaybeLink>
  );
}

export interface StatTile {
  label: string;
  value: string | number;
  href?: string;
  note?: string;
}

export interface StatTilesProps {
  tiles: StatTile[];
  /** Names the strip for assistive tech and the table. */
  caption?: string;
}

/**
 * An even grid of figures — two across on a phone, up to four wider — one
 * shape per cell: the figure, then what it counts. A cell with an `href` is
 * a link to the rows behind the number.
 */
export function StatTiles({ tiles, caption = "Figures" }: StatTilesProps) {
  const n = Math.min(4, Math.max(1, tiles.length));
  return (
    <div className="ck-chart ck-chart-tiles" style={{ "--ck-n": n } as Record<string, number>}>
      <ul className="ck-tiles" aria-label={caption}>
        {tiles.map((t) => (
          <li key={t.label}>
            <MaybeLink href={t.href} className="ck-tile">
              <span className="ck-tile-value">{t.value}</span>
              <span className="ck-tile-label">{t.label}</span>
              {t.note && <span className="ck-tile-note">{t.note}</span>}
            </MaybeLink>
          </li>
        ))}
      </ul>
      <DataTable
        caption={caption}
        head={["Figure", "Value", "Note"]}
        rows={tiles.map((t) => [t.label, t.value, t.note ?? ""])}
      />
    </div>
  );
}
