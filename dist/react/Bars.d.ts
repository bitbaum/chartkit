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
    labels?: {
        row?: string;
        value?: string;
        share?: string;
        note?: string;
        estimated?: string;
    };
}
/**
 * Horizontal ranked bars: label left, bar, value right. Rows are ranked —
 * largest first, no number last — whatever order they arrive in; a chart
 * called ranked that trusts its caller's order is sometimes not ranked.
 * Ordinal scales explicitly opt into input order instead.
 */
export declare function BarChart({ rows, unit, caption, highlight, max: whole, order, locale, labels, }: BarChartProps): import("react").JSX.Element;
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
export declare function ShareBars({ rows, caption, other, otherLabel }: ShareBarsProps): import("react").JSX.Element;
//# sourceMappingURL=Bars.d.ts.map