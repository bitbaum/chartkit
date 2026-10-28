import { type LineMarkers, type LineSeries } from "../index.js";
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
/**
 * One or more series on shared axes. The line is an SVG stretched to the
 * plot (`preserveAspectRatio="none"`, non-scaling stroke), so it is drawn by
 * the browser at any width; the axis labels and the points are HTML laid
 * over it in per cent, so the text is in rem and never shrinks with the
 * plot. Every point is an anchor to the page its number came from, with its
 * value, period and note on hover and on keyboard focus.
 */
export declare function LineChart({ series, unit, caption, yFrom, height, markers, area, locale, periodLabel, preliminaryLabel, }: LineChartProps): import("react").JSX.Element;
//# sourceMappingURL=LineChart.d.ts.map