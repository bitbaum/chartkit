import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { linePath, valueScale, xExtent, xPercent, yPercent } from "../index.js";
import { DataTable, MaybeLink } from "./Figure.js";
/**
 * The shape of a series in a line of text: no axes, the last point marked.
 * An SVG stretched to its box with a non-scaling stroke, so the line is the
 * same weight at every size. A `null` breaks the line (a value standing
 * alone between two gaps is a dot); a point with a `tone` gets a dot in that
 * tone's token colour.
 */
export function Sparkline({ points, label, width = 88, height = 28 }) {
    const present = points.filter((p) => isValue(p.y));
    if (points.length < 2 || present.length === 0)
        return null;
    const scale = valueScale(present.map((p) => p.y), "data");
    const extent = xExtent([{ points }]);
    const place = (p) => ({
        x: xPercent(p.x, extent),
        y: yPercent(p.y, scale),
    });
    // Runs of consecutive values, split wherever one is missing.
    const runs = [[]];
    for (const p of points) {
        if (isValue(p.y))
            runs[runs.length - 1].push(p);
        else if (runs[runs.length - 1].length)
            runs.push([]);
    }
    const d = runs
        .filter((r) => r.length > 1)
        .map((r) => linePath(r.map(place)))
        .join(" ");
    const last = present[present.length - 1];
    // A dot is a stroke of no length with a round cap: the one mark a stretched
    // SVG keeps round, at the stroke's width whatever the box.
    const dot = (p, className, key) => {
        const at = place(p);
        return (_jsx("path", { className: className, "data-tone": p.tone, d: `M${at.x.toFixed(2)} ${at.y.toFixed(2)}h0`, vectorEffect: "non-scaling-stroke" }, key));
    };
    return (_jsxs("svg", { className: "ck-spark", viewBox: "-3 -8 106 116", preserveAspectRatio: "none", role: "img", "aria-label": label, style: { width: `${width}px`, height: `${height}px` }, children: [d && _jsx("path", { className: "ck-spark-line", d: d, vectorEffect: "non-scaling-stroke" }), runs.map((r, i) => r.length === 1 && r[0] !== last ? dot(r[0], "ck-spark-solo", `solo:${i}`) : null), present.map((p, i) => (p.tone && p !== last ? dot(p, "ck-spark-dot", i) : null)), dot(last, "ck-spark-end")] }));
}
function isValue(y) {
    return typeof y === "number" && Number.isFinite(y);
}
/**
 * A horizontal meter with the number beside it — Substrata's severity 12/12.
 * The number is the figure; the bar is how much of the scale it is.
 */
export function Meter({ value, max, label, href, tone, showValue = true }) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (_jsxs(MaybeLink, { href: href, className: "ck-chart ck-meter", title: `${label}: ${value} of ${max}`, style: { "--ck-meter": `${pct}%` }, children: [showValue && _jsx("span", { className: "ck-meter-value", children: value }), _jsx("span", { className: "ck-meter-track", role: "meter", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": value, "aria-label": label, "data-tone": tone, children: _jsx("span", { className: "ck-meter-fill" }) })] }));
}
/**
 * An even grid of figures — two across on a phone, up to four wider — one
 * shape per cell: the figure, then what it counts. A cell with an `href` is
 * a link to the rows behind the number.
 */
export function StatTiles({ tiles, caption = "Figures" }) {
    const n = Math.min(4, Math.max(1, tiles.length));
    return (_jsxs("div", { className: "ck-chart ck-chart-tiles", style: { "--ck-n": n }, children: [_jsx("ul", { className: "ck-tiles", "aria-label": caption, children: tiles.map((t) => (_jsx("li", { children: _jsxs(MaybeLink, { href: t.href, className: "ck-tile", children: [_jsx("span", { className: "ck-tile-value", children: t.value }), _jsx("span", { className: "ck-tile-label", children: t.label }), t.note && _jsx("span", { className: "ck-tile-note", children: t.note })] }) }, t.label))) }), _jsx(DataTable, { caption: caption, head: ["Figure", "Value", "Note"], rows: tiles.map((t) => [t.label, t.value, t.note ?? ""]) })] }));
}
//# sourceMappingURL=Small.js.map