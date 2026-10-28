import { type XValue } from "../index.js";
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
/**
 * A value axis that always holds zero, on round steps, below zero as well as
 * above: a loss is a column that goes down, not a short column going up.
 */
export declare function columnScale(values: readonly number[], tickCount?: number): {
    min: number;
    max: number;
    ticks: number[];
};
/**
 * Columns by period: revenue by year, a loss below the zero line. Periods
 * read left to right in the order the caller gives (fiscal labels such as
 * "FY2025" are not dates, so nothing re-sorts them), and several series sit
 * side by side in each period, each after the first told apart by its tone.
 * Every column with a figure is focusable, with its value, period and note
 * on hover and focus; a link when it has a source. The table carries every
 * figure, a missing one as "—".
 */
export declare function ColumnChart({ series, unit, caption, height, locale, periodLabel, stacked, }: ColumnChartProps): import("react").JSX.Element;
//# sourceMappingURL=Columns.d.ts.map