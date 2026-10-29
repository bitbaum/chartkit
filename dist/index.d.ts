/**
 * @bitbaum/chartkit — the arithmetic behind every chart, as pure functions.
 *
 * Nothing here touches the DOM. Where a point sits (in per cent of the plot),
 * which round numbers the axis names, which month ticks a timeline gets,
 * which lane an event goes in when two collide, how a label is shortened:
 * each is a function of the data alone, so it runs on the server, is tested
 * with `node --test`, and draws the same at 320px and at 1440px because the
 * browser only stretches what was computed once.
 */
/** An x value: an ISO period (YYYY, YYYY-MM, YYYY-MM-DD, YYYY-Qn) or a number. */
export type XValue = string | number;
export interface LinePoint {
    x: XValue;
    y: number;
    /** The page the number came from. Every point is a link when it has one. */
    href?: string;
    note?: string;
    /** The publisher marks the value preliminary. */
    preliminary?: boolean;
}
export interface LineSeries {
    id: string;
    label: string;
    points: LinePoint[];
}
export interface Placed {
    /** 0–100 from the left. */
    x: number;
    /** 0–100 from the top. */
    y: number;
}
export interface Tick {
    /** 0–100 along the axis. */
    pos: number;
    label: string;
}
/**
 * Where an x value sits on the axis, as a number. A date is placed in UTC
 * ms: a year mid-year and a quarter mid-quarter — a position for drawing,
 * not a claim about the value. A number is itself. Unreadable → NaN.
 */
export declare function xPosition(x: XValue): number;
/** Whether an x value is a period rather than a number. */
export declare function isDate(x: XValue): boolean;
/** "2025", "Q2 2025", "Aug 2026", "3 Mar 2026"; a number as a number. */
export declare function formatX(x: XValue, locale?: string): string;
/** Values as the source gave them, grouped for reading; never rounded past three decimals. */
export declare function formatNumber(value: number, locale?: string): string;
/** A step of 1, 2 or 5 × 10ⁿ that splits the span into about `count` parts. */
export declare function niceStep(span: number, count: number): number;
export interface Scale {
    min: number;
    max: number;
    ticks: number[];
}
/**
 * A value axis on round numbers. `from: "zero"` starts at zero; `"data"` at
 * the rounded floor of the data; `"auto"` (the default) starts at zero when
 * the data sits near it, so a small value is not drawn as a large one.
 */
export declare function valueScale(values: readonly number[], from?: "zero" | "data" | "auto", tickCount?: number): Scale;
/** Per cent from the top for a value on a scale. */
export declare function yPercent(value: number, scale: Scale): number;
/** The x extent of several series, as positions. */
export declare function xExtent(series: readonly {
    points: readonly {
        x: XValue;
    }[];
}[]): [number, number];
/** Per cent from the left for an x value on an extent. */
export declare function xPercent(x: XValue, [x0, x1]: [number, number]): number;
/** SVG path data through placed points, in a 0–100 box. */
export declare function linePath(placed: readonly Placed[]): string;
/**
 * The region under a line, closed down to the plot's floor (100 in the
 * 0–100 box): a light fill that says "this is the level", the way a quote
 * page draws a price. Empty for fewer than two points.
 */
export declare function areaPath(placed: readonly Placed[]): string;
/** How a LineChart marks its values. */
export type LineMarkers = "auto" | "none" | "ends" | "all";
/**
 * Above this many points on a series, `markers="auto"` draws no dots: 250
 * daily closes drawn as 250 beads is a string of pearls, not a price line.
 */
export declare const AUTO_MARKER_LIMIT = 60;
/** `auto` settled against the longest series: `all` up to the limit, `none` above. */
export declare function resolveMarkers(markers: LineMarkers, longest: number): Exclude<LineMarkers, "auto">;
/**
 * The strip of the plot each point answers for when its dot is hidden: from
 * half way to the previous point to half way to the next, in per cent of the
 * plot's width. The strips tile the plot with no gap, so a pointer or a finger
 * anywhere over the line lands on the nearest value, however dense the data.
 */
export declare function hitColumns(placed: readonly Placed[]): {
    left: number;
    width: number;
}[];
/**
 * Ticks along a time axis, at most `count` of them, for any span: days for
 * a week of data, weeks for a month, months for a year, years for decades.
 * Of the steps that give between three and `count` ticks the coarsest wins
 * (a quarter-year of months, not of fortnights); with none, the finest that
 * fits. The first label, and the first in each new year, name the year. An
 * axis is never left empty: a span no step ticks inside is labelled at its
 * two ends.
 */
export declare function timeTicks(x0: number, x1: number, count?: number, locale?: string): Tick[];
/** Ticks for a numeric axis on round numbers. */
export declare function numberTicks(x0: number, x1: number, count?: number, locale?: string): Tick[];
/**
 * Shorten a label to `max` characters with an ellipsis, cutting at a word
 * where one falls in the last third. The full text travels in `title`.
 */
export declare function truncate(text: string, max: number): string;
/**
 * A lane per item so that no two spans in one lane overlap or come closer
 * than `gap`. A span is what an item occupies along the axis — a dot and
 * its label, whichever way the label faces. Items are taken in order of
 * their start; each goes in the first lane with room, so lanes are as few
 * as the spans allow and never fewer than the collisions demand.
 */
export declare function lanes(spans: readonly (readonly [number, number])[], gap?: number): number[];
export interface MonthTick extends Tick {
    /** Carries a label; the rest are marks between labels. */
    major: boolean;
}
/**
 * A mark at every month start between two instants, with a label on every
 * `step`-th so that at most `count` are labelled. A labelled January, and
 * the first label, name the year.
 */
export declare function monthTicks(x0: number, x1: number, count?: number, locale?: string): MonthTick[];
/** A share as "53%"; under one per cent, "<1%". */
export declare function formatShare(share: number): string;
/** The plot widths, in CSS px, at which a ColumnChart re-plans its period labels. */
export declare const COLUMN_AXIS_WIDTHS: readonly number[];
/**
 * How wide a label is in the monospace label face, in CSS px, without a
 * browser: 0.61em a character (every common monospace is 0.6), a full em
 * for a wide (CJK) character or a pictograph. Generous on purpose: a label
 * thought wider than it is costs a hidden neighbour; one thought narrower
 * prints over it.
 */
export declare function labelWidth(text: string): number;
/**
 * Every how-many-th period label a row of columns can carry at a plot width:
 * 1 when each fits its column, else the least step at which the labels shown
 * (the first, then every step-th) neither touch nor leave the plot. A label
 * wider than its column is centred on it and runs over its hidden
 * neighbours; the first is held at the left edge and the last at the right.
 * When not even one label fits beside another, only the first is shown.
 */
export declare function columnLabelStep(labels: readonly string[], plotWidth: number): number;
/**
 * For each period label of a ColumnChart, the widths of
 * `COLUMN_AXIS_WIDTHS` at which it steps back so its neighbours fit — the
 * step is planned for the narrowest plot of each band, so it holds across
 * the band. A label is thinned out, never cut: the CSS hides it with a
 * container query on the axis. Empty for a label shown at every width.
 */
export declare function columnLabelPlan(labels: readonly string[]): number[][];
//# sourceMappingURL=index.d.ts.map