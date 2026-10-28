import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatNumber } from "../index.js";
import { ChartFigure, MaybeLink } from "./Figure.js";
/** Part-to-whole chart with exact values in an accessible table and linked legend. */
export function DoughnutChart({ rows, caption, unit, locale, labelHeading = "Category", valueHeading = "Value", }) {
    if (rows.some((r) => !Number.isFinite(r.value) || r.value < 0))
        throw new RangeError("Doughnut values must be finite and non-negative");
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    if (!Number.isFinite(total))
        throw new RangeError("Doughnut total must be finite");
    const circumference = 2 * Math.PI * 36;
    let offset = 0;
    const segments = rows.map((row, i) => {
        const size = total > 0 ? (row.value / total) * circumference : 0;
        const segment = (_jsx("circle", { className: "ck-ring-segment", "data-series": (i % 6) + 1, cx: "50", cy: "50", r: "36", strokeDasharray: `${size} ${circumference - size}`, strokeDashoffset: -offset }, i));
        offset += size;
        return segment;
    });
    return (_jsx(ChartFigure, { kind: "doughnut", caption: caption, table: {
            head: [labelHeading, unit ? `${valueHeading} (${unit})` : valueHeading],
            rows: rows.map((r) => [r.label, formatNumber(r.value, locale)]),
        }, children: _jsxs("div", { className: "ck-ring-layout", children: [_jsxs("svg", { className: "ck-ring", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false", children: [_jsx("circle", { className: "ck-ring-track", cx: "50", cy: "50", r: "36" }), segments] }), _jsx("ul", { className: "ck-ring-legend", children: rows.map((row, i) => (_jsxs("li", { children: [_jsx("span", { className: "ck-legend-swatch", "data-series": (i % 6) + 1, "aria-hidden": "true" }), _jsx(MaybeLink, { href: row.href, className: "ck-ring-label", title: row.label, children: row.label }), _jsxs("span", { children: [formatNumber(row.value, locale), unit ? ` ${unit}` : ""] })] }, i))) })] }) }));
}
//# sourceMappingURL=Doughnut.js.map