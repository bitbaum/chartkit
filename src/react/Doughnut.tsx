import { formatNumber } from "../index.js";
import { ChartFigure, MaybeLink } from "./Figure.js";

export interface DoughnutRow {
  label: string;
  value: number;
  href?: string;
}
export interface DoughnutChartProps {
  rows: DoughnutRow[];
  caption: string;
  unit?: string;
  locale?: string;
  labelHeading?: string;
  valueHeading?: string;
}

/** Part-to-whole chart with exact values in an accessible table and linked legend. */
export function DoughnutChart({
  rows,
  caption,
  unit,
  locale,
  labelHeading = "Category",
  valueHeading = "Value",
}: DoughnutChartProps) {
  if (rows.some((r) => !Number.isFinite(r.value) || r.value < 0))
    throw new RangeError("Doughnut values must be finite and non-negative");
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  if (!Number.isFinite(total)) throw new RangeError("Doughnut total must be finite");
  const circumference = 2 * Math.PI * 36;
  let offset = 0;
  const segments = rows.map((row, i) => {
    const size = total > 0 ? (row.value / total) * circumference : 0;
    const segment = (
      <circle
        key={i}
        className="ck-ring-segment"
        data-series={(i % 6) + 1}
        cx="50"
        cy="50"
        r="36"
        strokeDasharray={`${size} ${circumference - size}`}
        strokeDashoffset={-offset}
      />
    );
    offset += size;
    return segment;
  });
  return (
    <ChartFigure
      kind="doughnut"
      caption={caption}
      table={{
        head: [labelHeading, unit ? `${valueHeading} (${unit})` : valueHeading],
        rows: rows.map((r) => [r.label, formatNumber(r.value, locale)]),
      }}
    >
      <div className="ck-ring-layout">
        <svg className="ck-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle className="ck-ring-track" cx="50" cy="50" r="36" />
          {segments}
        </svg>
        <ul className="ck-ring-legend">
          {rows.map((row, i) => (
            <li key={i}>
              <span className="ck-legend-swatch" data-series={(i % 6) + 1} aria-hidden="true" />
              <MaybeLink href={row.href} className="ck-ring-label" title={row.label}>
                {row.label}
              </MaybeLink>
              <span>
                {formatNumber(row.value, locale)}
                {unit ? ` ${unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFigure>
  );
}
