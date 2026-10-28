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
export declare function DoughnutChart({ rows, caption, unit, locale, labelHeading, valueHeading, }: DoughnutChartProps): import("react").JSX.Element;
//# sourceMappingURL=Doughnut.d.ts.map