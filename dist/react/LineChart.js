import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { areaPath, formatNumber, hitColumns, formatX, isDate, linePath, numberTicks, resolveMarkers, timeTicks, valueScale, xExtent, xPercent, xPosition, yPercent, } from "../index.js";
import { ChartFigure } from "./Figure.js";
/** Points with more than this many on one series draw smaller dots. */
const DENSE = 40;
/**
 * One or more series on shared axes. The line is an SVG stretched to the
 * plot (`preserveAspectRatio="none"`, non-scaling stroke), so it is drawn by
 * the browser at any width; the axis labels and the points are HTML laid
 * over it in per cent, so the text is in rem and never shrinks with the
 * plot. Every point is an anchor to the page its number came from, with its
 * value, period and note on hover and on keyboard focus.
 */
export function LineChart({ series, unit, caption, yFrom, height = 208, markers = "all", area = false, locale, periodLabel = "Period", preliminaryLabel = "preliminary", }) {
    const scale = valueScale(series.flatMap((s) => s.points.map((p) => p.y)), yFrom ?? "auto");
    const extent = xExtent(series);
    const dated = series.some((s) => s.points.some((p) => isDate(p.x)));
    const xTicks = dated
        ? timeTicks(extent[0], extent[1], 5, locale)
        : numberTicks(extent[0], extent[1], 5, locale);
    const yTicks = scale.ticks.map((v) => ({
        pos: yPercent(v, scale),
        label: formatNumber(v, locale),
    }));
    const gutter = Math.max(...yTicks.map((t) => t.label.length)) + 1;
    const placed = series.map((s) => s.points.map((p) => ({ point: p, x: xPercent(p.x, extent), y: yPercent(p.y, scale) })));
    const unitText = unit ? ` ${unit}` : "";
    const shown = resolveMarkers(markers, Math.max(0, ...series.map((s) => s.points.length)));
    const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => xPosition(a) - xPosition(b));
    const table = {
        head: [periodLabel, ...series.map((s) => (unit ? `${s.label} (${unit})` : s.label))],
        rows: xs.map((x) => [
            formatX(x, locale),
            ...series.map((s) => {
                const p = s.points.find((q) => q.x === x);
                return p
                    ? `${formatNumber(p.y, locale)}${p.preliminary ? ` (${preliminaryLabel})` : ""}`
                    : "";
            }),
        ]),
    };
    return (_jsxs(ChartFigure, { kind: "line", caption: caption, table: table, style: { "--ck-gutter": `${gutter}ch`, "--ck-plot-height": `${height}px` }, children: [_jsxs("div", { className: "ck-line-plot", children: [yTicks.map((tick) => (_jsx("div", { className: "ck-line-grid", style: { top: `${tick.pos}%` }, "aria-hidden": "true", children: _jsx("span", { className: "ck-line-tick", children: tick.label }) }, tick.label))), unit && (_jsx("span", { className: "ck-line-unit", "aria-hidden": "true", children: unit })), _jsxs("svg", { className: "ck-line-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false", children: [area &&
                                placed.map((pts, i) => (_jsx("path", { className: "ck-line-area", "data-series": (i % 6) + 1, d: areaPath(pts) }, `${series[i].id}:area`))), placed.map((pts, i) => (_jsx("path", { className: "ck-line-path", "data-series": (i % 6) + 1, d: linePath(pts), vectorEffect: "non-scaling-stroke" }, series[i].id)))] }), placed.map((pts, i) => {
                        const columns = shown === "all" ? undefined : hitColumns(pts);
                        return pts.map(({ point, x, y }, j) => (_jsx(Point, { point: point, locale: locale, preliminaryLabel: preliminaryLabel, x: x, y: y, index: (i % 6) + 1, dense: pts.length > DENSE, unit: unitText, label: series.length > 1 ? series[i].label : undefined, column: columns?.[j], marked: shown === "ends" && j === pts.length - 1 }, `${series[i].id}:${String(point.x)}`)));
                    })] }), _jsx("div", { className: "ck-line-axis", "aria-hidden": "true", children: xTicks.map((tick) => (_jsx("span", { className: `ck-line-xtick${tick.pos < 8 ? " ck-at-start" : tick.pos > 92 ? " ck-at-end" : ""}`, style: { left: `${tick.pos}%` }, children: tick.label }, tick.label + tick.pos))) }), series.length > 1 && (_jsx("ol", { className: "ck-legend", "aria-hidden": "true", children: series.map((s, i) => (_jsxs("li", { className: "ck-legend-item", children: [_jsx("span", { className: "ck-legend-swatch", "data-series": (i % 6) + 1 }), s.label] }, s.id))) }))] }));
}
function Point({ point, x, y, index, dense, unit, label, column, marked, locale, preliminaryLabel, }) {
    const period = `${formatX(point.x, locale)}${point.preliminary ? ` · ${preliminaryLabel}` : ""}`;
    const text = `${formatNumber(point.y, locale)}${unit}, ${period}${label ? ` — ${label}` : ""}${point.note ? `. ${point.note}` : ""}`;
    const edge = x > 66 ? " ck-pt-end" : column && x < 33 ? " ck-pt-start" : "";
    const className = column
        ? `ck-pt ck-pt-col${marked ? " ck-pt-marked" : ""}${edge}`
        : `ck-pt${dense ? " ck-pt-dense" : ""}${edge}`;
    // A hidden dot's target is a full-height strip of the plot (they tile it),
    // with the dot and the tooltip placed inside it at the value.
    const style = column
        ? {
            left: `${column.left.toFixed(3)}%`,
            width: `${column.width.toFixed(3)}%`,
            "--ck-mx": `${(column.width > 0 ? ((x - column.left) / column.width) * 100 : 50).toFixed(2)}%`,
            "--ck-y": `${y.toFixed(2)}%`,
        }
        : { left: `${x}%`, top: `${y}%` };
    const tip = (_jsxs("span", { className: "ck-tip", role: "tooltip", children: [_jsxs("strong", { children: [formatNumber(point.y, locale), unit] }), _jsxs("span", { children: [label ? `${label} · ` : "", period] }), point.note && _jsx("span", { children: point.note })] }));
    const out = point.href && /^https?:\/\//.test(point.href);
    return point.href ? (_jsx("a", { href: point.href, className: className, "data-series": index, style: style, "aria-label": text, ...(out ? { target: "_blank", rel: "noopener noreferrer" } : {}), children: tip })) : (_jsx("span", { className: className, "data-series": index, style: style, tabIndex: 0, "aria-label": text, children: tip }));
}
//# sourceMappingURL=LineChart.js.map