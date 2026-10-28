import { formatNumber, formatShare, truncate } from "../index.js";
import { ChartFigure, MaybeLink } from "./Figure.js";

export interface BarRow {
  label: string;
  /** `null` when the source gives no number: drawn as "—", never as zero. */
  value: number | null;
  href?: string;
  /** 0–1, shown in muted mono beside the value. */
  share?: number;
  note?: string;
  /** The source marks the value estimated. */
  estimated?: boolean;
  /** Meaning of the row, independent of its magnitude. */
  tone?: "positive" | "warning" | "negative";
}

export interface BarChartProps {
  rows: BarRow[];
  unit?: string;
  caption: string;
  /** The label of the row to draw in the accent: "this one", among the rest. */
  highlight?: string;
  /** Full-scale value for proportional bars (for example 100 for percentages).
   * Values above this still fit. Invalid/non-positive scales use the largest row. */
  max?: number;
  /** Ranked by default; preserve input order for ordinal scales. */
  order?: "ranked" | "input";
  /** Number formatting for both the visual and accessible table. */
  locale?: string;
  labels?: { row?: string; value?: string; share?: string; note?: string; estimated?: string };
}

/** Labels longer than this get an ellipsis and carry the full text in `title`. */
const LABEL_MAX = 28;

/**
 * Horizontal ranked bars: label left, bar, value right. Rows are ranked —
 * largest first, no number last — whatever order they arrive in; a chart
 * called ranked that trusts its caller's order is sometimes not ranked.
 * Ordinal scales explicitly opt into input order instead.
 */
export function BarChart({
  rows,
  unit,
  caption,
  highlight,
  max: whole,
  order = "ranked",
  locale,
  labels,
}: BarChartProps) {
  const ranked =
    order === "input"
      ? [...rows]
      : [...rows].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  const words = {
    row: "Row",
    value: "Value",
    share: "Share",
    note: "Note",
    estimated: "estimated",
    ...labels,
  };
  const shareText = (share: number) =>
    locale
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(share)
      : formatShare(share);
  const floor = whole !== undefined && Number.isFinite(whole) && whole > 0 ? whole : 0;
  const max = Math.max(floor, ...ranked.map((r) => r.value ?? 0));
  const table = {
    head: [words.row, unit ? `${words.value} (${unit})` : words.value, words.share, words.note],
    rows: ranked.map((r) => [
      r.label,
      r.value === null
        ? "—"
        : `${formatNumber(r.value, locale)}${r.estimated ? ` (${words.estimated})` : ""}`,
      r.share === undefined ? "" : shareText(r.share),
      r.note ?? "",
    ]),
  };
  return (
    <ChartFigure kind="bars" caption={caption} table={table}>
      <ol className="ck-bars" aria-hidden="true">
        {ranked.map((r) => (
          <li
            key={r.label}
            className={`ck-bar-row${r.label === highlight ? " ck-bar-row-hi" : ""}`}
            data-tone={r.tone}
          >
            <MaybeLink
              href={r.href}
              className="ck-bar-label"
              title={r.note ? `${r.label}: ${r.note}` : r.label}
            >
              {truncate(r.label, LABEL_MAX)}
            </MaybeLink>
            <span className="ck-bar-track">
              {r.value !== null && max > 0 && (
                <span className="ck-bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
              )}
            </span>
            <span className="ck-bar-value">
              {r.value === null ? (
                <span className="ck-bar-none">—</span>
              ) : (
                <>
                  {r.estimated && (
                    <span className="ck-bar-est" title={labels?.estimated ?? "Estimated"}>
                      ≈
                    </span>
                  )}
                  {formatNumber(r.value, locale)}
                </>
              )}
              {r.share !== undefined && <span className="ck-bar-share">{shareText(r.share)}</span>}
            </span>
          </li>
        ))}
      </ol>
    </ChartFigure>
  );
}

export interface ShareRow {
  label: string;
  /** 0–1. */
  share: number;
  href?: string;
}

export interface ShareBarsProps {
  rows: ShareRow[];
  caption: string;
  /** 0–1: the rest, drawn last in the line colour and listed as `otherLabel`. */
  other?: number;
  /**
   * What the rest IS, in the legend and the table: "Others, each below 5%".
   * Left out, "Other". A bare "Other 87%" asks the reader to guess; the app
   * knows what its remainder is and should say it here.
   */
  otherLabel?: string;
}

/**
 * One 100% stacked bar with a legend row under it. The largest segment
 * carries its label inside when the segment is wide enough for it (a
 * container query, so the same markup decides at every width); every
 * segment is named in the legend.
 */
export function ShareBars({ rows, caption, other, otherLabel }: ShareBarsProps) {
  const ordered = [...rows].sort((a, b) => b.share - a.share);
  const largest = ordered[0];
  const segments = [
    ...ordered.map((r, i) => ({ ...r, index: (i % 6) + 1, other: false })),
    ...(other
      ? [
          {
            label: otherLabel?.trim() || "Other",
            share: other,
            href: undefined,
            index: 0,
            other: true,
          },
        ]
      : []),
  ];
  const table = {
    head: ["Row", "Share"],
    rows: segments.map((s) => [s.label, formatShare(s.share)]),
  };
  return (
    <ChartFigure kind="share" caption={caption} table={table}>
      <div className="ck-share" aria-hidden="true">
        {segments.map((s) => (
          <span
            key={s.label}
            className={`ck-share-seg${s.other ? " ck-share-other" : ""}`}
            data-series={s.index || undefined}
            style={{ width: `${s.share * 100}%` }}
            title={`${s.label} ${formatShare(s.share)}`}
          >
            {s === segments[0] && largest && (
              <span className="ck-share-inside">
                {truncate(s.label, 14)} {formatShare(s.share)}
              </span>
            )}
          </span>
        ))}
      </div>
      <ol className="ck-legend" aria-hidden="true">
        {segments.map((s) => (
          <li key={s.label} className="ck-legend-item">
            <span
              className={`ck-legend-swatch${s.other ? " ck-share-other" : ""}`}
              data-series={s.index || undefined}
            />
            <MaybeLink href={s.href} className="ck-legend-label" title={s.label}>
              {truncate(s.label, 22)}
            </MaybeLink>
            <span className="ck-legend-value">{formatShare(s.share)}</span>
          </li>
        ))}
      </ol>
    </ChartFigure>
  );
}
