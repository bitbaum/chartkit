import { type XValue } from "../index.js";
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
export declare function Sparkline({ points, label, width, height }: SparklineProps): import("react").JSX.Element | null;
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
export declare function Meter({ value, max, label, href, tone, showValue }: MeterProps): import("react").JSX.Element;
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
export declare function StatTiles({ tiles, caption }: StatTilesProps): import("react").JSX.Element;
//# sourceMappingURL=Small.d.ts.map